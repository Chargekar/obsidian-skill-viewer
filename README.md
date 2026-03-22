# Obsidian Skill Viewer

Obsidian plugin for viewing `.skill` packages — the portable skill format used by AI coding agents — as fully rendered, native notes.

---

## Background

AI coding agents such as Claude Code, OpenClaw, and NemoClaw distribute reusable capabilities as **`.skill` files**: ZIP archives containing a `SKILL.md` specification and any supporting assets. By default, Obsidian treats these files as unrecognised binary blobs.

Skill Viewer registers `.skill` as a first-class file type. Opening one produces a structured note — not a hex dump — with the skill's metadata, a rendered body, and a complete manifest of the archive contents. A dedicated sidebar panel lets you browse, search, and open every skill in your vault.

---

## Features

- **Native file type registration** — `.skill` files open in a purpose-built view rather than a fallback binary handler.
- **Structured skill view** — each file renders as a note with a header card (name, description, version, author), tag badges, a collapsible file tree of the archive contents, and the full `SKILL.md` body rendered through Obsidian's Markdown pipeline.
- **Skill Explorer panel** — a sidebar panel listing every `.skill` file in the vault, with live search and one-click navigation.
- **Graph view integration** — skill files appear as nodes and participate in backlink resolution like any other note.
- **Command palette** — `Open Skill Explorer` and `Reload skill list` are available as commands.
- **Settings tab** — configure file explorer visibility and default open mode (tab / split pane / new window).
- **No network calls** — all processing is local; the plugin never contacts external services.

---

## Compatibility

| Item | Requirement |
|---|---|
| Obsidian | ≥ 1.4.0 |
| Platform | Desktop and mobile |
| `.skill` format | Any ZIP archive with a `SKILL.md` at its root |

The `.skill` format is agent-agnostic. This plugin works with skill packages from Claude Code, OpenClaw, NemoClaw, and any other agent that follows the format.

---

## Installation

### Community Plugin Store *(pending review)*

1. Open **Settings → Community Plugins → Browse**.
2. Search for **Skill Viewer**.
3. Click **Install**, then **Enable**.

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/Chargekar/obsidian-skill-viewer/releases/latest).
2. Create the directory `.obsidian/plugins/obsidian-skill-viewer/` inside your vault.
3. Copy the three files into that directory.
4. Reload Obsidian and enable **Skill Viewer** under **Settings → Community Plugins**.

---

## Usage

### Opening a skill

Drop any `.skill` file into your vault and click it in the file explorer. The skill view opens automatically, showing:

- **Header card** — skill name, description, version, and author, sourced from `SKILL.md` frontmatter.
- **Tag badges** — `tags` and `category` fields rendered as inline chips.
- **Archive contents** — an expandable file tree listing every entry in the ZIP.
- **Skill body** — the full `SKILL.md` content below the frontmatter, rendered as standard Obsidian Markdown (including wikilinks, callouts, and code blocks).

### Skill Explorer

Click the wand icon in the left ribbon, or run `Open Skill Explorer` from the command palette (`Ctrl/Cmd+P`). The panel lists all `.skill` files found in the vault. The search box filters by name in real time.

---

## SKILL.md frontmatter

Skill Viewer reads the following frontmatter keys from `SKILL.md`. All fields are optional; the plugin falls back to sensible defaults when they are absent.

```yaml
---
name: "My Skill"           # Display name (falls back to filename)
description: "..."         # One-line description shown in the header card
version: "1.0.0"           # Semantic version string
author: "Author Name"      # Author name
tags: "tag1, tag2"         # Comma-separated tags rendered as badges
category: "productivity"   # Single category badge
---
```

Any additional frontmatter keys are parsed and available for future extensions.

---

## Building from source

**Prerequisites:** Node.js ≥ 18, npm

```bash
git clone https://github.com/Chargekar/obsidian-skill-viewer.git
cd obsidian-skill-viewer
npm install
npm run build      # produces main.js via esbuild
```

**Toolchain:** esbuild 0.17.3 · TypeScript 4.7.4 · JSZip 3.10.1

The build is fully deterministic from the locked `package-lock.json`. No proprietary tooling or cloud services are required.

---

## Project structure

```
obsidian-skill-viewer/
├── src/
│   └── main.ts          # Full plugin source — SkillView, SkillExplorerView, settings
├── main.js              # Compiled output (esbuild bundle)
├── styles.css           # Plugin styles
├── manifest.json        # Obsidian plugin manifest
├── versions.json        # Plugin version → minimum Obsidian version map
├── package.json         # Build dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── esbuild.config.mjs   # Build script
└── CHANGELOG.md         # Version history
```

---

## Contributing

Bug reports and pull requests are welcome. Please open an issue before submitting a pull request for non-trivial changes.

---

## License

[MIT](https://opensource.org/licenses/MIT) © Harshwardhan Wadikar
