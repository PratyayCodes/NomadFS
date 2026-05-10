window.NomadFSUpload = (function() {
    const GITHUB_API = 'https://api.github.com';
    
    // Helper for base64 (works with Unicode)
    function toBase64(str) {
        try {
            // Handle UTF-8 properly
            const utf8Bytes = new TextEncoder().encode(str);
            let binary = '';
            for (let i = 0; i < utf8Bytes.length; i++) {
                binary += String.fromCharCode(utf8Bytes[i]);
            }
            return btoa(binary);
        } catch (e) {
            console.error('toBase64 error:', e);
            return btoa(str);
        }
    }
    
    function fromBase64(str) {
        try {
            const binary = atob(str);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return new TextDecoder('utf-8').decode(bytes);
        } catch (e) {
            console.error('fromBase64 error:', e);
            return str;
        }
    }
    
    async function githubRequest(repo, token, endpoint, method = 'GET', body = null, retries = 3) {
        const url = `${GITHUB_API}/repos/${repo}${endpoint}`;
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'CodeP-NomadFS/1.0'
        };
        
        if (token) {
            headers['Authorization'] = `token ${token}`;
        }
        
        if (body && (method === 'PUT' || method === 'POST')) {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(body);
        }
        
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, { method, headers, body });
                
                if (response.status === 404) {
                    return null;
                }
                
                if (response.status === 409) {
                    await new Promise(r => setTimeout(r, 500 * (i + 1)));
                    continue;
                }
                
                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(`GitHub API error (${response.status}): ${error.message || response.statusText}`);
                }
                
                if (response.status === 204) {
                    return { success: true };
                }
                
                return await response.json();
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(r => setTimeout(r, 1000 * (i + 1)));
            }
        }
    }
    
    async function getManifest(repo, token = null) {
        try {
            const data = await githubRequest(repo, token, '/contents/manifest.enc', 'GET');
            if (data && data.content) {
                return {
                    content: fromBase64(data.content),
                    sha: data.sha
                };
            }
            return null;
        } catch (error) {
            console.warn('Manifest not found, will create new one:', error.message);
            return null;
        }
    }
    
    async function saveManifest(repo, token, content, existingSha = null) {
        const body = {
            message: existingSha ? 'Update encrypted manifest' : 'Create encrypted manifest',
            content: toBase64(content),
            branch: 'main'
        };
        
        if (existingSha) {
            body.sha = existingSha;
        }
        
        const result = await githubRequest(repo, token, '/contents/manifest.enc', 'PUT', body);
        return result;
    }
    
    
    async function getBlobContent(repo, blobRef, token = null) {
        if (!blobRef) {
            console.error('No blobRef provided');
            return null;
        }
        
        // Ensure blobRef has .blob extension for the path
        const blobPath = blobRef.endsWith('.blob') ? blobRef : `${blobRef}.blob`;
        
        console.log('Fetching blob:', { blobRef, blobPath });
        
        // Strategy 1: Try raw.githubusercontent.com (works for public repos)
        const rawUrl = `https://raw.githubusercontent.com/${repo}/main/blobs/${blobPath}`;
        
        try {
            console.log('Trying raw URL:', rawUrl);
            const response = await fetch(rawUrl);
            if (response.ok) {
                const content = await response.text();
                console.log('Raw fetch successful, content length:', content.length);
                return content;
            } else {
                console.log('Raw fetch failed with status:', response.status);
            }
        } catch (e) {
            console.log('Raw fetch error:', e.message);
        }
        
        // Strategy 2: Try without .blob extension (legacy files)
        const rawUrlNoExt = `https://raw.githubusercontent.com/${repo}/main/blobs/${blobRef}`;
        
        try {
            console.log('Trying raw URL (no ext):', rawUrlNoExt);
            const response = await fetch(rawUrlNoExt);
            if (response.ok) {
                const content = await response.text();
                console.log('Raw fetch (no ext) successful, content length:', content.length);
                return content;
            }
        } catch (e) {
            console.log('Raw fetch (no ext) error:', e.message);
        }
        
        // Strategy 3: Try GitHub API with token
        try {
            console.log('Trying GitHub API for:', `/contents/blobs/${blobPath}`);
            const data = await githubRequest(repo, token, `/contents/blobs/${blobPath}`, 'GET');
            if (data && data.content) {
                console.log('API fetch successful');
                return fromBase64(data.content);
            }
        } catch (e) {
            console.log('API fetch error:', e.message);
        }
        
        // Strategy 4: Try GitHub API without .blob extension
        try {
            console.log('Trying GitHub API (no ext):', `/contents/blobs/${blobRef}`);
            const data = await githubRequest(repo, token, `/contents/blobs/${blobRef}`, 'GET');
            if (data && data.content) {
                console.log('API fetch (no ext) successful');
                return fromBase64(data.content);
            }
        } catch (e) {
            console.log('API fetch (no ext) error:', e.message);
        }
        
        console.error('All blob fetch strategies failed for:', blobRef);
        return null;
    }
    
    async function uploadBlob(repo, token, content, blobHash) {
        const blobPath = `blobs/${blobHash}.blob`;
        const encodedContent = toBase64(content);
        
        console.log('Uploading blob:', { blobPath, blobHash, contentLength: content.length });
        
        // Check if blob already exists
        const existing = await githubRequest(repo, token, `/contents/${blobPath}`, 'GET');
        
        const body = {
            message: `Upload blob ${blobHash}`,
            content: encodedContent,
            branch: 'main'
        };
        
        if (existing && existing.sha) {
            body.sha = existing.sha;
            console.log('Updating existing blob');
        } else {
            console.log('Creating new blob');
        }
        
        await githubRequest(repo, token, `/contents/${blobPath}`, 'PUT', body);
        console.log('Blob upload successful');
        
        // Return the blob hash (without extension for storage in manifest)
        return blobHash;
    }
    
    async function verifyToken(repo, token) {
        try {
            const data = await githubRequest(repo, token, '', 'GET');
            return !!data && !!data.full_name;
        } catch (error) {
            console.error('Token verification failed:', error);
            return false;
        }
    }
    
    async function getRepoInfo(repo, token = null) {
        return githubRequest(repo, token, '', 'GET');
    }
    
    async function createInitialStructure(repo, token, encryptedManifest) {
        const body = {
            message: 'Initialize NomadFS structure',
            content: toBase64(''),
            branch: 'main'
        };
        
        try {
            await githubRequest(repo, token, '/contents/blobs/.gitkeep', 'PUT', body);
        } catch (e) {
            console.log('Blobs directory may already exist:', e.message);
        }
        
        return saveManifest(repo, token, encryptedManifest);
    }
    
    async function testConnection(repo, token = null) {
        try {
            const data = await githubRequest(repo, token, '', 'GET');
            return { success: true, repo: data?.full_name };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    return {
        getManifest,
        saveManifest,
        getBlobContent,
        uploadBlob,
        verifyToken,
        getRepoInfo,
        createInitialStructure,
        testConnection,
        toBase64,
        fromBase64
    };
})();
