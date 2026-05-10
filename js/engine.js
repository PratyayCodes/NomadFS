class CryptoEngine {
    constructor() {
        this.keyCache = new Map();
    }
    
    async deriveKey(password, salt) {
        const cacheKey = `${password.substring(0, 10)}-${Array.from(salt).join(',')}`;
        
        if (this.keyCache.has(cacheKey)) {
            return this.keyCache.get(cacheKey);
        }
        
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            enc.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: NOMADFS_CONFIG.encryption.iterations,
                hash: NOMADFS_CONFIG.encryption.hash
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
        
        this.keyCache.set(cacheKey, key);
        return key;
    }
    
    async encrypt(data, password) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await this.deriveKey(password, salt);
        
        let stringData;
        if (typeof data === 'string') {
            stringData = data;
        } else if (typeof data === 'object') {
            stringData = JSON.stringify(data);
        } else {
            stringData = String(data);
        }
        
        const encoded = new TextEncoder().encode(stringData);
        
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encoded
        );
        
        return {
            version: 1,
            salt: Array.from(salt),
            iv: Array.from(iv),
            data: Array.from(new Uint8Array(encrypted))
        };
    }
    
    async decrypt(encryptedData, password) {
        const salt = new Uint8Array(encryptedData.salt);
        const iv = new Uint8Array(encryptedData.iv);
        const key = await this.deriveKey(password, salt);
        
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            new Uint8Array(encryptedData.data)
        );
        
        const result = new TextDecoder().decode(decrypted);
        
        try {
            return JSON.parse(result);
        } catch {
            return result;
        }
    }
    
    async hashBlob(content) {
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(content));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

class VirtualFileSystem {
    constructor() {
        this.manifest = null;
        this.manifestSha = null;
        this.currentPath = [];
        this.cryptoEngine = new CryptoEngine();
        this.masterPassword = null;
        this.repo = null;
        this.githubToken = null;
        this.writeAccess = false;
        this.loaded = false;
    }
    
    async initialize(password, repo, token = null) {
        this.masterPassword = password;
        this.repo = repo;
        this.githubToken = token;
        this.writeAccess = !!token;
        
        await this.loadManifest();
        this.loaded = true;
        return this;
    }
    
    async loadManifest() {
        try {
            const result = await window.NomadFSUpload.getManifest(this.repo, this.githubToken);
            
            if (result && result.content) {
                const encryptedManifest = JSON.parse(result.content);
                this.manifest = await this.cryptoEngine.decrypt(encryptedManifest, this.masterPassword);
                this.manifestSha = result.sha;
                console.log('Manifest loaded successfully');
            } else {
                await this.createNewVault();
            }
        } catch (error) {
            console.error('Failed to load manifest:', error);
            await this.createNewVault();
        }
    }
    
    async createNewVault() {
        console.log('Creating new vault...');
        
        this.manifest = {
            version: "1.0.0",
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            root: {
                type: "folder",
                name: "",
                children: {}
            },
            blobIndex: {}
        };
        
        await this.saveManifest();
    }
    
    async saveManifest() {
        if (!this.writeAccess) {
            throw new Error('Write access requires GitHub token');
        }
        
        this.manifest.modified = new Date().toISOString();
        
        const encryptedManifest = await this.cryptoEngine.encrypt(this.manifest, this.masterPassword);
        const manifestString = JSON.stringify(encryptedManifest);
        
        const result = await window.NomadFSUpload.saveManifest(
            this.repo, 
            this.githubToken, 
            manifestString,
            this.manifestSha
        );
        
        if (result && result.content) {
            this.manifestSha = result.content.sha;
        }
        
        return true;
    }
    
    getNodeAtPath(pathSegments) {
        if (!this.manifest) return null;
        
        let current = this.manifest.root;
        
        for (const segment of pathSegments) {
            if (!current.children || !current.children[segment]) {
                return null;
            }
            current = current.children[segment];
        }
        
        return current;
    }
    
    listDirectory(pathSegments = null) {
        if (!this.manifest) return [];
        
        const targetPath = pathSegments || this.currentPath;
        const node = this.getNodeAtPath(targetPath);
        
        if (!node || node.type !== 'folder') {
            return [];
        }
        
        const items = [];
        for (const [name, child] of Object.entries(node.children || {})) {
            items.push({
                name: name,
                type: child.type,
                size: child.size || 0,
                modified: child.modified,
                mime: child.mime || null
            });
        }
        
        items.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === 'folder' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
        
        return items;
    }
    
   
    async readFile(pathSegments) {
        if (!this.manifest) throw new Error('Vault not loaded');
        
        const node = this.getNodeAtPath(pathSegments);
        if (!node || node.type !== 'file') {
            throw new Error(`File not found: ${pathSegments.join('/')}`);
        }
        
        console.log('Reading file:', pathSegments.join('/'));
        console.log('Blob reference:', node.blobRef);
        
        if (!node.blobRef) {
            throw new Error('No blob reference found for file');
        }
        
        // Try to get blob content
        const blobContent = await window.NomadFSUpload.getBlobContent(
            this.repo, 
            node.blobRef, 
            this.githubToken
        );
        
        if (!blobContent) {
            throw new Error(`Blob content not found for: ${node.blobRef}`);
        }
        
        try {
            const encryptedBlob = JSON.parse(blobContent);
            const decrypted = await this.cryptoEngine.decrypt(encryptedBlob, this.masterPassword);
            return decrypted;
        } catch (parseError) {
            console.error('Failed to parse blob content:', parseError);
            throw new Error('Invalid blob format or corrupted data');
        }
    }
    
    async writeFile(pathSegments, content, mime = 'text/plain') {
        if (!this.writeAccess) {
            throw new Error('Write access requires GitHub token. Please authenticate.');
        }
        
        if (!this.manifest) throw new Error('Vault not loaded');
        
        const filename = pathSegments[pathSegments.length - 1];
        const folderPath = pathSegments.slice(0, -1);
        
        console.log('Writing file:', pathSegments.join('/'));
        
        // Encrypt content
        const encryptedContent = await this.cryptoEngine.encrypt(content, this.masterPassword);
        const contentString = JSON.stringify(encryptedContent);
        const blobHash = await this.cryptoEngine.hashBlob(contentString);
        
        // Upload blob
        await window.NomadFSUpload.uploadBlob(this.repo, this.githubToken, contentString, blobHash);
        
        // Navigate to parent folder
        let current = this.manifest.root;
        for (const segment of folderPath) {
            if (!current.children[segment]) {
                current.children[segment] = {
                    type: 'folder',
                    children: {},
                    modified: new Date().toISOString()
                };
            }
            current = current.children[segment];
        }
        
        // Add/Update file
        current.children[filename] = {
            type: 'file',
            blobRef: blobHash,
            size: new Blob([content]).size,
            modified: new Date().toISOString(),
            mime: mime
        };
        
        // Update blob index
        this.manifest.blobIndex[blobHash] = {
            ref: blobHash,
            size: new Blob([content]).size,
            uploaded: new Date().toISOString()
        };
        
        // Save manifest
        await this.saveManifest();
        
        console.log('File written successfully:', filename);
        return true;
    }
    
    async createFolder(pathSegments) {
        if (!this.writeAccess) {
            throw new Error('Write access requires GitHub token. Please authenticate.');
        }
        
        if (!this.manifest) throw new Error('Vault not loaded');
        
        const folderName = pathSegments[pathSegments.length - 1];
        const parentPath = pathSegments.slice(0, -1);
        
        let current = this.manifest.root;
        for (const segment of parentPath) {
            if (!current.children[segment]) {
                current.children[segment] = {
                    type: 'folder',
                    children: {},
                    modified: new Date().toISOString()
                };
            }
            current = current.children[segment];
        }
        
        if (current.children[folderName]) {
            throw new Error('Folder already exists');
        }
        
        current.children[folderName] = {
            type: 'folder',
            children: {},
            modified: new Date().toISOString()
        };
        
        await this.saveManifest();
        return true;
    }
    
    async deleteFile(pathSegments) {
        if (!this.writeAccess) {
            throw new Error('Write access requires GitHub token. Please authenticate.');
        }
        
        const filename = pathSegments[pathSegments.length - 1];
        const folderPath = pathSegments.slice(0, -1);
        
        let current = this.manifest.root;
        for (const segment of folderPath) {
            if (!current.children[segment]) {
                throw new Error('Path not found');
            }
            current = current.children[segment];
        }
        
        if (!current.children[filename]) {
            throw new Error('File not found');
        }
        
        delete current.children[filename];
        await this.saveManifest();
        
        return true;
    }
    
    navigateTo(pathSegments) {
        this.currentPath = [...pathSegments];
    }
    
    getCurrentPath() {
        return [...this.currentPath];
    }
    
    getRepo() {
        return this.repo;
    }
    
    hasWriteAccess() {
        return this.writeAccess;
    }
    
    isLoaded() {
        return this.loaded && this.manifest !== null;
    }
    
    // Debug method to inspect file blob references
    async inspectFile(pathSegments) {
        const node = this.getNodeAtPath(pathSegments);
        if (!node) return null;
        
        return {
            name: pathSegments[pathSegments.length - 1],
            type: node.type,
            blobRef: node.blobRef,
            size: node.size,
            modified: node.modified,
            mime: node.mime
        };
    }
}

// Create global instance
window.NomadFSEngine = new VirtualFileSystem();
