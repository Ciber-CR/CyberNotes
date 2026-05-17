import { app as l, ipcMain as r, shell as N, session as D, dialog as m, BrowserWindow as b, Tray as P, Menu as k } from "electron";
import d from "path";
import u from "fs";
import { fileURLToPath as U } from "url";
import { createRequire as M } from "module";
import { exec as j } from "child_process";
const S = d.dirname(U(import.meta.url)), C = M(import.meta.url), y = !l.isPackaged;
let g = d.join(S, "..", "public", "icon.png");
y || (g = d.join(l.getAppPath(), "dist", "icon.png"));
if (!u.existsSync(g)) {
  const s = d.join(y ? d.join(S, "..", "public") : d.join(l.getAppPath(), "dist"), "icon.ico");
  u.existsSync(s) && (g = s);
}
const F = C("bcryptjs"), A = l.getPath("userData"), T = d.join(A, "cybernotes.db"), w = d.join(A, "images"), { v4: H } = C("uuid");
let h = null, L = null;
function x() {
  if (!h) return;
  const s = h.export();
  u.writeFileSync(T, Buffer.from(s));
}
async function B() {
  const s = y ? d.join(S, "..", "node_modules", "sql.js", "dist", "sql-wasm.wasm") : d.join(process.resourcesPath, "sql-wasm.wasm");
  if (L = await C("sql.js")({
    locateFile: () => s
  }), u.existsSync(T)) {
    const n = u.readFileSync(T);
    h = new L.Database(n);
  } else
    h = new L.Database();
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
  `), x(), u.existsSync(w) || u.mkdirSync(w, { recursive: !0 });
}
function f(s, e = []) {
  if (!h) throw new Error("Base de datos no inicializada");
  const n = h.prepare(s);
  n.bind(e);
  const o = [];
  for (; n.step(); )
    o.push(n.getAsObject());
  return n.free(), o;
}
function p(s, e = []) {
  const n = f(s, e);
  return n.length > 0 ? n[0] : null;
}
function a(s, e = []) {
  if (!h) throw new Error("Base de datos no inicializada");
  h.run(s, e), x();
}
let t = null, E = null, O = !1, _ = !1;
function R() {
  if (!t) return;
  const s = p("SELECT value FROM settings WHERE key = ?", ["is_maximized"]);
  (s == null ? void 0 : s.value) === "true" && t.maximize(), t.show(), t.focus();
}
function q() {
  try {
    E = new P(g);
    const s = k.buildFromTemplate([
      { label: "Abrir CyberNotes", click: R },
      { type: "separator" },
      {
        label: "Salir",
        click: () => {
          O = !0, l.quit();
        }
      }
    ]);
    E.setToolTip("CyberNotes"), E.setContextMenu(s), E.on("click", () => {
      t != null && t.isVisible() ? t.hide() : R();
    });
  } catch (s) {
    console.error("Failed to create tray:", s);
  }
}
function v() {
  const s = p("SELECT value FROM settings WHERE key = ?", ["window_bounds"]), e = p("SELECT value FROM settings WHERE key = ?", ["is_maximized"]);
  let n = { width: 1100, height: 700, x: void 0, y: void 0 };
  if (s)
    try {
      const i = JSON.parse(s.value);
      i.width > 400 && i.height > 400 && (n = i);
    } catch {
    }
  t = new b({
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
    const i = t.isMaximized();
    a("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["is_maximized", i ? "true" : "false"]);
    const c = t.getBounds();
    c.width > 100 && c.height > 100 && a("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["window_bounds", JSON.stringify(c)]);
  };
  t.on("resize", o), t.on("move", o), t.on("close", o), t.on("maximize", o), t.on("unmaximize", o), t.on("hide", o), t.on("close", (i) => {
    const c = p("SELECT value FROM settings WHERE key = ?", ["close_to_tray"]);
    if ((c == null ? void 0 : c.value) === "true" && !O)
      return i.preventDefault(), t == null || t.hide(), !1;
    if (_)
      return i.preventDefault(), m.showMessageBox(t, {
        type: "question",
        buttons: ["Salir sin guardar", "Cancelar"],
        defaultId: 1,
        title: "Cambios sin guardar",
        message: "Tienes cambios sin guardar en la nota actual. ¿Salir sin guardar?"
      }).then((I) => {
        I.response === 0 && (_ = !1, O = !0, t == null || t.close());
      }), !1;
    E && !E.isDestroyed() && (E.destroy(), E = null);
  }), t.webContents.setWindowOpenHandler(({ url: i }) => (i.startsWith("http") && N.openExternal(i), { action: "deny" })), t.webContents.on("context-menu", (i, c) => {
    t == null || t.webContents.send("context-menu-data", {
      x: c.x,
      y: c.y,
      suggestions: c.dictionarySuggestions,
      misspelledWord: c.misspelledWord,
      linkURL: c.linkURL
    });
  }), y ? t.loadURL("http://localhost:5173") : t.loadFile(d.join(S, "../dist/index.html")), t.once("ready-to-show", () => {
    process.argv.includes("--hidden") || ((e == null ? void 0 : e.value) === "true" && (t == null || t.maximize()), t.show(), t.focus());
  });
}
r.handle("window-minimize", () => t == null ? void 0 : t.minimize());
r.handle("window-maximize-toggle", () => {
  t != null && t.isMaximized() ? t.unmaximize() : t == null || t.maximize();
});
r.handle("window-close", () => t == null ? void 0 : t.close());
r.handle("window:unsavedChanges:set", (s, e) => {
  _ = e;
});
r.handle("open-dev-tools", () => t == null ? void 0 : t.webContents.openDevTools({ mode: "detach" }));
r.handle("open-data-folder", () => N.openPath(A));
r.handle("replace-misspelling", (s, e) => t == null ? void 0 : t.webContents.replaceMisspelling(e));
r.handle("add-to-dictionary", (s, e) => {
  D.defaultSession.addWordToSpellCheckerDictionary(e);
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
  j(`powershell -Command "${e}"`, (n, o) => {
    if (n)
      console.error("Failed to unlock caps lock:", n), s(!1);
    else {
      const i = o.trim();
      s(i === "unlocked");
    }
  });
}));
r.handle("auth:hasPassword", () => !!p("SELECT value FROM settings WHERE key = ?", ["password_hash"]));
r.handle("auth:setPassword", async (s, e) => {
  const n = await F.hash(e, 10);
  return a("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["password_hash", n]), !0;
});
r.handle("auth:verifyPassword", async (s, e) => {
  const n = p("SELECT value FROM settings WHERE key = ?", ["password_hash"]);
  return n ? F.compare(e, n.value) : !0;
});
r.handle("auth:removePassword", () => (a("DELETE FROM settings WHERE key = ?", ["password_hash"]), !0));
r.handle("settings:get", (s, e) => {
  const n = p("SELECT value FROM settings WHERE key = ?", [e]);
  return n ? n.value : null;
});
r.handle("settings:set", (s, e, n) => (a("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [e, n]), !0));
r.handle("settings:setAutoStart", (s, e) => (l.setLoginItemSettings({
  openAtLogin: e,
  openAsHidden: !0,
  // macOS
  args: e ? ["--hidden"] : []
  // Windows / Linux
}), a("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["auto_start", e ? "true" : "false"]), !0));
r.handle("settings:getAutoStart", () => l.getLoginItemSettings().openAtLogin);
r.handle("folders:getAll", () => f("SELECT * FROM folders ORDER BY name COLLATE NOCASE ASC"));
r.handle("folders:create", (s, e) => (a(
  "INSERT INTO folders (id, name, icon, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  [e.id, e.name, e.icon, e.color, e.sort_order, e.created_at]
), e));
r.handle("folders:update", (s, e) => (a(
  "UPDATE folders SET name = ?, icon = ?, color = ?, sort_order = ? WHERE id = ?",
  [e.name, e.icon, e.color, e.sort_order, e.id]
), !0));
r.handle("folders:delete", (s, e) => (a("DELETE FROM notes WHERE folder_id = ?", [e]), a("DELETE FROM folders WHERE id = ?", [e]), !0));
r.handle("notes:getAll", () => f("SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC"));
r.handle("notes:getByFolder", (s, e) => e ? f("SELECT * FROM notes WHERE folder_id = ? ORDER BY pinned DESC, updated_at DESC", [e]) : f("SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC"));
r.handle("notes:save", (s, e) => (p("SELECT id FROM notes WHERE id = ?", [e.id]) ? a(
  "UPDATE notes SET folder_id = ?, title = ?, content = ?, preview = ?, pinned = ?, updated_at = ? WHERE id = ?",
  [e.folder_id, e.title, e.content, e.preview, e.pinned, e.updated_at, e.id]
) : a(
  "INSERT INTO notes (id, folder_id, title, content, preview, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  [e.id, e.folder_id, e.title, e.content, e.preview, e.pinned, e.created_at, e.updated_at]
), e));
r.handle("notes:delete", (s, e) => (a("DELETE FROM notes WHERE id = ?", [e]), !0));
r.handle("notes:search", (s, e) => {
  const n = `%${e}%`;
  return f(
    "SELECT * FROM notes WHERE title LIKE ? OR preview LIKE ? OR content LIKE ? ORDER BY pinned DESC, updated_at DESC",
    [n, n, n]
  );
});
r.handle("images:selectAndSave", async () => {
  const s = await m.showOpenDialog(t, {
    title: "Seleccionar imagen",
    filters: [{ name: "Imágenes", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg"] }],
    properties: ["openFile"]
  });
  if (s.canceled || !s.filePaths.length) return null;
  const e = s.filePaths[0], n = d.extname(e), o = `${H()}${n}`, i = d.join(w, o);
  return u.copyFileSync(e, i), `file:///${i.replace(/\\/g, "/")}`;
});
r.handle("data:export", async () => {
  const s = await m.showSaveDialog(t, {
    title: "Exportar datos de CyberNotes",
    defaultPath: "cybernotes-export.json",
    filters: [{ name: "JSON", extensions: ["json"] }]
  });
  if (s.canceled || !s.filePath) return !1;
  const e = f("SELECT * FROM folders"), n = f("SELECT * FROM notes"), o = { folders: e, notes: n, version: 1 };
  return u.writeFileSync(s.filePath, JSON.stringify(o, null, 2)), !0;
});
r.handle("data:import", async () => {
  const s = await m.showOpenDialog(t, {
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
      a(
        "INSERT OR REPLACE INTO folders (id, name, icon, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [o.id, o.name, o.icon, o.color, o.sort_order, o.created_at]
      );
    for (const o of e.notes)
      a(
        "INSERT OR REPLACE INTO notes (id, folder_id, title, content, preview, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [o.id, o.folder_id, o.title, o.content, o.preview, o.pinned, o.created_at, o.updated_at]
      );
    return !0;
  } catch (e) {
    return console.error("Import error:", e), !1;
  }
});
const X = l.requestSingleInstanceLock();
X ? (l.on("second-instance", (s, e, n) => {
  R();
}), l.whenReady().then(async () => {
  D.defaultSession.setSpellCheckerLanguages(["es-ES", "en-US"]), await B(), v(), q(), l.on("activate", () => {
    b.getAllWindows().length === 0 ? v() : R();
  });
}), l.on("window-all-closed", () => {
  process.platform !== "darwin" && (E || l.quit());
})) : l.quit();
