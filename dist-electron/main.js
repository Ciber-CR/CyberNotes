import { app as l, ipcMain as r, shell as N, session as b, dialog as m, BrowserWindow as D, Tray as M, Menu as U } from "electron";
import d from "path";
import u from "fs";
import { fileURLToPath as j } from "url";
import { createRequire as H } from "module";
import { exec as F } from "child_process";
const S = d.dirname(j(import.meta.url)), C = H(import.meta.url), R = !l.isPackaged;
let y = d.join(S, "..", "public", "icon.png");
R || (y = d.join(l.getAppPath(), "dist", "icon.png"));
if (!u.existsSync(y)) {
  const t = d.join(R ? d.join(S, "..", "public") : d.join(l.getAppPath(), "dist"), "icon.ico");
  u.existsSync(t) && (y = t);
}
const I = C("bcryptjs"), k = l.getPath("userData"), T = d.join(k, "cybernotes.db"), w = d.join(k, "images"), { v4: B } = C("uuid");
let p = null, L = null;
function x() {
  if (!p) return;
  const t = p.export();
  u.writeFileSync(T, Buffer.from(t));
}
async function q() {
  const t = R ? d.join(S, "..", "node_modules", "sql.js", "dist", "sql-wasm.wasm") : d.join(process.resourcesPath, "sql-wasm.wasm");
  if (L = await C("sql.js")({
    locateFile: () => t
  }), u.existsSync(T)) {
    const n = u.readFileSync(T);
    p = new L.Database(n);
  } else
    p = new L.Database();
  p.run(`
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
  `), x(), u.existsSync(w) || u.mkdirSync(w, { recursive: !0 });
}
function h(t, e = []) {
  if (!p) throw new Error("Base de datos no inicializada");
  const n = p.prepare(t);
  n.bind(e);
  const o = [];
  for (; n.step(); )
    o.push(n.getAsObject());
  return n.free(), o;
}
function f(t, e = []) {
  const n = h(t, e);
  return n.length > 0 ? n[0] : null;
}
function i(t, e = []) {
  if (!p) throw new Error("Base de datos no inicializada");
  p.run(t, e), x();
}
let s = null, E = null, _ = !1, O = !1;
function g() {
  if (!s) return;
  const t = f("SELECT value FROM settings WHERE key = ?", ["is_maximized"]);
  (t == null ? void 0 : t.value) === "true" && s.maximize(), s.show(), s.focus();
}
function X() {
  const t = f("SELECT value FROM settings WHERE key = ?", ["auto_unlock_caps_lock"]), e = (t == null ? void 0 : t.value) === "true";
  return [
    { label: "Abrir CyberNotes", click: g },
    { type: "separator" },
    {
      label: "Desactivar CapsLock por inactividad",
      type: "checkbox",
      checked: e,
      click: (n) => {
        const o = n.checked;
        i("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["auto_unlock_caps_lock", o ? "true" : "false"]), v(), s && !s.isDestroyed() && s.webContents.send("setting-changed", { key: "auto_unlock_caps_lock", value: o ? "true" : "false" });
      }
    },
    { type: "separator" },
    {
      label: "Salir",
      click: () => {
        _ = !0, l.quit();
      }
    }
  ];
}
function v() {
  if (!(!E || E.isDestroyed()))
    try {
      const t = U.buildFromTemplate(X());
      E.setContextMenu(t);
    } catch (t) {
      console.error("Failed to update tray menu:", t);
    }
}
function z() {
  try {
    E = new M(y), v(), E.setToolTip("CyberNotes"), E.on("click", () => {
      s != null && s.isVisible() ? s.hide() : g();
    });
  } catch (t) {
    console.error("Failed to create tray:", t);
  }
}
function A() {
  const t = f("SELECT value FROM settings WHERE key = ?", ["window_bounds"]), e = f("SELECT value FROM settings WHERE key = ?", ["is_maximized"]);
  let n = { width: 1100, height: 700, x: void 0, y: void 0 };
  if (t)
    try {
      const a = JSON.parse(t.value);
      a.width > 400 && a.height > 400 && (n = a);
    } catch {
    }
  s = new D({
    width: n.width,
    height: n.height,
    x: n.x,
    y: n.y,
    center: !n.x,
    minWidth: 900,
    minHeight: 600,
    frame: !1,
    titleBarStyle: "hidden",
    backgroundColor: "#0d0d14",
    icon: y,
    webPreferences: {
      preload: d.join(S, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1,
      webSecurity: !1
    },
    show: !1
  });
  const o = () => {
    if (!s || s.isDestroyed()) return;
    const a = s.isMaximized();
    i("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["is_maximized", a ? "true" : "false"]);
    const c = s.getBounds();
    c.width > 100 && c.height > 100 && i("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["window_bounds", JSON.stringify(c)]);
  };
  s.on("resize", o), s.on("move", o), s.on("close", o), s.on("maximize", o), s.on("unmaximize", o), s.on("hide", o), s.on("close", (a) => {
    const c = f("SELECT value FROM settings WHERE key = ?", ["close_to_tray"]);
    if ((c == null ? void 0 : c.value) === "true" && !_)
      return a.preventDefault(), s == null || s.hide(), !1;
    if (O)
      return a.preventDefault(), m.showMessageBox(s, {
        type: "question",
        buttons: ["Salir sin guardar", "Cancelar"],
        defaultId: 1,
        title: "Cambios sin guardar",
        message: "Tienes cambios sin guardar en la nota actual. ¿Salir sin guardar?"
      }).then((P) => {
        P.response === 0 && (O = !1, _ = !0, s == null || s.close());
      }), !1;
    E && !E.isDestroyed() && (E.destroy(), E = null);
  }), s.webContents.setWindowOpenHandler(({ url: a }) => (a.startsWith("http") && N.openExternal(a), { action: "deny" })), s.webContents.on("context-menu", (a, c) => {
    s == null || s.webContents.send("context-menu-data", {
      x: c.x,
      y: c.y,
      suggestions: c.dictionarySuggestions,
      misspelledWord: c.misspelledWord,
      linkURL: c.linkURL
    });
  }), R ? s.loadURL("http://localhost:5173") : s.loadFile(d.join(S, "../dist/index.html")), s.once("ready-to-show", () => {
    process.argv.includes("--hidden") || ((e == null ? void 0 : e.value) === "true" && (s == null || s.maximize()), s.show(), s.focus());
  });
}
r.handle("window-minimize", () => s == null ? void 0 : s.minimize());
r.handle("window-maximize-toggle", () => {
  s != null && s.isMaximized() ? s.unmaximize() : s == null || s.maximize();
});
r.handle("window-close", () => s == null ? void 0 : s.close());
r.handle("window:unsavedChanges:set", (t, e) => {
  O = e;
});
r.handle("open-dev-tools", () => s == null ? void 0 : s.webContents.openDevTools({ mode: "detach" }));
r.handle("open-data-folder", () => N.openPath(k));
r.handle("replace-misspelling", (t, e) => s == null ? void 0 : s.webContents.replaceMisspelling(e));
r.handle("add-to-dictionary", (t, e) => {
  b.defaultSession.addWordToSpellCheckerDictionary(e);
});
r.handle("unlock-caps-lock", async () => process.platform !== "win32" ? !1 : new Promise((t) => {
  F(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; if ([System.Windows.Forms.Control]::IsKeyLocked('CapsLock')) { (New-Object -ComObject WScript.Shell).SendKeys('{CAPSLOCK}'); Write-Host 'unlocked' } else { Write-Host 'already-off' }"`, (n, o) => {
    if (n)
      console.error("Failed to unlock caps lock:", n), t(!1);
    else {
      const a = o.trim();
      t(a === "unlocked" || a === "already-off");
    }
  });
}));
r.handle("check-caps-lock", async () => process.platform !== "win32" ? !1 : new Promise((t) => {
  F(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Control]::IsKeyLocked('CapsLock')"`, (n, o) => {
    t(n ? !1 : o.trim().toLowerCase() === "true");
  });
}));
r.handle("auth:hasPassword", () => !!f("SELECT value FROM settings WHERE key = ?", ["password_hash"]));
r.handle("auth:setPassword", async (t, e) => {
  const n = await I.hash(e, 10);
  return i("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["password_hash", n]), !0;
});
r.handle("auth:verifyPassword", async (t, e) => {
  const n = f("SELECT value FROM settings WHERE key = ?", ["password_hash"]);
  return n ? I.compare(e, n.value) : !0;
});
r.handle("auth:removePassword", () => (i("DELETE FROM settings WHERE key = ?", ["password_hash"]), !0));
r.handle("settings:get", (t, e) => {
  const n = f("SELECT value FROM settings WHERE key = ?", [e]);
  return n ? n.value : null;
});
r.handle("settings:set", (t, e, n) => (i("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [e, n]), e === "auto_unlock_caps_lock" && v(), !0));
r.handle("settings:setAutoStart", (t, e) => (l.setLoginItemSettings({
  openAtLogin: e,
  openAsHidden: !0,
  // macOS
  args: e ? ["--hidden"] : []
  // Windows / Linux
}), i("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["auto_start", e ? "true" : "false"]), !0));
r.handle("settings:getAutoStart", () => l.getLoginItemSettings().openAtLogin);
r.handle("folders:getAll", () => h("SELECT * FROM folders ORDER BY name COLLATE NOCASE ASC"));
r.handle("folders:create", (t, e) => (i(
  "INSERT INTO folders (id, name, icon, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  [e.id, e.name, e.icon, e.color, e.sort_order, e.created_at]
), e));
r.handle("folders:update", (t, e) => (i(
  "UPDATE folders SET name = ?, icon = ?, color = ?, sort_order = ? WHERE id = ?",
  [e.name, e.icon, e.color, e.sort_order, e.id]
), !0));
r.handle("folders:delete", (t, e) => (i("DELETE FROM notes WHERE folder_id = ?", [e]), i("DELETE FROM folders WHERE id = ?", [e]), !0));
r.handle("notes:getAll", () => h("SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC"));
r.handle("notes:getByFolder", (t, e) => e ? h("SELECT * FROM notes WHERE folder_id = ? ORDER BY pinned DESC, updated_at DESC", [e]) : h("SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC"));
r.handle("notes:save", (t, e) => (f("SELECT id FROM notes WHERE id = ?", [e.id]) ? i(
  "UPDATE notes SET folder_id = ?, title = ?, content = ?, preview = ?, pinned = ?, updated_at = ? WHERE id = ?",
  [e.folder_id, e.title, e.content, e.preview, e.pinned, e.updated_at, e.id]
) : i(
  "INSERT INTO notes (id, folder_id, title, content, preview, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  [e.id, e.folder_id, e.title, e.content, e.preview, e.pinned, e.created_at, e.updated_at]
), e));
r.handle("notes:delete", (t, e) => (i("DELETE FROM notes WHERE id = ?", [e]), !0));
r.handle("notes:search", (t, e) => {
  const n = `%${e}%`;
  return h(
    "SELECT * FROM notes WHERE title LIKE ? OR preview LIKE ? OR content LIKE ? ORDER BY pinned DESC, updated_at DESC",
    [n, n, n]
  );
});
r.handle("images:selectAndSave", async () => {
  const t = await m.showOpenDialog(s, {
    title: "Seleccionar imagen",
    filters: [{ name: "Imágenes", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg"] }],
    properties: ["openFile"]
  });
  if (t.canceled || !t.filePaths.length) return null;
  const e = t.filePaths[0], n = d.extname(e), o = `${B()}${n}`, a = d.join(w, o);
  return u.copyFileSync(e, a), `file:///${a.replace(/\\/g, "/")}`;
});
r.handle("data:export", async () => {
  const t = await m.showSaveDialog(s, {
    title: "Exportar datos de CyberNotes",
    defaultPath: "cybernotes-export.json",
    filters: [{ name: "JSON", extensions: ["json"] }]
  });
  if (t.canceled || !t.filePath) return !1;
  const e = h("SELECT * FROM folders"), n = h("SELECT * FROM notes"), o = { folders: e, notes: n, version: 1 };
  return u.writeFileSync(t.filePath, JSON.stringify(o, null, 2)), !0;
});
r.handle("data:import", async () => {
  const t = await m.showOpenDialog(s, {
    title: "Importar datos a CyberNotes",
    filters: [{ name: "JSON", extensions: ["json"] }],
    properties: ["openFile"]
  });
  if (t.canceled || !t.filePaths.length) return !1;
  try {
    const e = JSON.parse(u.readFileSync(t.filePaths[0], "utf-8"));
    if (!e.folders || !e.notes) return !1;
    const n = T + ".backup-" + Date.now();
    u.existsSync(T) && u.copyFileSync(T, n);
    for (const o of e.folders)
      i(
        "INSERT OR REPLACE INTO folders (id, name, icon, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [o.id, o.name, o.icon, o.color, o.sort_order, o.created_at]
      );
    for (const o of e.notes)
      i(
        "INSERT OR REPLACE INTO notes (id, folder_id, title, content, preview, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [o.id, o.folder_id, o.title, o.content, o.preview, o.pinned, o.created_at, o.updated_at]
      );
    return !0;
  } catch (e) {
    return console.error("Import error:", e), !1;
  }
});
const W = l.requestSingleInstanceLock();
W ? (l.on("second-instance", (t, e, n) => {
  g();
}), l.whenReady().then(async () => {
  b.defaultSession.setSpellCheckerLanguages(["es-ES", "en-US"]), await q(), A(), z(), l.on("activate", () => {
    D.getAllWindows().length === 0 ? A() : g();
  });
}), l.on("window-all-closed", () => {
  process.platform !== "darwin" && (E || l.quit());
})) : l.quit();
