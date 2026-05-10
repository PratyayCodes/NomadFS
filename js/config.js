// IMPORTANT: Update this with your GitHub repository before using

const NOMADFS_CONFIG = {
    // ============================================================
    // REQUIRED: Your GitHub repository (format: "username/repo")
    // ============================================================
    repository: "", 
    
    // ============================================================
    // OPTIONAL: Pre-configured GitHub token (will be stored locally)
    // Leave empty to prompt for token when write access is needed
    // Create token at: https://github.com/settings/tokens/new
    // Required scopes: repo (for private) or public_repo (for public)
    // ============================================================
    githubToken: "", 
    
    // ============================================================
    // Encryption settings (DO NOT CHANGE unless you know what you're doing)
    // ============================================================
    encryption: {
        iterations: 600000,  // PBKDF2 iterations (OWASP 2023 recommendation)
        algorithm: "AES-GCM",
        keyLength: 256,
        hash: "SHA-256"
    },
    
    // ============================================================
    // App settings
    // ============================================================
    settings: {
        autoSync: false,      // Automatically sync on unlock
        compression: true,    // Compress blobs before encryption
        maxCacheSize: 50,     // Max cache size in MB
        confirmDeletes: true  // Show confirmation before deleting
    }
};

// Freeze the config to prevent accidental modifications
Object.freeze(NOMADFS_CONFIG);
Object.freeze(NOMADFS_CONFIG.encryption);
Object.freeze(NOMADFS_CONFIG.settings);

console.log('NomadFS Config loaded:', NOMADFS_CONFIG.repository);
