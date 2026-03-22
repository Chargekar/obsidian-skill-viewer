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
- **Archive manifest** — every file inside the ZIP, rendered as an inline file tree
- **Full Markdown body** — the `SKILL.md` content rendered through Obsidian's native pipeline, including wikilinks, callouts, and code blocks
- **Graph integration** — skill files appear as nodes and participate in Obsidian's graph view

A dedicated **Skill Explorer** sidebar panel lists every `.skill` file in your vault with live search and one-click navigation.

---

## Compatibility

| Item | Requirement |
|---|---|
| Obsidian | ≥ 1.4.0 |
| Platform | Desktop and mobile |
| `.skill` format | Any ZIP archive with a `SKILL.md` at its root |

The `.skill` format is agent-agnostic. This plugin works with skill packages from **Claude Code**, **OpenClaw**, **NemoClaw**, and any other agent that follows the format.

---

## Features

- **Native file type registration** — `.skill` opens in a purpose-built view, not a fallback binary handler
- **Structured skill view** — header card with name, description, version, author; tag and category badges; collapsible archive file tree; full `SKILL.md` body rendered as standard Obsidian Markdown
- **Skill Explorer panel** — sidebar listing all `.skill` files in the vault, with real-time search
- **Graph view** — skill files appear as first-class nodes
- **Command palette** — `Open Skill Explorer` and `Reload skill list`
- **Settings tab** — configure file explorer visibility and default open mode (tab / split / window)
- **No network calls** — all processing is local and offline

---

## Installation

### Community Plugin Store *(pending review)*

1. Open **Settings → Community Plugins → Browse**
2. Search **Skill Viewer**
3. Click **Install**, then **Enable**

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/Chargekar/obsidian-skill-viewer/releases/latest)
2. Create `.obsidian/plugins/obsidian-skill-viewer/` inside your vault
3. Copy the three files into that directory
4. Reload Obsidian and enable **Skill Viewer** under **Settings → Community Plugins**

---

## Usage

### Opening a skill

Drop any `.skill` file into your vault and click it. The skill view opens automatically. The rendered note shows:

- Header card with all frontmatter metadata
- Tag and category badges
- Expandable tree of every file inside the archive
- The full `SKILL.md` body — headings, code blocks, callouts, wikilinks

### Skill Explorer

Click the wand icon in the left ribbon, or run **Open Skill Explorer** from the command palette. The panel lists all skills found in the vault. The search box filters by name in real time.

---

## SKILL.md Format

Skill Viewer reads the following frontmatter keys from `SKILL.md`. All are optional.

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
Wikilinks, code blocks, and callouts are all supported.
```

---

## Building from Source

**Prerequisites:** Node.js ≥ 18, npm

```bash
git clone https://github.com/Chargekar/obsidian-skill-viewer.git
cd obsidian-skill-viewer
npm install
npm run build
```

The build produces `main.js` via esbuild. It is fully deterministic from the locked `package-lock.json`.

**Toolchain:** TypeScript 4.7.4 · esbuild 0.17.3 · JSZip 3.10.1

---

## Project Structure

```
obsidian-skill-viewer/
├── src/main.ts            # Plugin source — SkillView, SkillExplorerView, settings
├── main.js                # Compiled output (esbuild bundle, committed for Obsidian)
├── styles.css             # Plugin styles
├── manifest.json          # Obsidian plugin manifest
├── versions.json          # Version → minimum Obsidian version map
├── package.json           # Build dependencies
├── tsconfig.json          # TypeScript configuration
├── esbuild.config.mjs     # Build script
└── CHANGELOG.md           # Release history
```

---

## Acknowledgements

This plugin would not make sense without [Obsidian](https://obsidian.md).

Obsidian understood something early that the rest of the industry is only beginning to grasp: that a local, portable, plain-text knowledge base is not a limitation — it is the feature. As AI systems grow more capable, the ability to store structured human intent in a format that is simultaneously readable by people, parseable by machines, version-controllable by git, and navigable by a graph engine becomes genuinely foundational.

Markdown is not a legacy format. It is at the very beginning of its utility. The same document that a developer reads in a code editor, a writer reads in Obsidian, an agent reads from disk, and a model reads from context — that convergence is what makes the `.skill` format possible, and what makes Obsidian the right place to work with it.

Thank you to the Obsidian team for building infrastructure that keeps getting more relevant, not less.

---

## Contributing

Issues and pull requests are welcome. Please open an issue before submitting a PR for non-trivial changes.

---

## License

[MIT](https://opensource.org/licenses/MIT) © Harshwardhan Wadikar
