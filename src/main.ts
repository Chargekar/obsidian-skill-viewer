import {
  App,
  FileView,
  ItemView,
  Menu,
  Plugin,
  PluginSettingTab,
  Setting,
  TAbstractFile,
  TFile,
  ViewStateResult,
  WorkspaceLeaf,
  addIcon,
  normalizePath,
  setIcon,
} from "obsidian";
import JSZip from "jszip";

// ─── Constants ────────────────────────────────────────────────────────────────

const SKILL_VIEW_TYPE = "skill-view";
const SKILL_EXPLORER_VIEW_TYPE = "skill-explorer";
const SKILL_ICON = "wand-2";

// SVG icon for skill files in the ribbon / sidebar
const SKILL_FILE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/></svg>`;

// ─── Settings ─────────────────────────────────────────────────────────────────

interface SkillViewerSettings {
  showInFileExplorer: boolean;
  defaultOpenMode: "tab" | "split" | "window";
}

const DEFAULT_SETTINGS: SkillViewerSettings = {
  showInFileExplorer: true,
  defaultOpenMode: "tab",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse YAML-ish frontmatter from a markdown string (very lightweight). */
function parseFrontmatter(md: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!md.startsWith("---")) return result;
  const end = md.indexOf("---", 3);
  if (end === -1) return result;
  const block = md.slice(3, end);
  for (const line of block.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (key) result[key] = value;
  }
  return result;
}

/** Strip frontmatter from a markdown string. */
function stripFrontmatter(md: string): string {
  if (!md.startsWith("---")) return md;
  const end = md.indexOf("---", 3);
  if (end === -1) return md;
  return md.slice(end + 3).trimStart();
}

/** Build a simple file-tree structure from a flat list of zip paths. */
interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  isDir: boolean;
}

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: "", path: "", children: [], isDir: true };
  for (const p of paths) {
    const parts = p.split("/").filter(Boolean);
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      let child = node.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          children: [],
          isDir: !isLast || p.endsWith("/"),
        };
        node.children.push(child);
      }
      node = child;
    }
  }
  return root;
}

/** Render a tree node into an HTMLElement recursively. */
function renderTree(node: TreeNode, container: HTMLElement) {
  const sorted = [...node.children].sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const ul = container.createEl("ul", { cls: "skill-file-tree" });
  for (const child of sorted) {
    const li = ul.createEl("li", {
      cls: child.isDir ? "skill-tree-dir" : "skill-tree-file",
    });
    const row = li.createEl("div", { cls: "skill-tree-row" });
    const iconEl = row.createEl("span", { cls: "skill-tree-icon" });
    setIcon(iconEl, child.isDir ? "folder" : "file");
    row.createEl("span", { cls: "skill-tree-name", text: child.name });
    if (child.children.length > 0) renderTree(child, li);
  }
}

// ─── SkillView ─────────────────────────────────────────────────────────────────

export class SkillView extends FileView {
  private skillData: {
    frontmatter: Record<string, string>;
    bodyMd: string;
    files: string[];
  } | null = null;

  getViewType(): string {
    return SKILL_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.file?.basename ?? "Skill";
  }

  getIcon(): string {
    return SKILL_ICON;
  }

  /** Must return true so Obsidian calls onLoadFile for .skill files. */
  canAcceptExtension(extension: string): boolean {
    return extension === "skill";
  }

  /** Called by Obsidian when a file is loaded into this view. */
  async onLoadFile(file: TFile): Promise<void> {
    await this.renderSkill(file);
  }

  /** Re-render when the file changes on disk. */
  async onUnloadFile(_file: TFile): Promise<void> {
    this.contentEl.empty();
    this.skillData = null;
  }

  private async renderSkill(file: TFile) {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("skill-view-container");

    // ── Read & unzip ──────────────────────────────────────────────────────────
    // Use adapter.readBinary so unindexed files (not in vault cache) still load.
    let zip: JSZip;
    try {
      const arrayBuf = await this.app.vault.adapter.readBinary(file.path);
      zip = await JSZip.loadAsync(arrayBuf);
    } catch (e) {
      contentEl.createEl("p", {
        text: `Failed to open skill file: ${e}`,
        cls: "skill-error",
      });
      return;
    }

    // ── Extract SKILL.md ──────────────────────────────────────────────────────
    const skillMdFile = zip.file("SKILL.md");
    let rawMd = "";
    if (skillMdFile) {
      rawMd = await skillMdFile.async("string");
    }

    const frontmatter = parseFrontmatter(rawMd);
    const bodyMd = stripFrontmatter(rawMd);
    const allFiles = Object.keys(zip.files);

    this.skillData = { frontmatter, bodyMd, files: allFiles };

    // ── Header card ───────────────────────────────────────────────────────────
    const header = contentEl.createDiv({ cls: "skill-header-card" });

    const headerTop = header.createDiv({ cls: "skill-header-top" });
    const iconWrap = headerTop.createDiv({ cls: "skill-header-icon" });
    setIcon(iconWrap, SKILL_ICON);

    const meta = headerTop.createDiv({ cls: "skill-header-meta" });
    const skillName =
      frontmatter["name"] ?? frontmatter["title"] ?? file.basename;
    meta.createEl("h2", { cls: "skill-name", text: skillName });

    if (frontmatter["description"]) {
      meta.createEl("p", {
        cls: "skill-description",
        text: frontmatter["description"],
      });
    }

    // Badges row
    const badges = header.createDiv({ cls: "skill-badges" });
    const badgeFields = ["version", "author", "tags", "category"];
    for (const field of badgeFields) {
      if (frontmatter[field]) {
        const badge = badges.createEl("span", { cls: "skill-badge" });
        badge.createEl("strong", { text: field + ": " });
        badge.createSpan({ text: frontmatter[field] });
      }
    }

    // File path badge
    const pathBadge = badges.createEl("span", { cls: "skill-badge skill-badge-path" });
    pathBadge.createEl("strong", { text: "location: " });
    pathBadge.createSpan({ text: file.path });

    // ── Files in this skill (collapsible) ─────────────────────────────────────
    const details = contentEl.createEl("details", { cls: "skill-files-section" });
    details.createEl("summary", {
      text: `Files in this skill (${allFiles.filter((f) => !zip.files[f].dir).length})`,
    });
    const tree = buildTree(allFiles);
    renderTree(tree, details);

    // ── SKILL.md content ──────────────────────────────────────────────────────
    if (bodyMd.trim()) {
      const mdSection = contentEl.createDiv({ cls: "skill-md-content" });
      mdSection.createEl("h3", { cls: "skill-section-title", text: "Skill Instructions" });
      // Use Obsidian's built-in markdown renderer
      const { MarkdownRenderer } = await import("obsidian");
      await MarkdownRenderer.render(
        this.app,
        bodyMd,
        mdSection,
        file.path,
        this
      );
    } else if (!skillMdFile) {
      contentEl.createEl("p", {
        text: "No SKILL.md found inside this skill package.",
        cls: "skill-no-content",
      });
    }
  }

  /** Save / restore state so re-opening the same file works. */
  getState(): Record<string, unknown> {
    return { file: this.file?.path };
  }

  async setState(state: Record<string, unknown>, result: ViewStateResult): Promise<void> {
    await super.setState(state, result);
    // If the base class couldn't resolve the file (not in vault index), render directly.
    if (!this.file && state.file && typeof state.file === "string") {
      const path = state.file as string;
      // Synthesise a minimal TFile-like object so renderSkill can proceed.
      const adapter = this.app.vault.adapter;
      try {
        const buf = await adapter.readBinary(path);
        const fakeName = path.split("/").pop() ?? path;
        const fakeFile = { path, name: fakeName, basename: fakeName.replace(/\.skill$/, ""), extension: "skill" } as unknown as TFile;
        await this.renderSkill(fakeFile);
      } catch {
        // silently ignore — view stays blank rather than crashing
      }
    }
  }
}

// ─── SkillExplorerView ─────────────────────────────────────────────────────────

export class SkillExplorerView extends ItemView {
  plugin: SkillViewerPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: SkillViewerPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return SKILL_EXPLORER_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Skill Explorer";
  }

  getIcon(): string {
    return SKILL_ICON;
  }

  async onOpen(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("skill-explorer-container");

    try {
      const header = contentEl.createDiv({ cls: "skill-explorer-header" });
      header.createEl("h4", { text: "Skill Explorer" });

      const refreshBtn = header.createEl("button", {
        cls: "skill-explorer-refresh",
        title: "Reload skills",
      });
      setIcon(refreshBtn, "refresh-cw");
      refreshBtn.addEventListener("click", () => this.refresh());

      // Collect all .skill files — vault.getFiles() skips non-indexed extensions,
      // so fall back to vault.adapter.list() when it returns nothing.
      let skillFiles = this.app.vault
        .getFiles()
        .filter((f) => f.extension === "skill");
      if (skillFiles.length === 0) {
        try {
          const listed = await this.plugin.app.vault.adapter.list("/");
          const skillPaths = listed.files.filter((p) => p.endsWith(".skill"));
          skillFiles = skillPaths
            .map((p) => this.plugin.app.vault.getAbstractFileByPath(p))
            .filter((f): f is TFile => f instanceof TFile);
        } catch (e) {
          // fallback failed, skillFiles stays empty
        }
      }
      skillFiles = skillFiles.sort((a, b) => a.basename.localeCompare(b.basename));

      if (skillFiles.length === 0) {
        contentEl.createEl("p", {
          text: "No .skill files found in this vault.",
          cls: "skill-explorer-empty",
        });
        return;
      }

      const list = contentEl.createDiv({ cls: "skill-explorer-list" });

      for (const file of skillFiles) {
        const item = list.createDiv({ cls: "skill-explorer-item" });

        // Try to read metadata without fully parsing the zip (best-effort)
        let name = file.basename;
        let desc = "";
        try {
          const buf = await this.app.vault.readBinary(file);
          const zip = await JSZip.loadAsync(buf);
          const mdFile = zip.file("SKILL.md");
          if (mdFile) {
            const md = await mdFile.async("string");
            const fm = parseFrontmatter(md);
            name = fm["name"] ?? fm["title"] ?? file.basename;
            desc =
              fm["description"] ??
              stripFrontmatter(md).split("\n").find((l) => l.trim()) ??
              "";
          }
        } catch {
          // silently fall back to filename
        }

        const iconEl = item.createDiv({ cls: "skill-explorer-item-icon" });
        setIcon(iconEl, SKILL_ICON);

        const textEl = item.createDiv({ cls: "skill-explorer-item-text" });
        textEl.createEl("div", { cls: "skill-explorer-item-name", text: name });
        if (desc) {
          textEl.createEl("div", {
            cls: "skill-explorer-item-desc",
            text: desc.slice(0, 80) + (desc.length > 80 ? "…" : ""),
          });
        }

        item.addEventListener("click", () => {
          this.plugin.openSkillFile(file);
        });

        // Right-click context menu
        item.addEventListener("contextmenu", (evt) => {
          const menu = new Menu();
          menu.addItem((i) =>
            i
              .setTitle("Open in new tab")
              .setIcon("file-plus")
              .onClick(() => this.plugin.openSkillFile(file, true))
          );
          menu.addItem((i) =>
            i
              .setTitle("Reveal in file explorer")
              .setIcon("folder-open")
              .onClick(() => {
                // @ts-ignore – internal API
                this.app.internalPlugins
                  ?.getPluginById("file-explorer")
                  ?.instance?.revealInFolder(file);
              })
          );
          menu.showAtMouseEvent(evt);
        });
      }
    } catch (e) {
      contentEl.createEl("p", {
        text: `Skill Explorer error: ${e}`,
        cls: "skill-error",
      });
    }
  }
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

class SkillViewerSettingTab extends PluginSettingTab {
  plugin: SkillViewerPlugin;

  constructor(app: App, plugin: SkillViewerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Skill Viewer Settings" });

    new Setting(containerEl)
      .setName("Show skill files in file explorer")
      .setDesc(
        "When enabled, .skill files appear in Obsidian's built-in file explorer."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showInFileExplorer)
          .onChange(async (value) => {
            this.plugin.settings.showInFileExplorer = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Default open mode")
      .setDesc("How to open a skill file when clicked.")
      .addDropdown((drop) =>
        drop
          .addOption("tab", "New tab")
          .addOption("split", "Split pane")
          .setValue(this.plugin.settings.defaultOpenMode)
          .onChange(async (value: string) => {
            this.plugin.settings.defaultOpenMode = value as "tab" | "split" | "window";
            await this.plugin.saveSettings();
          })
      );
  }
}

// ─── Main Plugin ──────────────────────────────────────────────────────────────

export default class SkillViewerPlugin extends Plugin {
  settings: SkillViewerSettings = DEFAULT_SETTINGS;

  async onload() {
    console.log("Skill Viewer plugin loading…");

    await this.loadSettings();

    // Register custom icon
    addIcon(
      "skill-file",
      SKILL_FILE_ICON
    );

    // Register .skill as a recognised extension
    this.registerExtensions(["skill"], SKILL_VIEW_TYPE);

    // Register the skill file view
    this.registerView(SKILL_VIEW_TYPE, (leaf) => new SkillView(leaf));

    // Register the sidebar explorer view
    this.registerView(
      SKILL_EXPLORER_VIEW_TYPE,
      (leaf) => new SkillExplorerView(leaf, this)
    );

    // Ribbon icon → open Skill Explorer
    this.addRibbonIcon(SKILL_ICON, "Open Skill Explorer", () => {
      this.activateSkillExplorer();
    });

    // Commands
    this.addCommand({
      id: "open-skill-explorer",
      name: "Open Skill Explorer",
      callback: () => this.activateSkillExplorer(),
    });

    this.addCommand({
      id: "reload-skills",
      name: "Reload Skills",
      callback: () => {
        const leaf = this.app.workspace.getLeavesOfType(
          SKILL_EXPLORER_VIEW_TYPE
        )[0];
        if (leaf?.view instanceof SkillExplorerView) {
          leaf.view.refresh();
        }
      },
    });

    // Settings tab
    this.addSettingTab(new SkillViewerSettingTab(this.app, this));

    console.log("Skill Viewer plugin loaded.");
  }

  onunload() {
    // Obsidian handles view cleanup automatically
    console.log("Skill Viewer plugin unloaded.");
  }

  /** Open or reveal the Skill Explorer sidebar. */
  async activateSkillExplorer() {
    const existing = this.app.workspace.getLeavesOfType(
      SKILL_EXPLORER_VIEW_TYPE
    );
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getLeftLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: SKILL_EXPLORER_VIEW_TYPE, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }

  /** Open a .skill file in the main workspace. */
  async openSkillFile(file: TFile, forceNewTab = false) {
    const mode = forceNewTab ? "tab" : this.settings.defaultOpenMode;
    let leaf: WorkspaceLeaf | null = null;
    if (mode === "split") {
      leaf = this.app.workspace.getLeaf("split");
    } else {
      leaf = this.app.workspace.getLeaf(mode === "tab" ? "tab" : false);
    }
    if (leaf) await leaf.openFile(file);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
