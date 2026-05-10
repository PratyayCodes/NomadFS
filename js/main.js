(function() {
    // DOM Elements
    const lockScreen = document.getElementById('lockScreen');
    const appInterface = document.getElementById('appInterface');
    const fileContainer = document.getElementById('fileContainer');
    const searchInput = document.getElementById('searchInput');
    const breadcrumb = document.getElementById('breadcrumb');
    const unlockBtn = document.getElementById('unlockBtn');
    const lockBtn = document.getElementById('lockBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const newFolderBtn = document.getElementById('newFolderBtn');
    const syncBtn = document.getElementById('syncBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const fileCount = document.getElementById('fileCount');
    const statusMessage = document.getElementById('statusMessage');
    const masterPasswordInput = document.getElementById('masterPassword');
    const connectionStatus = document.getElementById('connectionStatus');
    const configNote = document.getElementById('configNote');
    const repoDisplay = document.getElementById('repoDisplay');
    const storageUsed = document.getElementById('storageUsed');
    const storageText = document.getElementById('storageText');
    
    // Modals
    const newFolderModal = document.getElementById('newFolderModal');
    const editorModal = document.getElementById('editorModal');
    const uploadModal = document.getElementById('uploadModal');
    const githubAuthModal = document.getElementById('githubAuthModal');
    
    // State
    let searchQuery = '';
    let currentView = localStorage.getItem('nomadfs_view') || 'grid';
    let currentFileContent = null;
    let currentFileName = null;
    
    // Helper Functions
    function showLoading(show, message = 'Processing...') {
        if (show) {
            const span = loadingOverlay.querySelector('span');
            if (span) span.textContent = message;
            loadingOverlay.classList.add('active');
        } else {
            loadingOverlay.classList.remove('active');
        }
    }
    
    function setStatus(message, isError = false, duration = 3000) {
        statusMessage.textContent = message;
        statusMessage.style.color = isError ? 'var(--danger)' : '';
        if (duration > 0) {
            setTimeout(() => {
                if (statusMessage.textContent === message) {
                    statusMessage.style.color = '';
                }
            }, duration);
        }
    }
    
    function getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'txt': '📄', 'md': '📝', 'json': '⚙️', 'js': '💛', 'html': '🌐',
            'css': '🎨', 'jpg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'pdf': '📕',
            'zip': '📦', 'tar': '📦', 'gz': '📦', 'mp3': '🎵', 'mp4': '🎬',
            'doc': '📘', 'docx': '📘', 'xls': '📊', 'csv': '📊'
        };
        return icons[ext] || '📄';
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        if (!bytes) return '? B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    // Calculate storage usage
    function updateStorageInfo() {
        if (!window.NomadFSEngine || !window.NomadFSEngine.manifest) return;
        
        let totalSize = 0;
        for (const blob of Object.values(window.NomadFSEngine.manifest.blobIndex || {})) {
            totalSize += blob.size || 0;
        }
        
        const mb = (totalSize / (1024 * 1024)).toFixed(1);
        storageText.textContent = `${mb} MB / ∞`;
        
        // Mock percentage (since we don't have a limit)
        const percentage = Math.min(100, (totalSize / (100 * 1024 * 1024)) * 100);
        storageUsed.style.width = `${percentage}%`;
    }
    
    // Render Functions
    async function renderFileSystem() {
        if (!window.NomadFSEngine || !window.NomadFSEngine.isLoaded()) {
            return;
        }
        
        const items = window.NomadFSEngine.listDirectory();
        
        // Filter by search
        let filteredItems = items;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filteredItems = items.filter(item => item.name.toLowerCase().includes(query));
        }
        
        fileCount.textContent = `${filteredItems.length} item${filteredItems.length !== 1 ? 's' : ''}`;
        
        if (filteredItems.length === 0) {
            fileContainer.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <p>${searchQuery ? 'No matching files or folders' : 'This folder is empty'}</p>
                    ${!window.NomadFSEngine.hasWriteAccess() && !searchQuery ? '<p style="margin-top: 12px; font-size: 12px;">🔒 Read-only mode. Authenticate to add files.</p>' : ''}
                </div>
            `;
            updateStorageInfo();
            return;
        }
        
        let html = '';
        for (const item of filteredItems) {
            const icon = item.type === 'folder' ? '📁' : getFileIcon(item.name);
            const size = item.type === 'file' ? formatFileSize(item.size) : 'Folder';
            const modified = item.modified ? new Date(item.modified).toLocaleDateString() : '';
            
            const downloadBtn = item.type === 'file' ? `
                <button class="download-btn" data-name="${escapeHtml(item.name)}" title="Download ${escapeHtml(item.name)}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 3v12m0 0-4-4m4 4 4-4M3 21h18"/>
                    </svg>
                </button>` : '';

            html += `
                <div class="file-item" data-type="${item.type}" data-name="${escapeHtml(item.name)}">
                    <div class="file-icon">${icon}</div>
                    <div class="file-name">${escapeHtml(item.name)}</div>
                    <div class="file-meta">${size}${modified ? ` • ${modified}` : ''}</div>
                    ${downloadBtn}
                </div>
            `;
        }
        
        fileContainer.innerHTML = html;
        
        // Add click listeners
        document.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                if (e.target.closest('.download-btn')) return; // handled separately
                e.stopPropagation();
                const type = item.dataset.type;
                const name = item.dataset.name;
                
                if (type === 'folder') {
                    navigateToFolder(name);
                } else if (type === 'file') {
                    await openFile(name);
                }
            });
        });

        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await downloadFile(btn.dataset.name);
            });
        });
        
        updateStorageInfo();
    }
    
    // Navigation
    function navigateToFolder(folderName) {
        const currentPath = window.NomadFSEngine.getCurrentPath();
        window.NomadFSEngine.navigateTo([...currentPath, folderName]);
        updateBreadcrumb();
        renderFileSystem();
        setStatus(`Opened folder: ${folderName}`);
    }
    
    function navigateToPath(index) {
        const currentPath = window.NomadFSEngine.getCurrentPath();
        window.NomadFSEngine.navigateTo(currentPath.slice(0, index));
        updateBreadcrumb();
        renderFileSystem();
        setStatus('Navigation updated');
    }
    
    function goBack() {
        const currentPath = window.NomadFSEngine.getCurrentPath();
        if (currentPath.length > 0) {
            window.NomadFSEngine.navigateTo(currentPath.slice(0, -1));
            updateBreadcrumb();
            renderFileSystem();
            setStatus('Navigated back');
        }
    }
    
    function updateBreadcrumb() {
        breadcrumb.innerHTML = '';
        const rootItem = document.createElement('span');
        rootItem.className = 'breadcrumb-item';
        rootItem.textContent = 'root';
        rootItem.onclick = () => navigateToPath(0);
        breadcrumb.appendChild(rootItem);
        
        const currentPath = window.NomadFSEngine.getCurrentPath();
        currentPath.forEach((segment, idx) => {
            const item = document.createElement('span');
            item.className = 'breadcrumb-item';
            item.textContent = segment;
            item.onclick = () => navigateToPath(idx + 1);
            breadcrumb.appendChild(item);
        });
    }
    
    // File Operations
    async function openFile(filename) {
        const currentPath = [...window.NomadFSEngine.getCurrentPath(), filename];
        
        showLoading(true, `Loading ${filename}...`);
        
        try {
            const content = await window.NomadFSEngine.readFile(currentPath);
            const editorTextarea = document.getElementById('editorTextarea');
            const editorFileName = document.getElementById('editorFileName');
            
            currentFileName = filename;
            currentFileContent = content;
            
            editorFileName.textContent = filename;
            editorTextarea.value = content;
            editorModal.classList.add('active');
            setStatus(`Opened: ${filename}`);
        } catch (error) {
            console.error('Open file error:', error);
            setStatus(`Failed to load file: ${error.message}`, true);
        } finally {
            showLoading(false);
        }
    }
    
    async function downloadFile(filename) {
        const filePath = [...window.NomadFSEngine.getCurrentPath(), filename];
        showLoading(true, `Preparing ${filename}…`);
        try {
            const content = await window.NomadFSEngine.readFile(filePath);
            const blob = new Blob([content], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setStatus(`Downloaded: ${filename}`);
        } catch (error) {
            console.error('Download error:', error);
            setStatus(`Failed to download: ${error.message}`, true);
        } finally {
            showLoading(false);
        }
    }

    async function saveFile() {        const content = document.getElementById('editorTextarea').value;
        const filename = document.getElementById('editorFileName').textContent;
        const currentPath = [...window.NomadFSEngine.getCurrentPath(), filename];
        
        if (!window.NomadFSEngine.hasWriteAccess()) {
            editorModal.classList.remove('active');
            showGitHubAuth();
            return;
        }
        
        showLoading(true, `Saving ${filename}...`);
        
        try {
            await window.NomadFSEngine.writeFile(currentPath, content);
            currentFileContent = content;
            setStatus(`Saved: ${filename}`);
            editorModal.classList.remove('active');
            await renderFileSystem();
        } catch (error) {
            console.error('Save file error:', error);
            setStatus(`Failed to save: ${error.message}`, true);
        } finally {
            showLoading(false);
        }
    }
    
    async function createNewFolder() {
        const folderNameInput = document.getElementById('folderName');
        const name = folderNameInput.value.trim();
        
        if (!name) {
            setStatus('Please enter a folder name', true);
            return;
        }
        
        if (!/^[a-zA-Z0-9_\-\s]+$/.test(name)) {
            setStatus('Invalid folder name (use letters, numbers, spaces, underscores, hyphens)', true);
            return;
        }
        
        if (!window.NomadFSEngine.hasWriteAccess()) {
            newFolderModal.classList.remove('active');
            showGitHubAuth();
            return;
        }
        
        const currentPath = [...window.NomadFSEngine.getCurrentPath(), name];
        
        showLoading(true, `Creating folder ${name}...`);
        
        try {
            await window.NomadFSEngine.createFolder(currentPath);
            setStatus(`Created folder: ${name}`);
            folderNameInput.value = '';
            newFolderModal.classList.remove('active');
            await renderFileSystem();
        } catch (error) {
            console.error('Create folder error:', error);
            setStatus(`Failed to create folder: ${error.message}`, true);
        } finally {
            showLoading(false);
        }
    }
    
    async function uploadFiles() {
        const fileInput = document.getElementById('fileUpload');
        const files = fileInput.files;
        
        if (files.length === 0) {
            setStatus('Please select files to upload', true);
            return;
        }
        
        if (!window.NomadFSEngine.hasWriteAccess()) {
            uploadModal.classList.remove('active');
            showGitHubAuth();
            return;
        }
        
        showLoading(true, `Uploading ${files.length} file(s)...`);
        
        let successCount = 0;
        let failCount = 0;
        
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                try {
                    const content = await file.text();
                    const filePath = [...window.NomadFSEngine.getCurrentPath(), file.name];
                    await window.NomadFSEngine.writeFile(filePath, content, file.type);
                    successCount++;
                    setStatus(`Uploaded ${successCount}/${files.length}...`);
                } catch (err) {
                    console.error(`Failed to upload ${file.name}:`, err);
                    failCount++;
                }
            }
            
            await renderFileSystem();
            
            if (failCount > 0) {
                setStatus(`Uploaded ${successCount} files, ${failCount} failed`, true);
            } else {
                setStatus(`Uploaded ${successCount} file(s)`);
            }
            
            fileInput.value = '';
            uploadModal.classList.remove('active');
        } catch (error) {
            console.error('Upload error:', error);
            setStatus(`Upload failed: ${error.message}`, true);
        } finally {
            showLoading(false);
        }
    }
    
    async function deleteItem(name, type) {
        if (!confirm(`Delete ${type} "${name}"? This cannot be undone.`)) return;
        
        if (!window.NomadFSEngine.hasWriteAccess()) {
            showGitHubAuth();
            return;
        }
        
        const currentPath = [...window.NomadFSEngine.getCurrentPath(), name];
        
        showLoading(true, `Deleting ${name}...`);
        
        try {
            await window.NomadFSEngine.deleteFile(currentPath);
            setStatus(`Deleted: ${name}`);
            await renderFileSystem();
        } catch (error) {
            console.error('Delete error:', error);
            setStatus(`Failed to delete: ${error.message}`, true);
        } finally {
            showLoading(false);
        }
    }
    
    // Sync Operations
    async function syncWithGitHub() {
        showLoading(true, 'Syncing with GitHub...');
        
        try {
            await window.NomadFSEngine.loadManifest();
            await renderFileSystem();
            setStatus('Sync complete — vault is up to date');
        } catch (error) {
            console.error('Sync error:', error);
            setStatus(`Sync failed: ${error.message}`, true);
        } finally {
            showLoading(false);
        }
    }
    
    // Authentication
    function showGitHubAuth() {
        const repo = window.NomadFSEngine.getRepo();
        document.getElementById('repoNameDisplay').textContent = repo;
        githubAuthModal.classList.add('active');
        
        const remembered = localStorage.getItem('nomadfs_github_token');
        if (remembered) {
            document.getElementById('githubTokenInput').value = remembered;
            document.getElementById('rememberToken').checked = true;
        }
    }
    
    async function authenticateGitHub() {
        const token = document.getElementById('githubTokenInput').value.trim();
        const remember = document.getElementById('rememberToken').checked;
        
        if (!token) {
            setStatus('Please enter a GitHub token', true);
            return;
        }
        
        showLoading(true, 'Verifying GitHub token...');
        
        const repo = window.NomadFSEngine.getRepo();
        const isValid = await window.NomadFSUpload.verifyToken(repo, token);
        
        if (isValid) {
            if (remember) {
                localStorage.setItem('nomadfs_github_token', token);
            } else {
                localStorage.removeItem('nomadfs_github_token');
            }
            
            window.NomadFSEngine.githubToken = token;
            window.NomadFSEngine.writeAccess = true;
            
            setStatus('GitHub authenticated — write access enabled');
            githubAuthModal.classList.remove('active');
            document.getElementById('githubTokenInput').value = '';
            
            // Refresh manifest with write access
            await window.NomadFSEngine.loadManifest();
            await renderFileSystem();
        } else {
            setStatus('Invalid GitHub token. Please check and try again.', true);
        }
        
        showLoading(false);
    }
    
    function lockVault() {
        appInterface.classList.remove('active');
        lockScreen.classList.add('active');
        masterPasswordInput.value = '';
        window.NomadFSEngine.loaded = false;
        setStatus('Vault locked');
    }
    
    async function unlockVault() {
        const password = masterPasswordInput.value;
        
        if (!password) {
            setStatus('Please enter master password', true);
            return;
        }
        
        const repo = NOMADFS_CONFIG.repository;
        if (!repo || repo === 'yourusername/nomadfs-vault') {
            setStatus('Please configure repository in js/config.js', true);
            configNote.textContent = '⚠️ Configure repository in js/config.js';
            return;
        }
        
        showLoading(true, 'Decrypting vault...');
        
        try {
            const storedToken = localStorage.getItem('nomadfs_github_token') || NOMADFS_CONFIG.githubToken;
            
            await window.NomadFSEngine.initialize(password, repo, storedToken || null);
            
            updateBreadcrumb();
            await renderFileSystem();
            
            repoDisplay.textContent = repo;
            
            showLoading(false);
            lockScreen.classList.remove('active');
            appInterface.classList.add('active');
            connectionStatus.classList.add('connected');
            
            if (window.NomadFSEngine.hasWriteAccess()) {
                setStatus(`Unlocked: ${repo} — write access enabled`);
            } else {
                setStatus(`Unlocked: ${repo} — read-only mode. Authenticate for write access.`);
            }
        } catch (error) {
            showLoading(false);
            console.error('Unlock error:', error);
            setStatus(`Failed to unlock: ${error.message}`, true);
        }
    }
    
    // View and Search
    function setView(view) {
        currentView = view;
        fileContainer.className = `file-container ${view}-view`;
        
        document.querySelectorAll('.view-btn').forEach(btn => {
            if (btn.dataset.view === view) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        localStorage.setItem('nomadfs_view', view);
        renderFileSystem();
    }
    
    function handleSearch() {
        searchQuery = searchInput.value;
        renderFileSystem();
    }
    
    // Event Listeners
    function initEventListeners() {
        unlockBtn?.addEventListener('click', unlockVault);
        lockBtn?.addEventListener('click', lockVault);
        uploadBtn?.addEventListener('click', () => uploadModal.classList.add('active'));
        newFolderBtn?.addEventListener('click', () => newFolderModal.classList.add('active'));
        syncBtn?.addEventListener('click', syncWithGitHub);
        searchInput?.addEventListener('input', handleSearch);
        
        // Modal closes
        document.querySelectorAll('.modal-close, .modal-cancel, .editor-cancel, .auth-cancel').forEach(btn => {
            btn.addEventListener('click', () => {
                newFolderModal?.classList.remove('active');
                editorModal?.classList.remove('active');
                uploadModal?.classList.remove('active');
                githubAuthModal?.classList.remove('active');
            });
        });
        
        // Modal actions
        document.querySelector('.modal-create')?.addEventListener('click', createNewFolder);
        document.querySelector('.editor-save')?.addEventListener('click', saveFile);
        document.querySelector('.upload-confirm')?.addEventListener('click', uploadFiles);
        document.querySelector('.auth-confirm')?.addEventListener('click', authenticateGitHub);
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'l' && appInterface?.classList.contains('active')) {
                e.preventDefault();
                lockVault();
            }
            if (e.key === 'Escape') {
                newFolderModal?.classList.remove('active');
                editorModal?.classList.remove('active');
                uploadModal?.classList.remove('active');
                githubAuthModal?.classList.remove('active');
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'f' && appInterface?.classList.contains('active')) {
                e.preventDefault();
                searchInput?.focus();
            }
            if (e.key === 'Backspace' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                goBack();
            }
        });
        
        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => setView(btn.dataset.view));
        });
        
        // Enter key handlers
        document.getElementById('folderName')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') createNewFolder();
        });
        
        masterPasswordInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') unlockVault();
        });
        
        // Sidebar navigation
        document.querySelector('.sidebar-item[data-path=""]')?.addEventListener('click', () => {
            if (window.NomadFSEngine) {
                window.NomadFSEngine.navigateTo([]);
                updateBreadcrumb();
                renderFileSystem();
            }
        });
        
        // Right-click context menu for files (basic)
        fileContainer?.addEventListener('contextmenu', (e) => {
            const fileItem = e.target.closest('.file-item');
            if (fileItem) {
                e.preventDefault();
                const name = fileItem.dataset.name;
                const type = fileItem.dataset.type;
                if (confirm(`Delete ${type} "${name}"?`)) {
                    deleteItem(name, type);
                }
            }
        });
    }
    
    function initFavorites() {
        const container = document.getElementById('favoritesContainer');
        if (container) {
            // Load favorites from localStorage
            const favorites = JSON.parse(localStorage.getItem('nomadfs_favorites') || '[]');
            if (favorites.length > 0) {
                container.innerHTML = favorites.map(fav => `
                    <div class="sidebar-item favorite-item" data-path="${escapeHtml(fav)}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        <span>${escapeHtml(fav)}</span>
                    </div>
                `).join('');
                
                container.querySelectorAll('.favorite-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const path = item.dataset.path;
                        if (path) {
                            window.NomadFSEngine.navigateTo(path.split('/').filter(p => p));
                            updateBreadcrumb();
                            renderFileSystem();
                        }
                    });
                });
            } else {
                container.innerHTML = '<div style="padding: 8px 20px; font-size: 12px; color: var(--text-muted);">No favorites yet</div>';
            }
        }
    }
    
    function init() {
        initEventListeners();
        initFavorites();
        setView(currentView);
        
        // Display config info
        const repo = NOMADFS_CONFIG.repository;
        if (repo && repo !== 'yourusername/nomadfs-vault') {
            configNote.textContent = `📦 Repository: ${repo}`;
        } else {
            configNote.textContent = '⚙️ Configure repository in js/config.js';
            configNote.style.color = 'var(--warning)';
        }
        
        console.log('NomadFS Ready — Enter master password to unlock');
    }
    
    init();
})();
