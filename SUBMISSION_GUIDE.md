# Publishing to Obsidian Community Plugins

This guide walks you through publishing `obsidian-skill-viewer` to the Obsidian community plugin registry.

## Prerequisites
- GitHub account: `Chargekar`
- Git installed locally
- Node.js 18+ installed (for local builds)

---

## Step 1 — Create the GitHub Repository

1. Go to https://github.com/new
2. Repository name: `obsidian-skill-viewer`
3. Description: `View and interact with .skill files (Claude skill packages) as native Obsidian notes`
4. Set to **Public**
5. Do NOT initialize with README (we'll push our own)
6. Click **Create repository**

---

## Step 2 — Push the Plugin Code

Open a terminal in `C:\Users\bess\Downloads\SLD\.obsidian\plugins\skill-viewer\` and run:

```bash
git init
git add manifest.json versions.json package.json tsconfig.json esbuild.config.mjs main.js styles.css CHANGELOG.md README.md src/
git commit -m "feat: initial release v1.0.0"
git branch -M main
git remote add origin https://github.com/Chargekar/obsidian-skill-viewer.git
git push -u origin main
```

---

## Step 3 — Tag and Release v1.0.0

```bash
git tag 1.0.0
git push origin 1.0.0
```

GitHub Actions will automatically:
- Build `main.js`
- Create a GitHub Release with `main.js`, `manifest.json`, `styles.css`, and a ZIP attached

> If Actions aren't set up yet, create the release manually:
> 1. Go to your repo → Releases → "Draft a new release"
> 2. Tag: `1.0.0`
> 3. Title: `Skill Viewer 1.0.0`
> 4. Upload: `main.js`, `manifest.json`, `styles.css`
> 5. Publish release

---

## Step 4 — Submit to Obsidian Community Plugins

1. Fork this repo: https://github.com/obsidianmd/obsidian-releases
2. In your fork, open `community-plugins.json`
3. Add this entry **in alphabetical order by `id`**:

```json
{
  "id": "obsidian-skill-viewer",
  "name": "Skill Viewer",
  "author": "Harshwardhan Wadikar",
  "description": "View and interact with .skill files (Claude/OpenClaw skill packages) as native Obsidian notes. Skills are ZIP archives containing SKILL.md — this plugin renders them with a rich header, badges, file tree, and full Markdown body.",
  "repo": "Chargekar/obsidian-skill-viewer"
}
```

4. Commit and push to your fork
5. Open a Pull Request to `obsidianmd/obsidian-releases` with:
   - Title: `Add plugin: Skill Viewer`
   - Body: Brief description of what the plugin does and why it's useful

---

## Step 5 — Obsidian Review Process

- Obsidian team reviews PRs manually (typically 1–4 weeks)
- They will check: manifest.json validity, no external HTTP calls on plugin load, no obfuscated code, README quality
- Respond promptly to any review comments

---

## Reproducible Builds

Any contributor can rebuild `main.js` from source:

```bash
git clone https://github.com/Chargekar/obsidian-skill-viewer.git
cd obsidian-skill-viewer
npm install
npm run build
# Output: main.js (compiled + bundled)
```

Build toolchain: **esbuild 0.17.3**, **TypeScript 4.7.4**, **JSZip 3.10.1**, Node.js 18+

---

## Files to Include in the GitHub Repo

| File | Include? | Notes |
|---|---|---|
| `src/main.ts` | ✅ Yes | Source of truth |
| `main.js` | ✅ Yes | Required by Obsidian (compiled output) |
| `styles.css` | ✅ Yes | Required |
| `manifest.json` | ✅ Yes | Required |
| `versions.json` | ✅ Yes | Required for version mapping |
| `package.json` | ✅ Yes | Build toolchain |
| `tsconfig.json` | ✅ Yes | TypeScript config |
| `esbuild.config.mjs` | ✅ Yes | Build script |
| `CHANGELOG.md` | ✅ Yes | |
| `README.md` | ✅ Yes | |
| `.github/workflows/` | ✅ Yes | CI/CD |
| `node_modules/` | ❌ No | In .gitignore |
| `.obsidian/` | ❌ No | Vault config — not the plugin's job |
