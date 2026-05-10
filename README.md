<div align="center">

```
 ██████╗ ██████╗ ██████╗ ███████╗██████╗     ███╗   ██╗ ██████╗ ███╗   ███╗ █████╗ ██████╗ ███████╗███████╗
██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔══██╗    ████╗  ██║██╔═══██╗████╗ ████║██╔══██╗██╔══██╗██╔════╝██╔════╝
██║     ██║   ██║██║  ██║█████╗  ██████╔╝    ██╔██╗ ██║██║   ██║██╔████╔██║███████║██║  ██║█████╗  ███████╗
██║     ██║   ██║██║  ██║██╔══╝  ██╔═══╝     ██║╚██╗██║██║   ██║██║╚██╔╝██║██╔══██║██║  ██║██╔══╝  ╚════██║
╚██████╗╚██████╔╝██████╔╝███████╗██║         ██║ ╚████║╚██████╔╝██║ ╚═╝ ██║██║  ██║██████╔╝██║     ███████║
 ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝         ╚═╝  ╚═══╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝     ╚══════╝
```

**An encrypted, GitHub-backed file vault that lives entirely in your browser.**

[![License: MIT](https://img.shields.io/badge/License-MIT-00d4ff.svg?style=flat-square&labelColor=0c1120)](LICENSE)
[![Zero Backend](https://img.shields.io/badge/Backend-None-8b5cf6.svg?style=flat-square&labelColor=0c1120)](https://github.com)
[![Encryption](https://img.shields.io/badge/Encryption-AES--256-00e5a0.svg?style=flat-square&labelColor=0c1120)](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)
[![Storage](https://img.shields.io/badge/Storage-GitHub-ffffff.svg?style=flat-square&labelColor=0c1120)](https://github.com)

<br>

> *Your files. Your key. Your repo. Nobody else's business.*

<br>

![NomadFS Screenshot](https://via.placeholder.com/900x500/070b14/00d4ff?text=NomadFS+Vault)

</div>

---

## ✦ What is NomadFS?

**NomadFS** is a zero-backend encrypted file manager that uses a **GitHub repository as its storage layer**. All encryption and decryption happens client-side in your browser using the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) — your master password never leaves your device, and your files are never stored in plaintext anywhere.

Open the app → enter your password → your vault decrypts → browse, edit, upload, download files. Close the tab and everything locks.

```
Your Browser  ──encrypt──►  GitHub Repo  (AES-256 blobs)
Your Browser  ◄──decrypt──  GitHub Repo  (master password)
```

No server. No database. No account. Just a GitHub repo and a password you remember.

---

## ✦ Features

| | |
|---|---|
| 🔐 **AES-256 Encryption** | Every file encrypted with your master password before it touches GitHub |
| 🐙 **GitHub as Storage** | Uses the GitHub Contents API — your repo is the database |
| 🌐 **Zero Backend** | Pure HTML + CSS + JS. Host on GitHub Pages for free |
| 📁 **Full File Manager** | Create folders, upload files, edit text files, download, delete |
| 🔒 **Read-only mode** | Browse your vault without a GitHub token — token only needed to write |
| 🔍 **Search** | Instant client-side search across all file names |
| 📱 **Mobile Friendly** | Fully responsive, works on any device |
| ⌨️ **Keyboard Shortcuts** | `Ctrl+L` lock, `Ctrl+F` search, `Backspace` navigate back |

---

## ✦ Quick Start — 3 Steps

Getting NomadFS running takes less than **5 minutes**.

### Step 1 — Create a GitHub repository for your vault

Go to [github.com/new](https://github.com/new) and create a **new repository**. It can be public or private — files are encrypted either way, but private gives you an extra layer.

```
Repository name:  my-nomadfs-vault   (or anything you like)
Visibility:       Private ✓
Initialize:       Yes — add a README
```

Copy your repository name in the format `yourusername/my-nomadfs-vault`. You'll need it in the next step.

---

### Step 2 — Set your repository in `js/config.js`

Open `js/config.js` in the NomadFS project. You'll see this:

```js
// js/config.js
const NOMADFS_CONFIG = {
    repository: 'yourusername/nomadfs-vault',   // 👈 CHANGE THIS
    githubToken: '',                              // optional — see Step 3
};
```

Replace `yourusername/nomadfs-vault` with your actual repository path:

```js
// js/config.js
const NOMADFS_CONFIG = {
    repository: 'alice/my-nomadfs-vault',        // ✅ your repo
    githubToken: '',
};
```

> **That's it for read-only access.** You can already open the vault and browse files (if any exist). To upload, create folders, or save edits, you need a GitHub token — see Step 3.

---

### Step 3 — Add a GitHub Personal Access Token (for write access)

A token lets NomadFS push encrypted files back to your repo. Without one, the vault is **read-only**.

**Create a token:**

1. Go to **GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)**
   - Or open: [github.com/settings/tokens/new](https://github.com/settings/tokens/new)
2. Give it a name like `NomadFS`
3. Set an expiry (90 days is sensible)
4. Tick the **`repo`** scope (full repo access) — or just **`public_repo`** if your vault is public
5. Click **Generate token** and copy it immediately (you won't see it again)

**Add it to your config:**

```js
// js/config.js
const NOMADFS_CONFIG = {
    repository: 'alice/my-nomadfs-vault',
    githubToken: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',  // ✅ paste here
};
```

> ⚠️ **Security note:** If you're hosting NomadFS publicly (e.g. GitHub Pages), leave `githubToken` empty and authenticate through the in-app dialog instead — it keeps your token out of the source code. The token entered via the UI is stored encrypted in `localStorage` only if you check "Remember token."

---

### Step 4 — Open the app and unlock your vault

Open `index.html` in your browser (or deploy to GitHub Pages — see below).

1. Enter your **master password** — this is the encryption key. Pick something strong.
2. Click **Unlock Vault**
3. NomadFS will initialize your vault on first run, creating the manifest in your repo
4. You're in. Start creating folders and uploading files.

> 🔑 **Your master password is never stored or transmitted.** If you forget it, your files are gone. Write it down somewhere safe.

---

## ✦ Deploy to GitHub Pages (free hosting)

You can host NomadFS itself on GitHub Pages so you can access your vault from any browser without running anything locally.

1. Push the NomadFS files to a **separate** GitHub repo (not your vault repo)
2. Go to that repo → **Settings → Pages**
3. Set source to `main` branch, `/ (root)`
4. Your app will be live at `https://yourusername.github.io/nomadfs/`

> Your vault data lives in a **different** repo from the NomadFS app code.

---

## ✦ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Unlock vault (on lock screen) |
| `Ctrl + L` | Lock vault immediately |
| `Ctrl + F` | Focus search bar |
| `Backspace` | Navigate up one folder |
| `Escape` | Close any open modal |
| `Right-click` on file | Delete file |

---

## ✦ How the Encryption Works

NomadFS uses the browser's built-in [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) — no external crypto library required.

```
Master Password
      │
      ▼
 PBKDF2 (100k iterations, SHA-256)
      │
      ▼
  AES-256-GCM key
      │
      ├──► Encrypt file content  ──►  Base64 blob  ──►  GitHub
      │
      └──► Encrypt manifest      ──►  nomadfs.enc  ──►  GitHub
```

- **Key derivation:** PBKDF2 with 100,000 iterations and a random salt
- **Encryption:** AES-256-GCM with a random IV per file
- **Manifest:** A single encrypted index file (`nomadfs.enc`) tracks your folder structure and file metadata
- **Blobs:** Each file is stored as an encrypted blob with a random filename — an attacker with repo access sees only scrambled bytes

---

## ✦ Project Structure

```
nomadfs/
├── index.html          # App shell — all UI markup
├── style.css           # Futuristic dark theme
└── js/
    ├── config.js       # 👈 Your repo & token go here
    ├── engine.js       # Core: crypto, manifest, GitHub API
    ├── upload.js       # File upload & GitHub write helpers
    └── main.js         # UI logic, event handlers, rendering
```

---

## ✦ FAQ

**Can I use NomadFS with a private repo?**
Yes. Use a token with `repo` scope. Encrypted blobs in a private repo give you two layers of protection.

**What happens if I forget my master password?**
Your files are permanently unrecoverable. The password is never stored anywhere. Back it up.

**Can multiple people share a vault?**
Yes, as long as they all know the master password and have a token with repo access.

**Is there a file size limit?**
GitHub's Contents API has a 100 MB per-file limit. For larger files, NomadFS will error gracefully.

**Can I export all my files?**
Yes — use the download button on each file. Bulk export is on the roadmap.

---

## ✦ License

MIT — do whatever you want with it.

---

<div align="center">

Built with the Web Crypto API · Powered by GitHub · No servers harmed

**[⭐ Star this repo]([(https://github.com/PratyayCodes/NomadFS/])** if NomadFS is useful to you

</div>
