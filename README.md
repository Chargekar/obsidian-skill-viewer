# Obsidian Skill Viewer

> *Obsidian was built for the age of connected thought. It turns out that age is now — and its currency is Markdown.*

An Obsidian plugin for rendering `.skill` packages — the portable skill format used by AI coding agents — as fully structured, native notes inside your vault.

---

## Why This Exists

The Markdown document is quietly becoming one of the most important data structures in software. Not because of aesthetics, but because of what it encodes: structured human intent, readable by both people and machines, portable across every tool in the stack.

AI agents like Claude Code, OpenClaw, and NemoClaw distribute their capabilities as **`.skill` files** — ZIP archives containing a `SKILL.md` specification and supporting assets. These packages encode *what an agent knows how to do*, in plain Markdown, with YAML frontmatter, portable to any system that can read a file.

Obsidian is the natural home for these packages. Its graph model, backlink engine, and Markdown renderer are precisely the infrastructure needed to navigate, understand, and connect AI capabilities as a knowledge base. The only missing piece was first-class file type support.

Skill Viewer closes that gap.

---

## What It Does

When you drop a `.skill` file into your vault, Obsidian opens it as a rendered note — not a binary blob. The view surfaces:

- **Skill header** — name, description, version, author, and tags drawn from `SKILL.md` frontmatter
- **Archive manifest** — every file inside the ZIP, rendered as an interactive file tree
- **Clickable files** — click any file in the tree to view its rendered content in a modal
- **Full Markdown body** — the `SKILL.md` content rendered through Obsidian's native pipeline, including callouts and code blocks
- **Skill Explorer sidebar** — a dedicated panel listing every `.skill` file in your vault with one-click navigation

---

## Screenshots

| Skill view | Skill Explorer |
|---|---|
| Header card, file tree, and rendered SKILL.md | Sidebar listing all skills in the vault |

---

## Compatibility

| Item | Requirement |
|---|---|
| Obsidian | ≥ 1.4.0 |
| Platform | Desktop and mobile |
| `.skill` format | Any ZIP archive containing a `SKILL.md` (at any depth) |

The `.skill` format is agent-agnostic. This plugin works with skill packages from **Claude Code**, **OpenClaw**, **NemoClaw**, and any other agent that follows the format.

---

## Features

- **Native file type registration** — `.skill` files open in a purpose-built view, not a fallback binary handler
- **Structured skill view** — header card with name, description, version, author; badge row for tags and category; expandable archive file tree; full `SKILL.md` body rendered as Obsidian Markdown
- **Interactive file tree** — click any file inside the archive to view its contents in a rendered modal; works for `.md`, plain text, and any readable format
- **Skill Explorer panel** — sidebar listing all `.skill` files in the vault; click to open, right-click for context menu
- **Resilient file discovery** — finds `.skill` files even when Obsidian has not indexed them, using the vault adapter directly
- **Command palette** — `Open Skill Explorer` and `Reload Skills`
- **Settings tab** — configure default open mode (tab / split)
- **No network calls** — all processing is local and offline

---

## Installation

### Community Plugin Store *(pending review)*

1. Open **Settings → Community Plugins → Browse**
2. Search **Skill Viewer**
3. Click **Install**, then **Enable**

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/Chargekar/obsidian-skill-viewer/releases/latest)
2. Create `.obsidian/plugins/skill-viewer/` inside your vault
3. Copy the three files into that directory
4. Reload Obsidian and enable **Skill Viewer** under **Settings → Community Plugins**

---

## Usage

### Opening a skill file

Click any `.skill` file in Obsidian's file explorer. The skill view opens and shows:

1. **Header card** — skill name (from frontmatter or filename), description, and metadata badges
2. **File tree** — every file inside the ZIP archive, expandable and clickable
3. **Skill Instructions** — the full body of `SKILL.md`, rendered as native Obsidian Markdown

Clicking a file in the tree (e.g. a reference `.md`) opens it in a modal with full Markdown rendering.

### Skill Explorer

Click the **wand icon** in the left ribbon, or run **Open Skill Explorer** from the command palette (`Ctrl/Cmd + P`). The panel lists all `.skill` files found in the vault. Click any entry to open it; right-click for options including *Open in new tab*.

### Commands

| Command | Description |
|---|---|
| `Open Skill Explorer` | Open or reveal the Skill Explorer sidebar |
| `Reload Skills` | Refresh the skill list in the explorer |

### Settings

| Setting | Default | Description |
|---|---|---|
| Default open mode | Tab | Whether clicking a skill opens it in a new tab or a split pane |

---

## SKILL.md Format

Skill Viewer reads the following frontmatter keys from `SKILL.md`. All fields are optional — the plugin falls back to the filename if `name` is absent.

```yaml
---
name: "My Skill"
description: "What this skill does"
version: "1.0.0"
author: "Author Name"
tags: "tag1, tag2"
category: "productivity"
---

# Skill body

Full Markdown content follows the frontmatter.
Callouts, code blocks, and nested headings are all supported.
```

The `SKILL.md` may be located at the root of the ZIP or inside a named subfolder — Skill Viewer will find it either way.

---

## Building from Source

**Prerequisites:** Node.js ≥ 18, npm

```bash
git clone https://github.com/Chargekar/obsidian-skill-viewer.git
cd obsidian-skill-viewer
npm install
npm run build
```

The build produces `main.js` via esbuild. Output is fully deterministic from `package-lock.json`.

**Toolchain:** TypeScript · esbuild · JSZip 3.10.1

---

## Project Structure

```
obsidian-skill-viewer/
├── src/main.ts            # Plugin source — SkillView, SkillExplorerView, SkillFileModal
├── main.js                # Compiled output (esbuild bundle, committed for Obsidian)
├── styles.css             # Plugin styles
├── manifest.json          # Obsidian plugin manifest
├── versions.json          # Version → minimum Obsidian version map
├── package.json           # Build dependencies
├── package-lock.json      # Locked dependency tree
├── tsconfig.json          # TypeScript configuration
└── esbuild.config.mjs     # Build script
```

---

## How It Works

`.skill` files are ZIP archives. When one is opened, the plugin:

1. Reads the raw bytes directly via `vault.adapter.readBinary` (bypassing Obsidian's file index, which does not track binary formats)
2. Parses the ZIP with JSZip
3. Locates `SKILL.md` anywhere inside the archive
4. Renders frontmatter as a header card and the body through `MarkdownRenderer`
5. Builds the file tree with click handlers that extract and render individual files on demand

The Skill Explorer uses `vault.adapter.list` as a fallback when `vault.getFiles()` returns no `.skill` entries, ensuring skills are always discoverable.

---

## Acknowledgements

This plugin would not make sense without [Obsidian](https://obsidian.md).

Obsidian understood something early that the rest of the industry is only beginning to grasp: that a local, portable, plain-text knowledge base is not a limitation — it is the feature.

As AI systems grow more capable, the ability to store structured human intent in a format that is simultaneously readable by people, parseable by machines, version-controllable by git, and navigable by a graph engine becomes genuinely foundational.

Markdown is not a legacy format. It is at the very beginning of its utility. The same document that a developer reads in a code editor, a writer reads in Obsidian, an agent reads from disk, and a model reads from context — that convergence is what makes the `.skill` format possible, and what makes Obsidian the right place to work with it.

Thank you to the Obsidian team for building infrastructure that keeps getting more relevant.

---

## Contributing

Issues and pull requests are welcome. Please open an issue before submitting a PR for non-trivial changes.

---

## License

[MIT](LICENSE) © Harshwardhan Wadikar
