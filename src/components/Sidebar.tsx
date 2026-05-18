import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Folder, Note } from '../types';
import { Language, TRANSLATIONS } from '../languages';
import {
  Plus, FolderOpen, Settings, Lock, Search, X,
  ChevronRight, Pencil, Trash2, FileText, Clock,
} from 'lucide-react';

interface Props {
  language: Language;
  folders: Folder[];
  selectedFolderId: string | null;
  noteCount: number;
  recentNotes: Note[];
  onSelectNote: (id: string) => void;
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

function timeAgo(iso: string, language: Language): string {
  let diff = Date.now() - new Date(iso).getTime();
  let mins = Math.round(diff / 60000);
  const isEn = language === 'en';
  if (mins < 1) return isEn ? 'Just now' : 'Ahora';
  if (mins < 60) return isEn ? `${mins}m ago` : `hace ${mins} min`;
  let hours = Math.floor(mins / 60);
  if (hours < 24) return isEn ? `${hours}h ago` : `hace ${hours}h`;
  let days = Math.floor(hours / 24);
  if (days < 7) return isEn ? `${days}d ago` : `hace ${days} día${days > 1 ? 's' : ''}`;
  let weeks = Math.floor(days / 7);
  if (weeks < 5) return isEn ? `${weeks}w ago` : `hace ${weeks} sem`;
  return new Date(iso).toLocaleDateString(isEn ? 'en-US' : 'es-ES', { month: 'short', day: 'numeric' });
}

export default function Sidebar({
  language, folders, selectedFolderId, noteCount, recentNotes, onSelectNote,
  onSelectFolder, onCreateFolder, onUpdateFolder, onDeleteFolder,
  onOpenSettings, onLock, searchQuery, onSearch, onMoveNote,
}: Props) {
  const t = TRANSLATIONS[language];
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('📁');
  const [newFolderColor, setNewFolderColor] = useState('#7c3aed');
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [contextMenu, setContextMenu] = useState<{ folder: Folder; x: number; y: number } | null>(null);
  const [showRecent, setShowRecent] = useState(false);
  const recentBtnRef = useRef<HTMLButtonElement>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  const [isNoteDragging, setIsNoteDragging] = useState(false);
  const [activeDropTargetId, setActiveDropTargetId] = useState<string | null | 'all'>(null);

  // Global drag listeners to activate target drop indicators
  useEffect(() => {
    const handleDragStart = (e: DragEvent) => {
      setIsNoteDragging(true);
    };
    const handleDragEnd = () => {
      setIsNoteDragging(false);
      setActiveDropTargetId(null);
    };

    window.addEventListener('dragstart', handleDragStart);
    window.addEventListener('dragend', handleDragEnd);
    window.addEventListener('drop', handleDragEnd);

    return () => {
      window.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('dragend', handleDragEnd);
      window.removeEventListener('drop', handleDragEnd);
    };
  }, []);

  useEffect(() => {
    if (showNewFolder) setTimeout(() => newFolderInputRef.current?.focus(), 50);
  }, [showNewFolder]);

  // Cerrar context menu al hacer click fuera
  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  // Cerrar menú recientes al hacer click fuera
  const recentMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showRecent) return;
    const handler = (e: MouseEvent) => {
      if (
        recentBtnRef.current && !recentBtnRef.current.contains(e.target as Node) &&
        recentMenuRef.current && !recentMenuRef.current.contains(e.target as Node)
      ) {
        setShowRecent(false);
      }
    };
    setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [showRecent]);

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
            placeholder={t.general.search}
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
          onDragOver={e => {
            e.preventDefault();
            if (activeDropTargetId !== 'all') {
              setActiveDropTargetId('all');
            }
          }}
          onDragLeave={() => setActiveDropTargetId(null)}
          onDrop={e => {
            e.preventDefault();
            const noteId = e.dataTransfer.getData('text/plain');
            setActiveDropTargetId(null);
            setIsNoteDragging(false);
            if (noteId) {
              setTimeout(() => {
                onMoveNote(noteId, null);
              }, 50);
            }
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            border: isNoteDragging
              ? activeDropTargetId === 'all'
                ? '1px solid var(--accent)'
                : '1px dashed rgba(124, 90, 237, 0.4)'
              : '1px solid transparent',
            background: activeDropTargetId === 'all'
              ? 'var(--accent-dim)'
              : selectedFolderId === null && !searchQuery
                ? 'var(--bg-active)'
                : 'transparent',
            color: activeDropTargetId === 'all'
              ? 'var(--accent-light)'
              : selectedFolderId === null && !searchQuery
                ? 'var(--accent-light)'
                : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 'calc(13px * var(--ui-scale))',
            fontWeight: (selectedFolderId === null && !searchQuery) || activeDropTargetId === 'all' ? 600 : 400,
            textAlign: 'left',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            marginBottom: 4,
            transform: activeDropTargetId === 'all' ? 'scale(1.03)' : 'none',
            boxShadow: activeDropTargetId === 'all'
              ? '0 0 12px var(--accent-glow)'
              : isNoteDragging
                ? '0 0 4px rgba(124, 90, 237, 0.15)'
                : 'none',
          }}
          onMouseEnter={e => { if (selectedFolderId !== null && activeDropTargetId !== 'all') (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { if (selectedFolderId !== null && activeDropTargetId !== 'all') (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <FileText size={15} style={{ pointerEvents: 'none' }} />
          <span style={{ flex: 1, pointerEvents: 'none' }}>{t.sidebar.allNotes}</span>
          <span style={{
            fontSize: 'calc(11px * var(--ui-scale))',
            background: 'var(--bg-surface)',
            color: 'var(--text-muted)',
            padding: '1px 6px',
            borderRadius: 10,
            pointerEvents: 'none',
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
          {t.sidebar.folders}
        </div>

        {/* Lista de folders */}
        {folders.map(folder => {
          const isTarget = activeDropTargetId === folder.id;
          const isSelected = selectedFolderId === folder.id;
          return (
            <button
              key={folder.id}
              onClick={() => onSelectFolder(folder.id)}
              onContextMenu={e => handleContextMenu(e, folder)}
              onDragOver={e => {
                e.preventDefault();
                if (activeDropTargetId !== folder.id) {
                  setActiveDropTargetId(folder.id);
                }
              }}
              onDragLeave={() => setActiveDropTargetId(null)}
              onDrop={e => {
                e.preventDefault();
                const noteId = e.dataTransfer.getData('text/plain');
                setActiveDropTargetId(null);
                setIsNoteDragging(false);
                if (noteId) {
                  setTimeout(() => {
                    onMoveNote(noteId, folder.id);
                  }, 50);
                }
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: isNoteDragging
                  ? isTarget
                    ? `1px solid ${folder.color}`
                    : `1px dashed ${folder.color}55`
                  : '1px solid transparent',
                background: isTarget
                  ? `${folder.color}22`
                  : isSelected
                    ? 'var(--bg-active)'
                    : 'transparent',
                color: isTarget
                  ? '#fff'
                  : isSelected
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 'calc(13px * var(--ui-scale))',
                fontWeight: isSelected || isTarget ? 600 : 400,
                textAlign: 'left',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                marginBottom: 4,
                position: 'relative',
                transform: isTarget ? 'scale(1.03)' : 'none',
                boxShadow: isTarget
                  ? `0 0 12px ${folder.color}44, inset 0 0 6px ${folder.color}22`
                  : isNoteDragging
                    ? `0 0 4px ${folder.color}15`
                    : 'none',
              }}
              onMouseEnter={e => { if (!isSelected && !isTarget) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { if (!isSelected && !isTarget) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {/* Color bar */}
              {isSelected && !isTarget && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '20%',
                  bottom: '20%',
                  width: 3,
                  borderRadius: 2,
                  background: folder.color,
                  pointerEvents: 'none',
                }} />
              )}
              <span style={{ 
                fontSize: 'calc(15px * var(--ui-scale))',
                transform: isTarget ? 'scale(1.2)' : 'none',
                transition: 'transform 0.2s ease',
                pointerEvents: 'none',
              }}>{folder.icon}</span>
              <span className="truncate" style={{ 
                flex: 1,
                textShadow: isTarget ? `0 0 4px ${folder.color}aa` : 'none',
                color: isTarget ? '#fff' : undefined,
                pointerEvents: 'none',
              }}>{folder.name}</span>
              <ChevronRight size={12} style={{ opacity: isTarget ? 0.8 : 0.4, color: isTarget ? folder.color : undefined, pointerEvents: 'none' }} />
            </button>
          );
        })}

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
              placeholder={t.sidebar.folderName}
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
                {t.sidebar.create}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowNewFolder(false)} style={{ flex: 1, fontSize: 'calc(12px * var(--ui-scale))', padding: '6px' }}>
                {t.general.cancel}
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
            {t.sidebar.newFolder}
          </button>
        )}
      </div>

      {/* Bottom actions */}
      <div className="divider" />
      <div style={{ padding: '8px', display: 'flex', gap: 4, justifyContent: 'space-between' }}>
        <button
          ref={recentBtnRef}
          className="btn btn-ghost"
          onClick={(e) => { e.stopPropagation(); setShowRecent(prev => !prev); }}
          title={language === 'es' ? 'Notas recientes' : 'Recent notes'}
          style={{ padding: '7px 10px' }}
        >
          <Clock size={14} />
        </button>
        <button
          className="btn btn-ghost"
          onClick={onOpenSettings}
          style={{ flex: 1, fontSize: 'calc(12px * var(--ui-scale))', padding: '7px', gap: 6 }}
        >
          <Settings size={14} />
          {t.settings.title.replace('⚙️ ', '')}
        </button>
        <button
          className="btn btn-ghost"
          onClick={onLock}
          title={language === 'es' ? 'Bloquear app' : 'Lock app'}
          style={{ padding: '7px 10px' }}
        >
          <Lock size={14} />
        </button>
      </div>

      {/* Drop-up recientes */}
      {showRecent && recentBtnRef.current && createPortal(
        <div
          ref={recentMenuRef}
          className="glass-effect"
          style={{
            position: 'fixed',
            left: recentBtnRef.current.getBoundingClientRect().left,
            bottom: window.innerHeight - recentBtnRef.current.getBoundingClientRect().top + 4,
            width: 312,
            background: 'var(--bg-modal)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 8,
            boxShadow: '0 -8px 24px rgba(0,0,0,0.4)',
            zIndex: 100000,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', padding: '8px 10px 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {language === 'es' ? 'Últimas notas' : 'Last notes'}
          </div>
          {recentNotes.length === 0 ? (
            <div style={{ fontSize: 15.5, color: 'var(--text-muted)', padding: '16px 10px', textAlign: 'center' }}>
              {t.noteList.noNotes}
            </div>
          ) : (
            recentNotes.map((note, i) => (
              <div key={note.id}>
                {i > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />}
                <button
                  onClick={() => { onSelectNote(note.id); setShowRecent(false); }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 3,
                    padding: '10px 14px',
                    fontSize: 15,
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <span style={{
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '100%',
                  }}>
                    {note.title || t.noteList.unnamedNote}
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {timeAgo(note.updated_at, language)}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', opacity: 0.75 }}>
                      {new Date(note.updated_at).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                </button>
              </div>
            ))
          )}
        </div>,
        document.body
      )}

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
            {language === 'es' ? 'Renombrar' : 'Rename'}
          </button>
          <button
            className="btn btn-danger"
            style={{ width: '100%', justifyContent: 'flex-start', fontSize: 'calc(12px * var(--ui-scale))', padding: '6px 10px', gap: 8, marginTop: 2 }}
            onClick={() => {
              if (confirm(t.sidebar.context.deleteConfirm.replace('{name}', contextMenu.folder.name))) {
                onDeleteFolder(contextMenu.folder.id);
              }
              setContextMenu(null);
            }}
          >
            <Trash2 size={13} />
            {t.sidebar.context.delete}
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
            <h3 style={{ fontSize: 'calc(16px * var(--ui-scale))', fontWeight: 600, color: 'var(--text-primary)' }}>{t.sidebar.context.edit}</h3>

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
              <button className="btn btn-primary" onClick={handleSaveEdit} style={{ flex: 1 }}>{t.general.save}</button>
              <button className="btn btn-ghost" onClick={() => setEditingFolder(null)} style={{ flex: 1 }}>{t.general.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
