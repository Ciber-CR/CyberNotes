import { contextBridge, ipcRenderer } from 'electron';

// ─── CyberNotes API Bridge ─────────────────────────────────────────────────
// Expone funciones seguras al renderer (React)

contextBridge.exposeInMainWorld('cyberNotesAPI', {
  // -- Ventana --
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximizeToggle: () => ipcRenderer.invoke('window-maximize-toggle'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  openDevTools: () => ipcRenderer.invoke('open-dev-tools'),
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
  replaceMisspelling: (word: string) => ipcRenderer.invoke('replace-misspelling', word),
  addToDictionary: (word: string) => ipcRenderer.invoke('add-to-dictionary', word),
  onContextMenuData: (callback: (data: any) => void) => {
    const listener = (_e: any, data: any) => callback(data);
    ipcRenderer.on('context-menu-data', listener);
    return () => ipcRenderer.removeListener('context-menu-data', listener);
  },
  onStatusBarUrl: (callback: (url: string) => void) => {
    const listener = (_e: any, url: string) => callback(url);
    ipcRenderer.on('status-bar-url', listener);
    return () => ipcRenderer.removeListener('status-bar-url', listener);
  },

  // -- Auth --
  hasPassword: () => ipcRenderer.invoke('auth:hasPassword'),
  setPassword: (password: string) => ipcRenderer.invoke('auth:setPassword', password),
  verifyPassword: (password: string) => ipcRenderer.invoke('auth:verifyPassword', password),
  removePassword: () => ipcRenderer.invoke('auth:removePassword'),

  // -- Settings --
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),

  // -- Folders --
  getFolders: () => ipcRenderer.invoke('folders:getAll'),
  createFolder: (folder: any) => ipcRenderer.invoke('folders:create', folder),
  updateFolder: (folder: any) => ipcRenderer.invoke('folders:update', folder),
  deleteFolder: (id: string) => ipcRenderer.invoke('folders:delete', id),

  // -- Notes --
  getAllNotes: () => ipcRenderer.invoke('notes:getAll'),
  getNotesByFolder: (folderId: string | null) => ipcRenderer.invoke('notes:getByFolder', folderId),
  saveNote: (note: any) => ipcRenderer.invoke('notes:save', note),
  deleteNote: (id: string) => ipcRenderer.invoke('notes:delete', id),
  searchNotes: (query: string) => ipcRenderer.invoke('notes:search', query),

  // -- Images --
  selectAndSaveImage: () => ipcRenderer.invoke('images:selectAndSave'),

  // -- Import / Export --
  exportData: () => ipcRenderer.invoke('data:export'),
  importData: () => ipcRenderer.invoke('data:import'),
});
