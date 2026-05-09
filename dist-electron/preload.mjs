"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("cyberNotesAPI", {
  // -- Ventana --
  windowMinimize: () => electron.ipcRenderer.invoke("window-minimize"),
  windowMaximizeToggle: () => electron.ipcRenderer.invoke("window-maximize-toggle"),
  windowClose: () => electron.ipcRenderer.invoke("window-close"),
  openDevTools: () => electron.ipcRenderer.invoke("open-dev-tools"),
  openDataFolder: () => electron.ipcRenderer.invoke("open-data-folder"),
  replaceMisspelling: (word) => electron.ipcRenderer.invoke("replace-misspelling", word),
  addToDictionary: (word) => electron.ipcRenderer.invoke("add-to-dictionary", word),
  onContextMenuData: (callback) => {
    const listener = (_e, data) => callback(data);
    electron.ipcRenderer.on("context-menu-data", listener);
    return () => electron.ipcRenderer.removeListener("context-menu-data", listener);
  },
  onStatusBarUrl: (callback) => {
    const listener = (_e, url) => callback(url);
    electron.ipcRenderer.on("status-bar-url", listener);
    return () => electron.ipcRenderer.removeListener("status-bar-url", listener);
  },
  // -- Auth --
  hasPassword: () => electron.ipcRenderer.invoke("auth:hasPassword"),
  setPassword: (password) => electron.ipcRenderer.invoke("auth:setPassword", password),
  verifyPassword: (password) => electron.ipcRenderer.invoke("auth:verifyPassword", password),
  removePassword: () => electron.ipcRenderer.invoke("auth:removePassword"),
  // -- Settings --
  getSetting: (key) => electron.ipcRenderer.invoke("settings:get", key),
  setSetting: (key, value) => electron.ipcRenderer.invoke("settings:set", key, value),
  // -- Folders --
  getFolders: () => electron.ipcRenderer.invoke("folders:getAll"),
  createFolder: (folder) => electron.ipcRenderer.invoke("folders:create", folder),
  updateFolder: (folder) => electron.ipcRenderer.invoke("folders:update", folder),
  deleteFolder: (id) => electron.ipcRenderer.invoke("folders:delete", id),
  // -- Notes --
  getAllNotes: () => electron.ipcRenderer.invoke("notes:getAll"),
  getNotesByFolder: (folderId) => electron.ipcRenderer.invoke("notes:getByFolder", folderId),
  saveNote: (note) => electron.ipcRenderer.invoke("notes:save", note),
  deleteNote: (id) => electron.ipcRenderer.invoke("notes:delete", id),
  searchNotes: (query) => electron.ipcRenderer.invoke("notes:search", query),
  // -- Images --
  selectAndSaveImage: () => electron.ipcRenderer.invoke("images:selectAndSave"),
  // -- Import / Export --
  exportData: () => electron.ipcRenderer.invoke("data:export"),
  importData: () => electron.ipcRenderer.invoke("data:import")
});
