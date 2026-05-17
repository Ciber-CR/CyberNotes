import { app as l, ipcMain as o, shell as N, session as D, dialog as L, BrowserWindow as b, Tray as P, Menu as k } from "electron";
import d from "path";
import u from "fs";
import { fileURLToPath as U } from "url";
import { createRequire as M } from "module";
const g = d.dirname(U(import.meta.url)), v = M(import.meta.url), y = !l.isPackaged;
let S = d.join(g, "..", "public", "icon.png");
y || (S = d.join(l.getAppPath(), "dist", "icon.png"));
if (!u.existsSync(S)) {
  const n = d.join(y ? d.join(g, "..", "public") : d.join(l.getAppPath(), "dist"), "icon.ico");
  u.existsSync(n) && (S = n);
}
const x = v("bcryptjs"), C = l.getPath("userData"), T = d.join(C, "cybernotes.db"), w = d.join(C, "images"), { v4: j } = v("uuid");
let h = null, m = null;
function F() {
  if (!h) return;
  const n = h.export();
  u.writeFileSync(T, Buffer.from(n));
}
async function H() {
  const n = y ? d.join(g, "..", "node_modules", "sql.js", "dist", "sql-wasm.wasm") : d.join(process.resourcesPath, "sql-wasm.wasm");
  if (m = await v("sql.js")({
    locateFile: () => n
  }), u.existsSync(T)) {
    const s = u.readFileSync(T);
    h = new m.Database(s);
  } else
    h = new m.Database();
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
  `), F(), u.existsSync(w) || u.mkdirSync(w, { recursive: !0 });
}
function p(n, e = []) {
  if (!h) throw new Error("Base de datos no inicializada");
  const s = h.prepare(n);
  s.bind(e);
  const i = [];
  for (; s.step(); )
    i.push(s.getAsObject());
  return s.free(), i;
}
function f(n, e = []) {
  const s = p(n, e);
  return s.length > 0 ? s[0] : null;
}
function a(n, e = []) {
  if (!h) throw new Error("Base de datos no inicializada");
  h.run(n, e), F();
}
let t = null, E = null, _ = !1, O = !1;
function R() {
  if (!t) return;
  const n = f("SELECT value FROM settings WHERE key = ?", ["is_maximized"]);
  (n == null ? void 0 : n.value) === "true" && t.maximize(), t.show(), t.focus();
}
function B() {
  try {
    E = new P(S);
    const n = k.buildFromTemplate([
      { label: "Abrir CyberNotes", click: R },
      { type: "separator" },
      {
        label: "Salir",
        click: () => {
          _ = !0, l.quit();
        }
      }
    ]);
    E.setToolTip("CyberNotes"), E.setContextMenu(n), E.on("click", () => {
      t != null && t.isVisible() ? t.hide() : R();
    });
  } catch (n) {
    console.error("Failed to create tray:", n);
  }
}
function A() {
  const n = f("SELECT value FROM settings WHERE key = ?", ["window_bounds"]), e = f("SELECT value FROM settings WHERE key = ?", ["is_maximized"]);
  let s = { width: 1100, height: 700, x: void 0, y: void 0 };
  if (n)
    try {
      const r = JSON.parse(n.value);
      r.width > 400 && r.height > 400 && (s = r);
    } catch {
    }
  t = new b({
    width: s.width,
    height: s.height,
    x: s.x,
    y: s.y,
    center: !s.x,
    minWidth: 900,
    minHeight: 600,
    frame: !1,
    titleBarStyle: "hidden",
    backgroundColor: "#0d0d14",
    icon: S,
    webPreferences: {
      preload: d.join(g, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1,
      webSecurity: !1
    },
    show: !1
  });
  const i = () => {
    if (!t || t.isDestroyed()) return;
    const r = t.isMaximized();
    a("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["is_maximized", r ? "true" : "false"]);
    const c = t.getBounds();
    c.width > 100 && c.height > 100 && a("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["window_bounds", JSON.stringify(c)]);
  };
  t.on("resize", i), t.on("move", i), t.on("close", i), t.on("maximize", i), t.on("unmaximize", i), t.on("hide", i), t.on("close", (r) => {
    const c = f("SELECT value FROM settings WHERE key = ?", ["close_to_tray"]);
    if ((c == null ? void 0 : c.value) === "true" && !_)
      return r.preventDefault(), t == null || t.hide(), !1;
    if (O)
      return r.preventDefault(), L.showMessageBox(t, {
        type: "question",
        buttons: ["Salir sin guardar", "Cancelar"],
        defaultId: 1,
        title: "Cambios sin guardar",
        message: "Tienes cambios sin guardar en la nota actual. ¿Salir sin guardar?"
      }).then((I) => {
        I.response === 0 && (O = !1, _ = !0, t == null || t.close());
      }), !1;
    E && !E.isDestroyed() && (E.destroy(), E = null);
  }), t.webContents.setWindowOpenHandler(({ url: r }) => (r.startsWith("http") && N.openExternal(r), { action: "deny" })), t.webContents.on("context-menu", (r, c) => {
    t == null || t.webContents.send("context-menu-data", {
      x: c.x,
      y: c.y,
      suggestions: c.dictionarySuggestions,
      misspelledWord: c.misspelledWord,
      linkURL: c.linkURL
    });
  }), y ? t.loadURL("http://localhost:5173") : t.loadFile(d.join(g, "../dist/index.html")), t.once("ready-to-show", () => {
    process.argv.includes("--hidden") || ((e == null ? void 0 : e.value) === "true" && (t == null || t.maximize()), t.show(), t.focus());
  });
}
o.handle("window-minimize", () => t == null ? void 0 : t.minimize());
o.handle("window-maximize-toggle", () => {
  t != null && t.isMaximized() ? t.unmaximize() : t == null || t.maximize();
});
o.handle("window-close", () => t == null ? void 0 : t.close());
o.handle("window:unsavedChanges:set", (n, e) => {
  O = e;
});
o.handle("open-dev-tools", () => t == null ? void 0 : t.webContents.openDevTools({ mode: "detach" }));
o.handle("open-data-folder", () => N.openPath(C));
o.handle("replace-misspelling", (n, e) => t == null ? void 0 : t.webContents.replaceMisspelling(e));
o.handle("add-to-dictionary", (n, e) => {
  D.defaultSession.addWordToSpellCheckerDictionary(e);
});
o.handle("auth:hasPassword", () => !!f("SELECT value FROM settings WHERE key = ?", ["password_hash"]));
o.handle("auth:setPassword", async (n, e) => {
  const s = await x.hash(e, 10);
  return a("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["password_hash", s]), !0;
});
o.handle("auth:verifyPassword", async (n, e) => {
  const s = f("SELECT value FROM settings WHERE key = ?", ["password_hash"]);
  return s ? x.compare(e, s.value) : !0;
});
o.handle("auth:removePassword", () => (a("DELETE FROM settings WHERE key = ?", ["password_hash"]), !0));
o.handle("settings:get", (n, e) => {
  const s = f("SELECT value FROM settings WHERE key = ?", [e]);
  return s ? s.value : null;
});
o.handle("settings:set", (n, e, s) => (a("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [e, s]), !0));
o.handle("settings:setAutoStart", (n, e) => (l.setLoginItemSettings({
  openAtLogin: e,
  openAsHidden: !0,
  // macOS
  args: e ? ["--hidden"] : []
  // Windows / Linux
}), a("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["auto_start", e ? "true" : "false"]), !0));
o.handle("settings:getAutoStart", () => l.getLoginItemSettings().openAtLogin);
o.handle("folders:getAll", () => p("SELECT * FROM folders ORDER BY name COLLATE NOCASE ASC"));
o.handle("folders:create", (n, e) => (a(
  "INSERT INTO folders (id, name, icon, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  [e.id, e.name, e.icon, e.color, e.sort_order, e.created_at]
), e));
o.handle("folders:update", (n, e) => (a(
  "UPDATE folders SET name = ?, icon = ?, color = ?, sort_order = ? WHERE id = ?",
  [e.name, e.icon, e.color, e.sort_order, e.id]
), !0));
o.handle("folders:delete", (n, e) => (a("DELETE FROM notes WHERE folder_id = ?", [e]), a("DELETE FROM folders WHERE id = ?", [e]), !0));
o.handle("notes:getAll", () => p("SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC"));
o.handle("notes:getByFolder", (n, e) => e ? p("SELECT * FROM notes WHERE folder_id = ? ORDER BY pinned DESC, updated_at DESC", [e]) : p("SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC"));
o.handle("notes:save", (n, e) => (f("SELECT id FROM notes WHERE id = ?", [e.id]) ? a(
  "UPDATE notes SET folder_id = ?, title = ?, content = ?, preview = ?, pinned = ?, updated_at = ? WHERE id = ?",
  [e.folder_id, e.title, e.content, e.preview, e.pinned, e.updated_at, e.id]
) : a(
  "INSERT INTO notes (id, folder_id, title, content, preview, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  [e.id, e.folder_id, e.title, e.content, e.preview, e.pinned, e.created_at, e.updated_at]
), e));
o.handle("notes:delete", (n, e) => (a("DELETE FROM notes WHERE id = ?", [e]), !0));
o.handle("notes:search", (n, e) => {
  const s = `%${e}%`;
  return p(
    "SELECT * FROM notes WHERE title LIKE ? OR preview LIKE ? OR content LIKE ? ORDER BY pinned DESC, updated_at DESC",
    [s, s, s]
  );
});
o.handle("images:selectAndSave", async () => {
  const n = await L.showOpenDialog(t, {
    title: "Seleccionar imagen",
    filters: [{ name: "Imágenes", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg"] }],
    properties: ["openFile"]
  });
  if (n.canceled || !n.filePaths.length) return null;
  const e = n.filePaths[0], s = d.extname(e), i = `${j()}${s}`, r = d.join(w, i);
  return u.copyFileSync(e, r), `file:///${r.replace(/\\/g, "/")}`;
});
o.handle("data:export", async () => {
  const n = await L.showSaveDialog(t, {
    title: "Exportar datos de CyberNotes",
    defaultPath: "cybernotes-export.json",
    filters: [{ name: "JSON", extensions: ["json"] }]
  });
  if (n.canceled || !n.filePath) return !1;
  const e = p("SELECT * FROM folders"), s = p("SELECT * FROM notes"), i = { folders: e, notes: s, version: 1 };
  return u.writeFileSync(n.filePath, JSON.stringify(i, null, 2)), !0;
});
o.handle("data:import", async () => {
  const n = await L.showOpenDialog(t, {
    title: "Importar datos a CyberNotes",
    filters: [{ name: "JSON", extensions: ["json"] }],
    properties: ["openFile"]
  });
  if (n.canceled || !n.filePaths.length) return !1;
  try {
    const e = JSON.parse(u.readFileSync(n.filePaths[0], "utf-8"));
    if (!e.folders || !e.notes) return !1;
    const s = T + ".backup-" + Date.now();
    u.existsSync(T) && u.copyFileSync(T, s);
    for (const i of e.folders)
      a(
        "INSERT OR REPLACE INTO folders (id, name, icon, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [i.id, i.name, i.icon, i.color, i.sort_order, i.created_at]
      );
    for (const i of e.notes)
      a(
        "INSERT OR REPLACE INTO notes (id, folder_id, title, content, preview, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [i.id, i.folder_id, i.title, i.content, i.preview, i.pinned, i.created_at, i.updated_at]
      );
    return !0;
  } catch (e) {
    return console.error("Import error:", e), !1;
  }
});
const q = l.requestSingleInstanceLock();
q ? (l.on("second-instance", (n, e, s) => {
  R();
}), l.whenReady().then(async () => {
  D.defaultSession.setSpellCheckerLanguages(["es-ES", "en-US"]), await H(), A(), B(), l.on("activate", () => {
    b.getAllWindows().length === 0 ? A() : R();
  });
}), l.on("window-all-closed", () => {
  process.platform !== "darwin" && (E || l.quit());
})) : l.quit();
