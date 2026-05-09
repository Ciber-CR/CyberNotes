import { useState, useRef, useEffect } from 'react';
import { Folder } from '../types';
import {
  Plus, FolderOpen, Settings, Lock, Search, X,
  ChevronRight, Pencil, Trash2, FileText,
} from 'lucide-react';

interface Props {
  folders: Folder[];
  selectedFolderId: string | null;
  noteCount: number;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (name: string, icon: string, color: string) => void;
  onUpdateFolder: (folder: Folder) => void;
  onDeleteFolder: (id: string) => void;
  onOpenSettings: () => void;
  onLock: () => void;
  searchQuery: string;
  onSearch: (q: string) => void;
  onMoveNote: (noteId: string, folderId: string | null) => void;
}

const FOLDER_ICONS = ['📁', '📝', '💼', '🏠', '🚀', '💡', '🎨', '📚', '🔬', '🎯', '❤️', '⭐'];
const FOLDER_COLORS = [
  '#7c3aed', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6',
];

export default function Sidebar({
  folders, selectedFolderId, noteCount,
  onSelectFolder, onCreateFolder, onUpdateFolder, onDeleteFolder,
  onOpenSettings, onLock, searchQuery, onSearch, onMoveNote,
}: Props) {
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('📁');
  const [newFolderColor, setNewFolderColor] = useState('#7c3aed');
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [contextMenu, setContextMenu] = useState<{ folder: Folder; x: number; y: number } | null>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showNewFolder) setTimeout(() => newFolderInputRef.current?.focus(), 50);
  }, [showNewFolder]);

  // Cerrar context menu al hacer click fuera
  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim(), newFolderIcon, newFolderColor);
    setNewFolderName('');
    setNewFolderIcon('📁');
    setNewFolderColor('#7c3aed');
    setShowNewFolder(false);
  };

  const handleContextMenu = (e: React.MouseEvent, folder: Folder) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ folder, x: e.clientX, y: e.clientY });
  };

  const handleSaveEdit = () => {
    if (!editingFolder || !editingFolder.name.trim()) return;
    onUpdateFolder(editingFolder);
    setEditingFolder(null);
  };

  return (
    <div className="glass-effect sidebar-glass" style={{
      width: 'var(--sidebar-width)',
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Search */}
      <div style={{ padding: '12px 12px 8px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-muted)',
            pointerEvents: 'none',
          }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearch(e.target.value)}
            placeholder="Buscar notas..."
            className="input"
            style={{ paddingLeft: 32, paddingRight: searchQuery ? 30 : 12, fontSize: 'calc(12px * var(--ui-scale))', padding: '7px 10px 7px 32px' }}
          />
          {searchQuery && (
            <button
              className="btn-icon"
              onClick={() => onSearch('')}
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', padding: 2 }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="divider" />

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        {/* Todas las notas */}
        <button
          onClick={() => onSelectFolder(null)}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            const noteId = e.dataTransfer.getData('text/plain');
            if (noteId) onMoveNote(noteId, null);
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
             background: selectedFolderId === null && !searchQuery ? 'var(--bg-active)' : 'transparent',
            color: selectedFolderId === null && !searchQuery ? 'var(--accent-light)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 'calc(13px * var(--ui-scale))',
            fontWeight: selectedFolderId === null && !searchQuery ? 600 : 400,
            textAlign: 'left',
            transition: 'all var(--transition)',
            marginBottom: 2,
          }}
          onMouseEnter={e => { if (selectedFolderId !== null) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { if (selectedFolderId !== null) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <FileText size={15} />
          <span style={{ flex: 1 }}>Todas las notas</span>
          <span style={{
            fontSize: 'calc(11px * var(--ui-scale))',
            background: 'var(--bg-surface)',
            color: 'var(--text-muted)',
            padding: '1px 6px',
            borderRadius: 10,
          }}>{noteCount}</span>
        </button>

        {/* Separator */}
        <div style={{
          fontSize: 'calc(10px * var(--ui-scale))',
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: 1,
          padding: '12px 10px 6px',
        }}>
          Folders
        </div>

        {/* Lista de folders */}
        {folders.map(folder => (
          <button
            key={folder.id}
            onClick={() => onSelectFolder(folder.id)}
            onContextMenu={e => handleContextMenu(e, folder)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              const noteId = e.dataTransfer.getData('text/plain');
              if (noteId) onMoveNote(noteId, folder.id);
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: selectedFolderId === folder.id ? 'var(--bg-active)' : 'transparent',
              color: selectedFolderId === folder.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 'calc(13px * var(--ui-scale))',
              fontWeight: selectedFolderId === folder.id ? 500 : 400,
              textAlign: 'left',
              transition: 'all var(--transition)',
              marginBottom: 2,
              position: 'relative',
            }}
            onMouseEnter={e => { if (selectedFolderId !== folder.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (selectedFolderId !== folder.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {/* Color bar */}
            {selectedFolderId === folder.id && (
              <div style={{
                position: 'absolute',
                left: 0,
                top: '20%',
                bottom: '20%',
                width: 3,
                borderRadius: 2,
                background: folder.color,
              }} />
            )}
            <span style={{ fontSize: 'calc(15px * var(--ui-scale))' }}>{folder.icon}</span>
            <span className="truncate" style={{ flex: 1 }}>{folder.name}</span>
            <ChevronRight size={12} style={{ opacity: 0.4 }} />
          </button>
        ))}

        {/* Nueva carpeta inline */}
        {showNewFolder && (
          <div style={{
            padding: '10px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            marginTop: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <input
              ref={newFolderInputRef}
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
              placeholder="Nombre del folder"
              className="input"
              style={{ fontSize: 'calc(12px * var(--ui-scale))' }}
            />

            {/* Iconos */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {FOLDER_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setNewFolderIcon(icon)}
                  style={{
                    border: newFolderIcon === icon ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: 'var(--bg-input)',
                    borderRadius: 6,
                    padding: '3px 6px',
                    cursor: 'pointer',
                    fontSize: 'calc(14px * var(--ui-scale))',
                  }}
                >{icon}</button>
              ))}
            </div>

            {/* Colores */}
            <div style={{ display: 'flex', gap: 6 }}>
              {FOLDER_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewFolderColor(c)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: c,
                    border: newFolderColor === c ? '2px solid white' : '2px solid transparent',
                    cursor: 'pointer',
                    boxShadow: newFolderColor === c ? `0 0 6px ${c}` : 'none',
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-primary" onClick={handleCreateFolder} style={{ flex: 1, fontSize: 'calc(12px * var(--ui-scale))', padding: '6px' }}>
                Crear
              </button>
              <button className="btn btn-ghost" onClick={() => setShowNewFolder(false)} style={{ flex: 1, fontSize: 'calc(12px * var(--ui-scale))', padding: '6px' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {!showNewFolder && (
          <button
            className="btn btn-ghost"
            onClick={() => setShowNewFolder(true)}
            style={{ width: '100%', justifyContent: 'flex-start', marginTop: 4, fontSize: 'calc(12px * var(--ui-scale))', gap: 8, padding: '7px 10px' }}
          >
            <Plus size={14} />
            Nuevo folder
          </button>
        )}
      </div>

      {/* Bottom actions */}
      <div className="divider" />
      <div style={{ padding: '8px', display: 'flex', gap: 4, justifyContent: 'space-between' }}>
        <button
          className="btn btn-ghost"
          onClick={onOpenSettings}
          style={{ flex: 1, fontSize: 'calc(12px * var(--ui-scale))', padding: '7px', gap: 6 }}
        >
          <Settings size={14} />
          Ajustes
        </button>
        <button
          className="btn btn-ghost"
          onClick={onLock}
          title="Bloquear"
          style={{ padding: '7px 10px' }}
        >
          <Lock size={14} />
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'var(--bg-modal)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 6,
            zIndex: 9999,
            minWidth: 160,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <button
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', fontSize: 'calc(12px * var(--ui-scale))', padding: '6px 10px', gap: 8 }}
            onClick={() => {
              setEditingFolder(contextMenu.folder);
              setContextMenu(null);
            }}
          >
            <Pencil size={13} />
            Renombrar
          </button>
          <button
            className="btn btn-danger"
            style={{ width: '100%', justifyContent: 'flex-start', fontSize: 'calc(12px * var(--ui-scale))', padding: '6px 10px', gap: 8, marginTop: 2 }}
            onClick={() => {
              if (confirm(`¿Eliminar "${contextMenu.folder.name}" y todas sus notas?`)) {
                onDeleteFolder(contextMenu.folder.id);
              }
              setContextMenu(null);
            }}
          >
            <Trash2 size={13} />
            Eliminar folder
          </button>
        </div>
      )}

      {/* Edit folder modal */}
      {editingFolder && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{
            background: 'var(--bg-modal)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 28,
            width: 340,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
            <h3 style={{ fontSize: 'calc(16px * var(--ui-scale))', fontWeight: 600, color: 'var(--text-primary)' }}>Editar folder</h3>

            <input
              type="text"
              value={editingFolder.name}
              onChange={e => setEditingFolder({ ...editingFolder, name: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingFolder(null); }}
              className="input"
              autoFocus
            />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {FOLDER_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setEditingFolder({ ...editingFolder, icon })}
                  style={{
                    border: editingFolder.icon === icon ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: 'var(--bg-input)',
                    borderRadius: 6,
                    padding: '3px 6px',
                    cursor: 'pointer',
                    fontSize: 'calc(14px * var(--ui-scale))',
                  }}
                >{icon}</button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {FOLDER_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditingFolder({ ...editingFolder, color: c })}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: c,
                    border: editingFolder.color === c ? '2px solid white' : '2px solid transparent',
                    cursor: 'pointer',
                    boxShadow: editingFolder.color === c ? `0 0 8px ${c}` : 'none',
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleSaveEdit} style={{ flex: 1 }}>Guardar</button>
              <button className="btn btn-ghost" onClick={() => setEditingFolder(null)} style={{ flex: 1 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
