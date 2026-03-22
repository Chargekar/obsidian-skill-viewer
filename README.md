# Skill Viewer

An Obsidian community plugin that renders `.skill` files as rich, native notes inside Obsidian.

## What is a .skill file?

A `.skill` file is a ZIP archive containing:
- `SKILL.md` — a Markdown file with YAML frontmatter (name, description, version, author…) and the skill's instructions
- Any supporting files (prompts, examples, scripts, assets…)

Skills are portable "skill packages" used by AI agents (Claude Code, OpenClaw, etc.) to describe a specific capability.

## Features

- **Rich rendering** — opens `.skill` files as formatted Obsidian notes, not raw binary
- **Header card** — shows skill name, description, version, author, and location at a glance
- **Embedded file tree** — inspect every file inside the ZIP without extracting it
- **Full Markdown rendering** — `SKILL.md` is rendered with all of Obsidian's native formatting
- **Skill Explorer sidebar** — browse all skills in your vault from a dedicated panel
- **Graph view** — skill files appear as nodes in the graph view
- **Commands** — open the explorer or reload the skill list via the command palette

## Installation

### Via BRAT (recommended for beta)

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
2. Open BRAT settings → Add Beta Plugin → paste `https://github.com/Chargekar/obsidian-skill-viewer`
3. Enable "Skill Viewer" in **Settings → Community Plugins**

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Copy them to `.obsidian/plugins/obsidian-skill-viewer/` inside your vault
3. Reload Obsidian and enable the plugin in **Settings → Community Plugins**

## Usage

1. Drop any `.skill` file into your vault (or a sub-folder)
2. Click the file in the file explorer — it opens in a rich skill view
3. Use the wand icon in the ribbon (or `Ctrl/Cmd+P` → "Open Skill Explorer") to browse all skills
4. Right-click a skill in the explorer for more options

## SKILL.md frontmatter reference

```yaml
---
name: My Skill
description: A short description of what this skill does
version: 1.0.0
author: Your Name
tags: automation, writing
category: productivity
---
```

All fields are optional; the plugin falls back to the filename if none are present.

## Settings

| Setting | Default | Description |
|---|---|---|
| Show in file explorer | ✅ | Display `.skill` files in Obsidian's built-in file tree |
| Default open mode | Tab | How skill files open (tab / split pane) |

## Screenshots

<!-- Add screenshots here -->

## Contributing

Issues and PRs are welcome! Please open an issue first for major changes.

## License

MIT
