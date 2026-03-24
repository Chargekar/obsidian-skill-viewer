import {
  App,
  Component,
  ItemView,
  MarkdownRenderer,
  Menu,
  Modal,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  ViewStateResult,
  WorkspaceLeaf,
  addIcon,
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

/** Render a tree node into an HTMLElement recursively.
 *  onFileClick: called with the zip-internal path when a file row is clicked. */
function renderTree(
  node: TreeNode,
  container: HTMLElement,
  onFileClick?: (path: string) => void
) {
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
    if (!child.isDir && onFileClick) {
      row.addClass("skill-tree-clickable");
      row.addEventListener("click", () => onFileClick(child.path));
    }
    if (child.children.length > 0) renderTree(child, li, onFileClick);
  }
}

// ─── SkillFileModal ────────────────────────────────────────────────────────────

/** Modal that shows the rendered content of a single file inside a .skill zip. */
class SkillFileModal extends Modal {
  private filename: string;
  private content: string;
  private sourcePath: string;

  constructor(app: App, filename: string, content: string, sourcePath: string) {
    super(app);
    this.filename = filename;
    this.content = content;
    this.sourcePath = sourcePath;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.addClass("skill-file-modal");
    contentEl.createEl("h2", { text: this.filename });
    const body = contentEl.createDiv({ cls: "skill-file-modal-body" });
    const comp = new Component();
    comp.load();
    await MarkdownRenderer.render(
      this.app,
      this.content,
      body,
      this.sourcePath,
      comp
    );
  }

  onClose() {
    this.contentEl.empty();
  }
}

/** Find SKILL.md anywhere inside a zip (may be in a named subfolder). */
async function extractSkillMd(zip: JSZip): Promise<string> {
  const entry = Object.keys(zip.files).find(
    (p) => p === "SKILL.md" || p.endsWith("/SKILL.md")
  );
  if (!entry) return "";
  const file = zip.file(entry);
  return file ? file.async("string") : "";
}

// ─── SkillView ─────────────────────────────────────────────────────────────────
//
// Uses ItemView (not FileView) so Obsidian's file-indexing machinery is never
// involved. All file reading goes through vault.adapter.readBinary, which works
// for any path regardless of whether Obsidian has indexed it.

export class SkillView extends ItemView {
  private currentPath = "";
  private currentBasename = "";

  getViewType(): string {
    return SKILL_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.currentBasename || "Skill";
  }

  getIcon(): string {
    return SKILL_ICON;
  }

  async onOpen(): Promise<void> {
    // Nothing to do — rendering is driven by setState.
  }

  getState(): Record<string, unknown> {
    return { file: this.currentPath };
  }

  async setState(state: Record<string, unknown>, result: ViewStateResult): Promise<void> {
    await super.setState(state, result);
    if (state.file && typeof state.file === "string" && state.file) {
      this.currentPath = state.file;
      const name = state.file.split("/").pop() ?? state.file;
      this.currentBasename = name.replace(/\.skill$/i, "");
      await this.renderSkill();
    }
  }

  private async renderSkill(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("skill-view-container");

    if (!this.currentPath) return;

    // ── Read & unzip ──────────────────────────────────────────────────────────
    let zip: JSZip;
    try {
      const arrayBuf = await this.app.vault.adapter.readBinary(this.currentPath);
      zip = await JSZip.loadAsync(arrayBuf);
    } catch (e) {
      contentEl.createEl("p", {
        text: `Failed to open skill file: ${e}`,
        cls: "skill-error",
      });
      return;
    }

    // ── Extract SKILL.md ──────────────────────────────────────────────────────
    const rawMd = await extractSkillMd(zip);
    const hasMd = rawMd.length > 0;
    const frontmatter = parseFrontmatter(rawMd);
    const bodyMd = stripFrontmatter(rawMd);
    const allFiles = Object.keys(zip.files);

    // ── Header card ───────────────────────────────────────────────────────────
    const header = contentEl.createDiv({ cls: "skill-header-card" });

    const headerTop = header.createDiv({ cls: "skill-header-top" });
    const iconWrap = headerTop.createDiv({ cls: "skill-header-icon" });
    setIcon(iconWrap, SKILL_ICON);

    const meta = headerTop.createDiv({ cls: "skill-header-meta" });
    const skillName =
      frontmatter["name"] ?? frontmatter["title"] ?? this.currentBasename;
    meta.createEl("h2", { cls: "skill-name", text: skillName });

    if (frontmatter["description"]) {
      meta.createEl("p", {
        cls: "skill-description",
        text: frontmatter["description"],
      });
    }

    // Badges row
    const badges = header.createDiv({ cls: "skill-badges" });
    for (const field of ["version", "author", "tags", "category"]) {
      if (frontmatter[field]) {
        const badge = badges.createEl("span", { cls: "skill-badge" });
        badge.createEl("strong", { text: field + ": " });
        badge.createSpan({ text: frontmatter[field] });
      }
    }
    const pathBadge = badges.createEl("span", {
      cls: "skill-badge skill-badge-path",
    });
    pathBadge.createEl("strong", { text: "location: " });
    pathBadge.createSpan({ text: this.currentPath });

    // ── Files in this skill (collapsible) ─────────────────────────────────────
    const details = contentEl.createEl("details", { cls: "skill-files-section" });
    details.open = true;
    details.createEl("summary", {
      text: `Files in this skill (${allFiles.filter((f) => !zip.files[f].dir).length})`,
    });
    renderTree(buildTree(allFiles), details, (zipPath) => {
      void (async () => {
        const entry = zip.file(zipPath);
        if (!entry) return;
        const text = await entry.async("string");
        new SkillFileModal(
          this.app,
          zipPath.split("/").pop() ?? zipPath,
          text,
          this.currentPath
        ).open();
      })();
    });

    // ── SKILL.md content ──────────────────────────────────────────────────────
    if (bodyMd.trim()) {
      const mdSection = contentEl.createDiv({ cls: "skill-md-content" });
      mdSection.createEl("h3", {
        cls: "skill-section-title",
        text: "Skill instructions",
      });
      await MarkdownRenderer.render(
        this.app,
        bodyMd,
        mdSection,
        this.currentPath,
        this
      );
    } else if (!hasMd) {
      contentEl.createEl("p", {
        text: "No SKILL.md found inside this skill package.",
        cls: "skill-no-content",
      });
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
    return "Skill explorer";
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
      header.createEl("h4", { text: "Skill explorer" });

      const refreshBtn = header.createEl("button", {
        cls: "skill-explorer-refresh",
        title: "Reload skills",
      });
      setIcon(refreshBtn, "refresh-cw");
      refreshBtn.addEventListener("click", () => { void this.refresh(); });

      // Collect all .skill file paths.
      // vault.getFiles() skips non-indexed extensions, so fall back to
      // vault.adapter.list() and collect paths directly.
      const skillPaths: string[] = [];

      const indexed = this.app.vault
        .getFiles()
        .filter((f) => f.extension === "skill")
        .map((f) => f.path);
      skillPaths.push(...indexed);

      if (skillPaths.length === 0) {
        try {
          const listed = await this.app.vault.adapter.list("/");
          listed.files
            .filter((p) => p.endsWith(".skill"))
            .forEach((p) => skillPaths.push(p));
        } catch {
          // adapter.list failed — skillPaths stays empty
        }
      }

      skillPaths.sort((a, b) => {
        const ba = a.split("/").pop()!.replace(/\.skill$/i, "");
        const bb = b.split("/").pop()!.replace(/\.skill$/i, "");
        return ba.localeCompare(bb);
      });

      if (skillPaths.length === 0) {
        contentEl.createEl("p", {
          text: "No .skill files found in this vault.",
          cls: "skill-explorer-empty",
        });
        return;
      }

      const list = contentEl.createDiv({ cls: "skill-explorer-list" });

      for (const filePath of skillPaths) {
        const fileName = filePath.split("/").pop() ?? filePath;
        const basename = fileName.replace(/\.skill$/i, "");
        const item = list.createDiv({ cls: "skill-explorer-item" });

        // Try to read name/description from SKILL.md (best-effort)
        let displayName = basename;
        let desc = "";
        try {
          const buf = await this.app.vault.adapter.readBinary(filePath);
          const zip = await JSZip.loadAsync(buf);
          const md = await extractSkillMd(zip);
          if (md) {
            const fm = parseFrontmatter(md);
            displayName = fm["name"] ?? fm["title"] ?? basename;
            desc =
              fm["description"] ??
              stripFrontmatter(md)
                .split("\n")
                .find((l) => l.trim()) ??
              "";
          }
        } catch {
          // fall back to filename
        }

        const iconEl = item.createDiv({ cls: "skill-explorer-item-icon" });
        setIcon(iconEl, SKILL_ICON);

        const textEl = item.createDiv({ cls: "skill-explorer-item-text" });
        textEl.createEl("div", {
          cls: "skill-explorer-item-name",
          text: displayName,
        });
        if (desc) {
          textEl.createEl("div", {
            cls: "skill-explorer-item-desc",
            text: desc.slice(0, 80) + (desc.length > 80 ? "…" : ""),
          });
        }

        item.addEventListener("click", () => {
          void this.plugin.openSkillPath(filePath);
        });

        // Right-click context menu
        item.addEventListener("contextmenu", (evt) => {
          const menu = new Menu();
          menu.addItem((i) =>
            i
              .setTitle("Open in new tab")
              .setIcon("file-plus")
              .onClick(() => { void this.plugin.openSkillPath(filePath, true); })
          );
          menu.showAtMouseEvent(evt);
        });
      }
    } catch (e) {
      contentEl.createEl("p", {
        text: `Skill explorer error: ${e}`,
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
    new Setting(containerEl).setName("Configuration").setHeading();

    new Setting(containerEl)
      .setName("Default open mode")
      .setDesc("How to open a skill file when clicked.")
      .addDropdown((drop) =>
        drop
          .addOption("tab", "New tab")
          .addOption("split", "Split pane")
          .setValue(this.plugin.settings.defaultOpenMode)
          .onChange(async (value: string) => {
            this.plugin.settings.defaultOpenMode = value as
              | "tab"
              | "split"
              | "window";
            await this.plugin.saveSettings();
          })
      );
  }
}

// ─── Main Plugin ──────────────────────────────────────────────────────────────

export default class SkillViewerPlugin extends Plugin {
  settings: SkillViewerSettings = DEFAULT_SETTINGS;

  async onload() {
    console.debug("Skill viewer plugin loading…");

    await this.loadSettings();

    addIcon("skill-file", SKILL_FILE_ICON);

    // Register .skill as a recognised extension so clicking in the native
    // file explorer opens our view.
    this.registerExtensions(["skill"], SKILL_VIEW_TYPE);

    // Register the skill file view (ItemView-based)
    this.registerView(SKILL_VIEW_TYPE, (leaf) => new SkillView(leaf));

    // Register the sidebar explorer view
    this.registerView(
      SKILL_EXPLORER_VIEW_TYPE,
      (leaf) => new SkillExplorerView(leaf, this)
    );

    // Ribbon icon → open Skill Explorer
    this.addRibbonIcon(SKILL_ICON, "Open skill explorer", () => {
      void this.activateSkillExplorer();
    });

    // Commands
    this.addCommand({
      id: "open-skill-explorer",
      name: "Open skill explorer",
      callback: () => { void this.activateSkillExplorer(); },
    });

    this.addCommand({
      id: "reload-skills",
      name: "Reload skills",
      callback: () => {
        const leaf = this.app.workspace.getLeavesOfType(
          SKILL_EXPLORER_VIEW_TYPE
        )[0];
        if (leaf?.view instanceof SkillExplorerView) {
          void leaf.view.refresh();
        }
      },
    });

    // Settings tab
    this.addSettingTab(new SkillViewerSettingTab(this.app, this));

    console.debug("Skill viewer plugin loaded.");
  }

  onunload() {
    console.debug("Skill viewer plugin unloaded.");
  }

  /** Open or reveal the Skill Explorer sidebar. */
  async activateSkillExplorer() {
    const existing = this.app.workspace.getLeavesOfType(
      SKILL_EXPLORER_VIEW_TYPE
    );
    if (existing.length > 0) {
      await this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getLeftLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: SKILL_EXPLORER_VIEW_TYPE, active: true });
      await this.app.workspace.revealLeaf(leaf);
    }
  }

  /** Open a .skill file by path in the main workspace. */
  async openSkillPath(filePath: string, forceNewTab = false) {
    const mode = forceNewTab ? "tab" : this.settings.defaultOpenMode;
    let leaf: WorkspaceLeaf | null = null;
    if (mode === "split") {
      leaf = this.app.workspace.getLeaf("split");
    } else {
      leaf = this.app.workspace.getLeaf(mode === "tab" ? "tab" : false);
    }
    if (leaf) {
      await leaf.setViewState({
        type: SKILL_VIEW_TYPE,
        state: { file: filePath },
        active: true,
      });
      await this.app.workspace.revealLeaf(leaf);
    }
  }

  /** Convenience wrapper for callers that have a TFile. */
  async openSkillFile(file: TFile, forceNewTab = false) {
    await this.openSkillPath(file.path, forceNewTab);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
