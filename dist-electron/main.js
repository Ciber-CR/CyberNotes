import { app as l, ipcMain as r, shell as N, session as b, dialog as R, BrowserWindow as D, Tray as P, Menu as M } from "electron";
import d from "path";
import u from "fs";
import { fileURLToPath as U } from "url";
import { createRequire as j } from "module";
import { exec as H } from "child_process";
const S = d.dirname(U(import.meta.url)), C = j(import.meta.url), m = !l.isPackaged;
let g = d.join(S, "..", "public", "icon.png");
m || (g = d.join(l.getAppPath(), "dist", "icon.png"));
if (!u.existsSync(g)) {
  const s = d.join(m ? d.join(S, "..", "public") : d.join(l.getAppPath(), "dist"), "icon.ico");
  u.existsSync(s) && (g = s);
}
const F = C("bcryptjs"), v = l.getPath("userData"), T = d.join(v, "cybernotes.db"), _ = d.join(v, "images"), { v4: B } = C("uuid");
let p = null, L = null;
function x() {
  if (!p) return;
  const s = p.export();
  u.writeFileSync(T, Buffer.from(s));
}
async function q() {
  const s = m ? d.join(S, "..", "node_modules", "sql.js", "dist", "sql-wasm.wasm") : d.join(process.resourcesPath, "sql-wasm.wasm");
  if (L = await C("sql.js")({
    locateFile: () => s
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
  `), x(), u.existsSync(_) || u.mkdirSync(_, { recursive: !0 });
}
function f(s, e = []) {
  if (!p) throw new Error("Base de datos no inicializada");
  const n = p.prepare(s);
  n.bind(e);
  const o = [];
  for (; n.step(); )
    o.push(n.getAsObject());
  return n.free(), o;
}
function h(s, e = []) {
  const n = f(s, e);
  return n.length > 0 ? n[0] : null;
}
function i(s, e = []) {
  if (!p) throw new Error("Base de datos no inicializada");
  p.run(s, e), x();
}
let t = null, E = null, w = !1, O = !1;
function y() {
  if (!t) return;
  const s = h("SELECT value FROM settings WHERE key = ?", ["is_maximized"]);
  (s == null ? void 0 : s.value) === "true" && t.maximize(), t.show(), t.focus();
}
function X() {
  const s = h("SELECT value FROM settings WHERE key = ?", ["auto_unlock_caps_lock"]), e = (s == null ? void 0 : s.value) === "true";
  return [
    { label: "Abrir CyberNotes", click: y },
    { type: "separator" },
    {
      label: "Desactivar CapsLock por inactividad",
      type: "checkbox",
      checked: e,
      click: (n) => {
        const o = n.checked;
        i("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["auto_unlock_caps_lock", o ? "true" : "false"]), A(), t && !t.isDestroyed() && t.webContents.send("setting-changed", { key: "auto_unlock_caps_lock", value: o ? "true" : "false" });
      }
    },
    { type: "separator" },
    {
      label: "Salir",
      click: () => {
        w = !0, l.quit();
      }
    }
  ];
}
function A() {
  if (!(!E || E.isDestroyed()))
    try {
      const s = M.buildFromTemplate(X());
      E.setContextMenu(s);
    } catch (s) {
      console.error("Failed to update tray menu:", s);
    }
}
function z() {
  try {
    E = new P(g), A(), E.setToolTip("CyberNotes"), E.on("click", () => {
      t != null && t.isVisible() ? t.hide() : y();
    });
  } catch (s) {
    console.error("Failed to create tray:", s);
  }
}
function k() {
  const s = h("SELECT value FROM settings WHERE key = ?", ["window_bounds"]), e = h("SELECT value FROM settings WHERE key = ?", ["is_maximized"]);
  let n = { width: 1100, height: 700, x: void 0, y: void 0 };
  if (s)
    try {
      const a = JSON.parse(s.value);
      a.width > 400 && a.height > 400 && (n = a);
    } catch {
    }
  t = new D({
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
    icon: g,
    webPreferences: {
      preload: d.join(S, "preload.mjs"),
      contextIsolation: !0,
      nodeIntegration: !1,
      webSecurity: !1
    },
    show: !1
  });
  const o = () => {
    if (!t || t.isDestroyed()) return;
    const a = t.isMaximized();
    i("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["is_maximized", a ? "true" : "false"]);
    const c = t.getBounds();
    c.width > 100 && c.height > 100 && i("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["window_bounds", JSON.stringify(c)]);
  };
  t.on("resize", o), t.on("move", o), t.on("close", o), t.on("maximize", o), t.on("unmaximize", o), t.on("hide", o), t.on("close", (a) => {
    const c = h("SELECT value FROM settings WHERE key = ?", ["close_to_tray"]);
    if ((c == null ? void 0 : c.value) === "true" && !w)
      return a.preventDefault(), t == null || t.hide(), !1;
    if (O)
      return a.preventDefault(), R.showMessageBox(t, {
        type: "question",
        buttons: ["Salir sin guardar", "Cancelar"],
        defaultId: 1,
        title: "Cambios sin guardar",
        message: "Tienes cambios sin guardar en la nota actual. ¿Salir sin guardar?"
      }).then((I) => {
        I.response === 0 && (O = !1, w = !0, t == null || t.close());
      }), !1;
    E && !E.isDestroyed() && (E.destroy(), E = null);
  }), t.webContents.setWindowOpenHandler(({ url: a }) => (a.startsWith("http") && N.openExternal(a), { action: "deny" })), t.webContents.on("context-menu", (a, c) => {
    t == null || t.webContents.send("context-menu-data", {
      x: c.x,
      y: c.y,
      suggestions: c.dictionarySuggestions,
      misspelledWord: c.misspelledWord,
      linkURL: c.linkURL
    });
  }), m ? t.loadURL("http://localhost:5173") : t.loadFile(d.join(S, "../dist/index.html")), t.once("ready-to-show", () => {
    process.argv.includes("--hidden") || ((e == null ? void 0 : e.value) === "true" && (t == null || t.maximize()), t.show(), t.focus());
  });
}
r.handle("window-minimize", () => t == null ? void 0 : t.minimize());
r.handle("window-maximize-toggle", () => {
  t != null && t.isMaximized() ? t.unmaximize() : t == null || t.maximize();
});
r.handle("window-close", () => t == null ? void 0 : t.close());
r.handle("window:unsavedChanges:set", (s, e) => {
  O = e;
});
r.handle("open-dev-tools", () => t == null ? void 0 : t.webContents.openDevTools({ mode: "detach" }));
r.handle("open-data-folder", () => N.openPath(v));
r.handle("replace-misspelling", (s, e) => t == null ? void 0 : t.webContents.replaceMisspelling(e));
r.handle("add-to-dictionary", (s, e) => {
  b.defaultSession.addWordToSpellCheckerDictionary(e);
});
r.handle("unlock-caps-lock", async () => process.platform !== "win32" ? !1 : new Promise((s) => {
  const e = `
      Add-Type -AssemblyName System.Windows.Forms
      if ([System.Windows.Forms.Control]::IsKeyLocked('CapsLock')) {
        $wsh = New-Object -ComObject WScript.Shell
        $wsh.SendKeys('{CAPSLOCK}')
        echo "unlocked"
      } else {
        echo "already-off"
      }
    `.trim().replace(/\\s+/g, " ");
  H(`powershell -Command "${e}"`, (n, o) => {
    if (n)
      console.error("Failed to unlock caps lock:", n), s(!1);
    else {
      const a = o.trim();
      s(a === "unlocked");
    }
  });
}));
r.handle("auth:hasPassword", () => !!h("SELECT value FROM settings WHERE key = ?", ["password_hash"]));
r.handle("auth:setPassword", async (s, e) => {
  const n = await F.hash(e, 10);
  return i("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["password_hash", n]), !0;
});
r.handle("auth:verifyPassword", async (s, e) => {
  const n = h("SELECT value FROM settings WHERE key = ?", ["password_hash"]);
  return n ? F.compare(e, n.value) : !0;
});
r.handle("auth:removePassword", () => (i("DELETE FROM settings WHERE key = ?", ["password_hash"]), !0));
r.handle("settings:get", (s, e) => {
  const n = h("SELECT value FROM settings WHERE key = ?", [e]);
  return n ? n.value : null;
});
r.handle("settings:set", (s, e, n) => (i("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [e, n]), e === "auto_unlock_caps_lock" && A(), !0));
r.handle("settings:setAutoStart", (s, e) => (l.setLoginItemSettings({
  openAtLogin: e,
  openAsHidden: !0,
  // macOS
  args: e ? ["--hidden"] : []
  // Windows / Linux
}), i("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["auto_start", e ? "true" : "false"]), !0));
r.handle("settings:getAutoStart", () => l.getLoginItemSettings().openAtLogin);
r.handle("folders:getAll", () => f("SELECT * FROM folders ORDER BY name COLLATE NOCASE ASC"));
r.handle("folders:create", (s, e) => (i(
  "INSERT INTO folders (id, name, icon, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  [e.id, e.name, e.icon, e.color, e.sort_order, e.created_at]
), e));
r.handle("folders:update", (s, e) => (i(
  "UPDATE folders SET name = ?, icon = ?, color = ?, sort_order = ? WHERE id = ?",
  [e.name, e.icon, e.color, e.sort_order, e.id]
), !0));
r.handle("folders:delete", (s, e) => (i("DELETE FROM notes WHERE folder_id = ?", [e]), i("DELETE FROM folders WHERE id = ?", [e]), !0));
r.handle("notes:getAll", () => f("SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC"));
r.handle("notes:getByFolder", (s, e) => e ? f("SELECT * FROM notes WHERE folder_id = ? ORDER BY pinned DESC, updated_at DESC", [e]) : f("SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC"));
r.handle("notes:save", (s, e) => (h("SELECT id FROM notes WHERE id = ?", [e.id]) ? i(
  "UPDATE notes SET folder_id = ?, title = ?, content = ?, preview = ?, pinned = ?, updated_at = ? WHERE id = ?",
  [e.folder_id, e.title, e.content, e.preview, e.pinned, e.updated_at, e.id]
) : i(
  "INSERT INTO notes (id, folder_id, title, content, preview, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  [e.id, e.folder_id, e.title, e.content, e.preview, e.pinned, e.created_at, e.updated_at]
), e));
r.handle("notes:delete", (s, e) => (i("DELETE FROM notes WHERE id = ?", [e]), !0));
r.handle("notes:search", (s, e) => {
  const n = `%${e}%`;
  return f(
    "SELECT * FROM notes WHERE title LIKE ? OR preview LIKE ? OR content LIKE ? ORDER BY pinned DESC, updated_at DESC",
    [n, n, n]
  );
});
r.handle("images:selectAndSave", async () => {
  const s = await R.showOpenDialog(t, {
    title: "Seleccionar imagen",
    filters: [{ name: "Imágenes", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg"] }],
    properties: ["openFile"]
  });
  if (s.canceled || !s.filePaths.length) return null;
  const e = s.filePaths[0], n = d.extname(e), o = `${B()}${n}`, a = d.join(_, o);
  return u.copyFileSync(e, a), `file:///${a.replace(/\\/g, "/")}`;
});
r.handle("data:export", async () => {
  const s = await R.showSaveDialog(t, {
    title: "Exportar datos de CyberNotes",
    defaultPath: "cybernotes-export.json",
    filters: [{ name: "JSON", extensions: ["json"] }]
  });
  if (s.canceled || !s.filePath) return !1;
  const e = f("SELECT * FROM folders"), n = f("SELECT * FROM notes"), o = { folders: e, notes: n, version: 1 };
  return u.writeFileSync(s.filePath, JSON.stringify(o, null, 2)), !0;
});
r.handle("data:import", async () => {
  const s = await R.showOpenDialog(t, {
    title: "Importar datos a CyberNotes",
    filters: [{ name: "JSON", extensions: ["json"] }],
    properties: ["openFile"]
  });
  if (s.canceled || !s.filePaths.length) return !1;
  try {
    const e = JSON.parse(u.readFileSync(s.filePaths[0], "utf-8"));
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
W ? (l.on("second-instance", (s, e, n) => {
  y();
}), l.whenReady().then(async () => {
  b.defaultSession.setSpellCheckerLanguages(["es-ES", "en-US"]), await q(), k(), z(), l.on("activate", () => {
    D.getAllWindows().length === 0 ? k() : y();
  });
}), l.on("window-all-closed", () => {
  process.platform !== "darwin" && (E || l.quit());
})) : l.quit();
