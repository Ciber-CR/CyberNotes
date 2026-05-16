import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Note, Folder } from '../types';
import { Plus, Trash2, Pin, Search, ArrowUpDown, ChevronDown, LayoutList, StretchHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  notes: Note[];
  folders: Folder[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
  onTogglePin: (note: Note) => void;
  onMoveNote: (noteId: string, folderId: string | null) => void;
  onRenameNote: (id: string, title: string) => void;
  selectedFolder: Folder | null;
  searchQuery: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const timeStr = d.toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (isToday) {
    return `Hoy, ${timeStr}`;
  } else if (isYesterday) {
    return `Ayer, ${timeStr}`;
  } else {
    return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }) + `, ${timeStr}`;
  }
}

function extractFirstImage(content: string | null): string | null {
  if (!content || typeof content !== 'string') return null;
  
  // Si parece JSON (notas antiguas), buscar en el árbol
  if (content.trim().startsWith('{')) {
    try {
      const doc = JSON.parse(content);
      let foundSrc: string | null = null;
      const walk = (node: any) => {
        if (foundSrc) return;
        if (node.type === 'image' && node.attrs && node.attrs.src) {
          foundSrc = node.attrs.src;
        }
        if (node.content && Array.isArray(node.content)) {
          node.content.forEach(walk);
        }
      };
      if (doc.content && Array.isArray(doc.content)) {
        doc.content.forEach(walk);
      }
      if (foundSrc) return foundSrc;
    } catch (e) {
      // Si falla, intentamos procesarlo como HTML por si acaso
    }
  }

  // Usar un parser real en lugar de regex para máxima fiabilidad con HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const img = doc.querySelector('img');
  
  if (!img) return null;
  
  return img.getAttribute('src');
}

type ViewMode = 'normal' | 'compact';

export default function NoteList({
  notes: initialNotes, folders, selectedNoteId, onSelectNote, onCreateNote,
  onDeleteNote, onTogglePin, onMoveNote, onRenameNote, selectedFolder, searchQuery,
}: Props) {
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'alpha' | 'alpha-desc'>('updated');
  const [viewMode, setViewMode] = useState<ViewMode>('normal');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, note: Note } | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [renameTarget, setRenameTarget] = useState<Note | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeContextMenu = () => setContextMenu(null);
    document.addEventListener('click', closeContextMenu);
    return () => document.removeEventListener('click', closeContextMenu);
  }, []);

  // Lógica de ordenación
  const sortedNotes = [...initialNotes].sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned - a.pinned;
    if (sortBy === 'updated') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    if (sortBy === 'created') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === 'alpha') return a.title.localeCompare(b.title);
    return b.title.localeCompare(a.title);
  });

  // Calcular notas ocultas debajo del scroll
  useEffect(() => {
    const el = listRef.current;
    if (!el || sortedNotes.length === 0) return;
    const update = () => {
      let remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (remaining > 10) {
        let ratio = remaining / el.scrollHeight;
        let hidden = Math.max(1, Math.round(ratio * sortedNotes.length));
        setHiddenCount(Math.min(hidden, sortedNotes.length));
      } else {
        setHiddenCount(0);
      }
    };
    update();
    el.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [sortedNotes.length]);

  const headerTitle = searchQuery
    ? `Resultados (${initialNotes.length})`
    : selectedFolder
      ? `${selectedFolder.icon} ${selectedFolder.name}`
      : 'Todas las notas';

  return (
    <div className="glass-effect notelist-glass" style={{
      width: 'var(--notelist-width)',
      background: 'var(--bg-notelist)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
      position: 'relative',
    }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Header */}
      <div style={{
        padding: '14px 14px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{
            fontSize: 'calc(14px * var(--ui-scale))',
            fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 160,
          }}>
            {headerTitle}
          </h2>
          <button
            className="btn btn-primary"
            onClick={onCreateNote}
            title="Nueva nota (Ctrl+N)"
            style={{ padding: '5px 10px', fontSize: 'calc(12px * var(--ui-scale))', gap: 4 }}
          >
            <Plus size={14} />
            Nueva
          </button>
        </div>

        {/* Sort & View Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="btn-icon"
                style={{ fontSize: 'calc(11px * var(--ui-scale))', gap: 4, color: 'var(--text-muted)' }}
              >
                <ArrowUpDown size={12} />
                {sortBy === 'updated' ? 'Recientes' : sortBy === 'created' ? 'Creadas' : sortBy === 'alpha' ? 'A-Z' : 'Z-A'}
                <ChevronDown size={10} />
              </button>
              {showSortMenu && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setShowSortMenu(false)} />
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, marginTop: 4,
                    background: 'var(--bg-modal)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: 4, zIndex: 101, width: 140,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}>
                    {[
                      { id: 'updated', label: 'Actualización' },
                      { id: 'created', label: 'Creación' },
                      { id: 'alpha', label: 'Alfabético (A-Z)' },
                      { id: 'alpha-desc', label: 'Alfabético (Z-A)' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { setSortBy(opt.id as any); setShowSortMenu(false); }}
                        style={{
                          width: '100%', padding: '6px 10px', textAlign: 'left', fontSize: 'calc(11.5px * var(--ui-scale))',
                          background: sortBy === opt.id ? 'var(--accent-dim)' : 'transparent',
                          color: sortBy === opt.id ? 'var(--accent-light)' : 'var(--text-secondary)',
                          border: 'none', borderRadius: 4, cursor: 'pointer',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={{ width: 1, height: 12, background: 'var(--border)' }} />

            <button
              onClick={() => setViewMode(viewMode === 'normal' ? 'compact' : 'normal')}
              className="btn-icon"
              title={viewMode === 'normal' ? 'Cambiar a vista compacta' : 'Cambiar a vista normal'}
              style={{ padding: 2, color: 'var(--text-muted)' }}
            >
              {viewMode === 'normal' ? <LayoutList size={14} /> : <StretchHorizontal size={14} />}
            </button>
          </div>
          
          <span style={{ fontSize: 'calc(12px * var(--ui-scale))', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {sortedNotes.length} {sortedNotes.length === 1 ? 'nota' : 'notas'}
          </span>
        </div>
      </div>

      <div className="divider" />

      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <div ref={listRef} style={{ height: '100%', overflowY: 'auto' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedFolder?.id || 'all'}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}
            >
              {sortedNotes.length === 0 ? (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', flex: 1, minHeight: 200, gap: 12, color: 'var(--text-muted)',
                }}>
                  {searchQuery
                    ? <><Search size={32} opacity={0.4} /><span style={{ fontSize: 13 }}>Sin resultados</span></>
                    : <><span style={{ fontSize: 32, opacity: 0.3 }}>📝</span><span style={{ fontSize: 13 }}>Sin notas aún</span></>
                  }
                </div>
              ) : (
                sortedNotes.map(note => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    viewMode={viewMode}
                    isSelected={note.id === selectedNoteId}
                    onClick={() => onSelectNote(note.id)}
                    onDelete={() => onDeleteNote(note.id)}
                    onContextMenu={(e) => {
                    e.preventDefault();
                    let safeX = e.clientX;
                    let safeY = e.clientY;
                    // Evitar desborde por la derecha (menú mide ~140px)
                    if (safeX + 160 > window.innerWidth) safeX = window.innerWidth - 160;
                    // Evitar desborde por abajo (menú mide ~250px)
                    if (safeY + 250 > window.innerHeight) safeY = window.innerHeight - 250;
                    setContextMenu({ x: safeX, y: safeY, note });
                  }}
                />
              ))
            )}
          </motion.div>
        </AnimatePresence>
        </div>

        {/* X Más pill */}
        <div style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: isHovering && hiddenCount > 0 ? 1 : 0,
          visibility: isHovering && hiddenCount > 0 ? 'visible' : 'hidden',
          transition: 'opacity 0.25s, visibility 0.25s',
          zIndex: 10,
          pointerEvents: isHovering && hiddenCount > 0 ? 'auto' : 'none',
        }}>
          <button
            onClick={() => {
              let el = listRef.current;
              if (el) el.scrollBy({ top: el.clientHeight * 0.7, behavior: 'smooth' });
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 16px',
              borderRadius: 8,
              border: '1px solid var(--accent)',
              background: 'var(--bg-surface)',
              color: 'var(--accent-light)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12,
              whiteSpace: 'nowrap',
              animation: 'cyber-border-pulse 3s ease-in-out infinite',
              boxShadow: '0 0 4px var(--accent-glow)',
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            +{hiddenCount} más
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cyber-border-pulse {
          0%, 100% { border-color: var(--accent); }
          25%      { border-color: var(--pulse-1); }
          50%      { border-color: var(--pulse-2); }
          75%      { border-color: var(--pulse-3); }
        }
      `}</style>

      {/* Menú Contextual */}
      {contextMenu && createPortal(
        <div 
          className="glass-effect"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'var(--bg-modal)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: 4,
            zIndex: 100000,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            minWidth: 140,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => onSelectNote(contextMenu.note.id)}
            style={{ textAlign: 'left', padding: '6px 10px', fontSize: 12, background: 'transparent', color: 'var(--text-primary)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            Abrir nota
          </button>
          <button
            onClick={() => { setRenameTarget(contextMenu.note); setRenameInput(contextMenu.note.title); setContextMenu(null); }}
            style={{ textAlign: 'left', padding: '6px 10px', fontSize: 12, background: 'transparent', color: 'var(--text-primary)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            Renombrar
          </button>
          <button
            onClick={() => onTogglePin(contextMenu.note)}
            style={{ textAlign: 'left', padding: '6px 10px', fontSize: 12, background: 'transparent', color: 'var(--text-primary)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {contextMenu.note.pinned ? 'Desfijar' : 'Fijar'}
          </button>

          {folders.length > 0 && (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
              <div style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Mover a...</div>
              <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button
                  onClick={() => { onMoveNote(contextMenu.note.id, null); setContextMenu(null); }}
                  style={{ textAlign: 'left', padding: '6px 10px', fontSize: 12, background: 'transparent', color: 'var(--text-primary)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                   📄 Todas las notas
                </button>
                {folders.map(f => (
                  <button
                    key={f.id}
                    onClick={() => { onMoveNote(contextMenu.note.id, f.id); setContextMenu(null); }}
                    style={{ textAlign: 'left', padding: '6px 10px', fontSize: 12, background: 'transparent', color: 'var(--text-primary)', border: 'none', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    {f.icon} <span className="truncate">{f.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
          <button
            onClick={() => {
              if (confirm('¿Eliminar esta nota?')) onDeleteNote(contextMenu.note.id);
            }}
            style={{ textAlign: 'left', padding: '6px 10px', fontSize: 12, color: 'var(--danger)', background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--danger-dim)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            Eliminar
          </button>
        </div>,
        document.body
      )}

      {/* Modal Renombrar */}
      {renameTarget && createPortal(
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--bg-editor-glass)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
        }} onClick={() => setRenameTarget(null)}>
          <div style={{
            background: 'var(--bg-modal)', padding: 24, borderRadius: 'var(--radius-lg)',
            width: 400, display: 'flex', flexDirection: 'column', gap: 16, border: '1px solid var(--border)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)', fontWeight: 600 }}>Renombrar nota</h3>
            <input
              autoFocus
              type="text"
              value={renameInput}
              onChange={e => setRenameInput(e.target.value)}
              className="input"
              placeholder="Nombre de la nota"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  onRenameNote(renameTarget.id, renameInput);
                  setRenameTarget(null);
                }
                if (e.key === 'Escape') setRenameTarget(null);
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setRenameTarget(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => {
                onRenameNote(renameTarget.id, renameInput);
                setRenameTarget(null);
              }}>Guardar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── NoteItem subcomponent ─────────────────────────────────────────────────

interface NoteItemProps {
  note: Note;
  viewMode: ViewMode;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function NoteItem({ note, viewMode, isSelected, onClick, onDelete, onContextMenu }: NoteItemProps) {
  const firstImage = viewMode === 'normal' ? extractFirstImage(note.content) : null;

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      draggable={true}
      onDragStart={e => e.dataTransfer.setData('text/plain', note.id)}
      style={{
        padding: viewMode === 'compact' ? '10px 14px' : '12px 14px',
        borderBottom: '1px solid var(--border)',
        background: isSelected ? 'var(--bg-active)' : 'transparent',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background var(--transition)',
        borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
      }}
      className="note-item"
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: viewMode === 'compact' ? 2 : 4 }}>
            {note.pinned === 1 && <Pin size={11} color="var(--accent)" style={{ flexShrink: 0 }} />}
            <span style={{
              fontSize: 'calc(13px * var(--ui-scale))',
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}>
              {note.title || 'Sin título'}
            </span>
          </div>

          {viewMode === 'normal' && (
            <p style={{
              fontSize: 'calc(11.5px * var(--ui-scale))',
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.45,
              marginBottom: 6,
              maxHeight: '2.9em',
            }}>
              {note.preview || 'Sin contenido'}
            </p>
          )}

          <div style={{ 
            fontSize: 'calc(10.5px * var(--ui-scale))', 
            color: 'var(--text-secondary)', 
            opacity: 0.9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{formatDate(note.updated_at)}</span>
            
            <button
              className="delete-note-btn"
              onClick={e => {
                e.stopPropagation();
                if (confirm('¿Eliminar esta nota?')) onDelete();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px 4px',
                opacity: 0,
                transition: 'all 0.2s'
              }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {firstImage && (
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 6,
            overflow: 'hidden',
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            flexShrink: 0,
          }}>
            <img 
              src={firstImage} 
              alt="Preview" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
            />
          </div>
        )}
      </div>

      <style>{`
        .note-item:hover .delete-note-btn { opacity: 1 !important; }
        .note-item:hover .delete-note-btn:hover { color: var(--danger) !important; }
      `}</style>
    </div>
  );
}

