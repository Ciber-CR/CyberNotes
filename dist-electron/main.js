import { app as l, ipcMain as o, shell as C, session as D, dialog as O, BrowserWindow as F, screen as b, Tray as k, Menu as U } from "electron";
import d from "path";
import E from "fs";
import { fileURLToPath as M } from "url";
import { createRequire as j } from "module";
const R = d.dirname(M(import.meta.url)), A = j(import.meta.url), w = !l.isPackaged;
let y = d.join(R, "..", "public", "icon.png");
w || (y = d.join(l.getAppPath(), "dist", "icon.png"));
if (!E.existsSync(y)) {
  const s = d.join(w ? d.join(R, "..", "public") : d.join(l.getAppPath(), "dist"), "icon.ico");
  E.existsSync(s) && (y = s);
}
const x = A("bcryptjs"), v = l.getPath("userData"), S = d.join(v, "cybernotes.db"), m = d.join(v, "images"), { v4: H } = A("uuid");
let h = null, _ = null;
function I() {
  if (!h) return;
  const s = h.export();
  E.writeFileSync(S, Buffer.from(s));
}
async function B() {
  const s = w ? d.join(R, "..", "node_modules", "sql.js", "dist", "sql-wasm.wasm") : d.join(process.resourcesPath, "sql-wasm.wasm");
  if (_ = await A("sql.js")({
    locateFile: () => s
  }), E.existsSync(S)) {
    const n = E.readFileSync(S);
    h = new _.Database(n);
  } else
    h = new _.Database();
  h.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS folders (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      icon       TEXT DEFAULT '📁',
      color      TEXT DEFAULT '#7c3aed',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id         TEXT PRIMARY KEY,
      folder_id  TEXT,
      title      TEXT NOT NULL DEFAULT 'Nueva nota',
      content    TEXT NOT NULL DEFAULT '',
      preview    TEXT DEFAULT '',
      pinned     INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `), I(), E.existsSync(m) || E.mkdirSync(m, { recursive: !0 });
}
function p(s, e = []) {
  if (!h) throw new Error("Base de datos no inicializada");
  const n = h.prepare(s);
  n.bind(e);
  const r = [];
  for (; n.step(); )
    r.push(n.getAsObject());
  return n.free(), r;
}
function f(s, e = []) {
  const n = p(s, e);
  return n.length > 0 ? n[0] : null;
}
function a(s, e = []) {
  if (!h) throw new Error("Base de datos no inicializada");
  h.run(s, e), I();
}
let t = null, u = null, P = !1;
function X() {
  try {
    u = new k(y);
    const s = U.buildFromTemplate([
      { label: "Abrir CyberNotes", click: () => t == null ? void 0 : t.show() },
      { type: "separator" },
      {
        label: "Salir",
        click: () => {
          P = !0, l.quit();
        }
      }
    ]);
    u.setToolTip("CyberNotes"), u.setContextMenu(s), u.on("double-click", () => {
      t == null || t.show();
    });
  } catch (s) {
    console.error("Failed to create tray:", s);
  }
}
function N() {
  const s = f("SELECT value FROM settings WHERE key = ?", ["window_bounds"]), e = f("SELECT value FROM settings WHERE key = ?", ["is_maximized"]), n = b.getPrimaryDisplay(), { width: r, height: L } = n.workAreaSize;
  let T = { width: 1100, height: 700, x: void 0, y: void 0 };
  if (s)
    try {
      const i = JSON.parse(s.value);
      i.width > 400 && i.width <= r + 100 && i.height > 400 && i.height <= L + 100 && (T = i);
    } catch {
    }
  t = new F({
    width: T.width,
    height: T.height,
    x: T.x,
    y: T.y,
    center: !T.x,
    minWidth: 900,
    minHeight: 600,
    frame: !1,
    titleBarStyle: "hidden",
    backgroundColor: "#0d0d14",
    icon: y,
    webPreferences: {
      preload: d.join(R, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1,
      webSecurity: !1
    },
    show: !1
  });
  const g = () => {
    if (!t || t.isDestroyed()) return;
    const i = t.isMaximized();
    if (a("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["is_maximized", i ? "true" : "false"]), !i) {
      const c = t.getBounds();
      c.width > 100 && c.height > 100 && a("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["window_bounds", JSON.stringify(c)]);
    }
  };
  t.on("resize", g), t.on("move", g), t.on("close", g), t.on("maximize", g), t.on("unmaximize", g), t.on("close", (i) => {
    const c = f("SELECT value FROM settings WHERE key = ?", ["close_to_tray"]);
    if ((c == null ? void 0 : c.value) === "true" && !P)
      return i.preventDefault(), t == null || t.hide(), !1;
    u && !u.isDestroyed() && (u.destroy(), u = null);
  }), t.webContents.setWindowOpenHandler(({ url: i }) => (i.startsWith("http") && C.openExternal(i), { action: "deny" })), t.webContents.on("context-menu", (i, c) => {
    t == null || t.webContents.send("context-menu-data", {
      x: c.x,
      y: c.y,
      suggestions: c.dictionarySuggestions,
      misspelledWord: c.misspelledWord,
      linkURL: c.linkURL
    });
  }), w ? t.loadURL("http://localhost:5173") : t.loadFile(d.join(R, "../dist/index.html")), t.once("ready-to-show", () => {
    (e == null ? void 0 : e.value) === "true" && (t == null || t.maximize()), process.argv.includes("--hidden") || (t.show(), t.focus());
  });
}
o.handle("window-minimize", () => t == null ? void 0 : t.minimize());
o.handle("window-maximize-toggle", () => {
  t != null && t.isMaximized() ? t.unmaximize() : t == null || t.maximize();
});
o.handle("window-close", () => t == null ? void 0 : t.close());
o.handle("open-dev-tools", () => t == null ? void 0 : t.webContents.openDevTools({ mode: "detach" }));
o.handle("open-data-folder", () => C.openPath(v));
o.handle("replace-misspelling", (s, e) => t == null ? void 0 : t.webContents.replaceMisspelling(e));
o.handle("add-to-dictionary", (s, e) => {
  D.defaultSession.addWordToSpellCheckerDictionary(e);
});
o.handle("auth:hasPassword", () => !!f("SELECT value FROM settings WHERE key = ?", ["password_hash"]));
o.handle("auth:setPassword", async (s, e) => {
  const n = await x.hash(e, 10);
  return a("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["password_hash", n]), !0;
});
o.handle("auth:verifyPassword", async (s, e) => {
  const n = f("SELECT value FROM settings WHERE key = ?", ["password_hash"]);
  return n ? x.compare(e, n.value) : !0;
});
o.handle("auth:removePassword", () => (a("DELETE FROM settings WHERE key = ?", ["password_hash"]), !0));
o.handle("settings:get", (s, e) => {
  const n = f("SELECT value FROM settings WHERE key = ?", [e]);
  return n ? n.value : null;
});
o.handle("settings:set", (s, e, n) => (a("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [e, n]), !0));
o.handle("settings:setAutoStart", (s, e) => (l.setLoginItemSettings({
  openAtLogin: e,
  openAsHidden: !0,
  // macOS
  args: e ? ["--hidden"] : []
  // Windows / Linux
}), a("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["auto_start", e ? "true" : "false"]), !0));
o.handle("settings:getAutoStart", () => l.getLoginItemSettings().openAtLogin);
o.handle("folders:getAll", () => p("SELECT * FROM folders ORDER BY name COLLATE NOCASE ASC"));
o.handle("folders:create", (s, e) => (a(
  "INSERT INTO folders (id, name, icon, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  [e.id, e.name, e.icon, e.color, e.sort_order, e.created_at]
), e));
o.handle("folders:update", (s, e) => (a(
  "UPDATE folders SET name = ?, icon = ?, color = ?, sort_order = ? WHERE id = ?",
  [e.name, e.icon, e.color, e.sort_order, e.id]
), !0));
o.handle("folders:delete", (s, e) => (a("DELETE FROM notes WHERE folder_id = ?", [e]), a("DELETE FROM folders WHERE id = ?", [e]), !0));
o.handle("notes:getAll", () => p("SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC"));
o.handle("notes:getByFolder", (s, e) => e ? p("SELECT * FROM notes WHERE folder_id = ? ORDER BY pinned DESC, updated_at DESC", [e]) : p("SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC"));
o.handle("notes:save", (s, e) => (f("SELECT id FROM notes WHERE id = ?", [e.id]) ? a(
  "UPDATE notes SET folder_id = ?, title = ?, content = ?, preview = ?, pinned = ?, updated_at = ? WHERE id = ?",
  [e.folder_id, e.title, e.content, e.preview, e.pinned, e.updated_at, e.id]
) : a(
  "INSERT INTO notes (id, folder_id, title, content, preview, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  [e.id, e.folder_id, e.title, e.content, e.preview, e.pinned, e.created_at, e.updated_at]
), e));
o.handle("notes:delete", (s, e) => (a("DELETE FROM notes WHERE id = ?", [e]), !0));
o.handle("notes:search", (s, e) => {
  const n = `%${e}%`;
  return p(
    "SELECT * FROM notes WHERE title LIKE ? OR preview LIKE ? OR content LIKE ? ORDER BY pinned DESC, updated_at DESC",
    [n, n, n]
  );
});
o.handle("images:selectAndSave", async () => {
  const s = await O.showOpenDialog(t, {
    title: "Seleccionar imagen",
    filters: [{ name: "Imágenes", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg"] }],
    properties: ["openFile"]
  });
  if (s.canceled || !s.filePaths.length) return null;
  const e = s.filePaths[0], n = d.extname(e), r = `${H()}${n}`, L = d.join(m, r);
  return E.copyFileSync(e, L), `file:///${L.replace(/\\/g, "/")}`;
});
o.handle("data:export", async () => {
  const s = await O.showSaveDialog(t, {
    title: "Exportar datos de CyberNotes",
    defaultPath: "cybernotes-export.json",
    filters: [{ name: "JSON", extensions: ["json"] }]
  });
  if (s.canceled || !s.filePath) return !1;
  const e = p("SELECT * FROM folders"), n = p("SELECT * FROM notes"), r = { folders: e, notes: n, version: 1 };
  return E.writeFileSync(s.filePath, JSON.stringify(r, null, 2)), !0;
});
o.handle("data:import", async () => {
  const s = await O.showOpenDialog(t, {
    title: "Importar datos a CyberNotes",
    filters: [{ name: "JSON", extensions: ["json"] }],
    properties: ["openFile"]
  });
  if (s.canceled || !s.filePaths.length) return !1;
  try {
    const e = JSON.parse(E.readFileSync(s.filePaths[0], "utf-8"));
    if (!e.folders || !e.notes) return !1;
    const n = S + ".backup-" + Date.now();
    E.existsSync(S) && E.copyFileSync(S, n);
    for (const r of e.folders)
      a(
        "INSERT OR REPLACE INTO folders (id, name, icon, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [r.id, r.name, r.icon, r.color, r.sort_order, r.created_at]
      );
    for (const r of e.notes)
      a(
        "INSERT OR REPLACE INTO notes (id, folder_id, title, content, preview, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [r.id, r.folder_id, r.title, r.content, r.preview, r.pinned, r.created_at, r.updated_at]
      );
    return !0;
  } catch (e) {
    return console.error("Import error:", e), !1;
  }
});
const q = l.requestSingleInstanceLock();
q ? (l.on("second-instance", (s, e, n) => {
  t && (t.isMinimized() && t.restore(), t.show(), t.focus());
}), l.whenReady().then(async () => {
  D.defaultSession.setSpellCheckerLanguages(["es-ES", "en-US"]), await B(), N(), X(), l.on("activate", () => {
    F.getAllWindows().length === 0 ? N() : t == null || t.show();
  });
}), l.on("window-all-closed", () => {
  process.platform !== "darwin" && (u || l.quit());
})) : l.quit();
