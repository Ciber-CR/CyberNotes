import { useState, useEffect, useCallback, useRef } from 'react';
import { Folder, Note, ThemeId } from '../types';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';
import NoteList from './NoteList';
import NoteEditor from './NoteEditor';
import SettingsModal from './SettingsModal';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  currentTheme: ThemeId;
  onThemeChange: (t: ThemeId) => void;
  colorIntensity: number;
  onIntensityChange: (v: number) => void;
  onLock: () => void;
}

export default function MainApp({ currentTheme, onThemeChange, colorIntensity, onIntensityChange, onLock }: Props) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [layoutMode, setLayoutMode] = useState<1 | 2 | 3>(3);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [noteListWidth, setNoteListWidth] = useState(300);
  const [uiScale, setUiScale] = useState(1.0);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [glassBlur, setGlassBlur] = useState(0);
  const [bgOpacity, setBgOpacity] = useState(0.5);
  const [statusBarUrl, setStatusBarUrl] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    linkHref?: string;
    suggestions: string[];
    misspelledWord?: string;
  } | null>(null);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [autoLockMinutes, setAutoLockMinutes] = useState(0);
  const [rememberLastNote, setRememberLastNote] = useState(false);
  const [showLineCounter, setShowLineCounter] = useState(false);
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const trackMouse = (e: MouseEvent) => {
      (window as any).lastMousePos = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousedown', trackMouse, true);
    window.addEventListener('contextmenu', trackMouse, true);
    
    loadFolders();
    loadNotes(null);
    loadSettings();

    // Escuchar el menú contextual desde Electron de forma global
    const unregisterContext = window.cyberNotesAPI.onContextMenuData((data: any) => {
      const mousePos = (window as any).lastMousePos || { x: data.x, y: data.y };
      let safeY = mousePos.y;
      if (safeY + 300 > window.innerHeight) safeY = window.innerHeight - 300;
      
      setContextMenu({
        x: mousePos.x,
        y: safeY,
        linkHref: data.linkURL,
        suggestions: data.suggestions || [],
        misspelledWord: data.misspelledWord || ''
      });
    });

    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);

    return () => {
      window.removeEventListener('mousedown', trackMouse, true);
      window.removeEventListener('contextmenu', trackMouse, true);
      window.removeEventListener('click', closeMenu);
      if (unregisterContext) unregisterContext();
    };
  }, []);

  // Lógica de Auto-bloqueo
  useEffect(() => {
    if (autoLockMinutes <= 0) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onLock();
      }, autoLockMinutes * 60 * 1000);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'wheel', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));

    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [autoLockMinutes, onLock]);

  // Detector de links vía mousemove (máxima compatibilidad)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Inspeccionamos el elemento bajo el cursor de forma precisa
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const link = el?.closest('a');
      
      if (link && link.href) {
        const url = link.href;
        // Solo mostrar si es un link real (web) o tiene protocolo
        if (url.startsWith('http') || url.startsWith('https') || url.startsWith('mailto:') || url.includes('www.')) {
          if (statusBarUrl !== url) setStatusBarUrl(url);
          return;
        }
      }
      
      if (statusBarUrl !== null) setStatusBarUrl(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [statusBarUrl]);

  // Guardar última nota si la opción está activa
  useEffect(() => {
    if (rememberLastNote && selectedNoteId) {
      window.cyberNotesAPI.setSetting('last_note_id', selectedNoteId);
    }
  }, [selectedNoteId, rememberLastNote]);

  const loadSettings = async () => {
    const scale = await window.cyberNotesAPI.getSetting('ui_scale');
    if (scale) setUiScale(parseFloat(scale));

    const bg = await window.cyberNotesAPI.getSetting('bg_image');
    if (bg) setBgImage(bg);

    const blur = await window.cyberNotesAPI.getSetting('glass_blur');
    if (blur) setGlassBlur(parseFloat(blur));

    const op = await window.cyberNotesAPI.getSetting('bg_opacity');
    if (op) setBgOpacity(parseFloat(op));

    const lock = await window.cyberNotesAPI.getSetting('auto_lock_minutes');
    if (lock) setAutoLockMinutes(parseInt(lock));

    const remember = await window.cyberNotesAPI.getSetting('remember_last_note');
    const isRemember = remember === 'true';
    setRememberLastNote(isRemember);

    const lineCounter = await window.cyberNotesAPI.getSetting('show_line_counter');
    setShowLineCounter(lineCounter === 'true');

    const autosave = await window.cyberNotesAPI.getSetting('autosave_enabled');
    if (autosave !== null) setAutosaveEnabled(autosave === 'true');

    if (isRemember) {
      const lastId = await window.cyberNotesAPI.getSetting('last_note_id');
      if (lastId) setSelectedNoteId(lastId);
    }
  };

  const loadFolders = async () => {
    const f = await window.cyberNotesAPI.getFolders();
    setFolders(f);
  };

  const loadNotes = async (folderId: string | null) => {
    let n: Note[];
    if (searchQuery) {
      n = await window.cyberNotesAPI.searchNotes(searchQuery);
    } else {
      n = await window.cyberNotesAPI.getNotesByFolder(folderId);
    }
    setNotes(n);
    // Si no hay nota seleccionada, selecciona la primera
    if (n.length > 0 && !selectedNoteId) {
      setSelectedNoteId(n[0].id);
    }
  };

  const handleSelectFolder = async (folderId: string | null) => {
    setSelectedFolderId(folderId);
    setSelectedNoteId(null);
    setSearchQuery('');
    const n = await window.cyberNotesAPI.getNotesByFolder(folderId);
    setNotes(n);
    if (n.length > 0) setSelectedNoteId(n[0].id);
  };

  const handleRenameNote = async (id: string, title: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    handleSaveNote({ ...note, title });
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q) {
      const n = await window.cyberNotesAPI.getNotesByFolder(selectedFolderId);
      setNotes(n);
      return;
    }
    const n = await window.cyberNotesAPI.searchNotes(q);
    setNotes(n);
    setSelectedNoteId(n.length > 0 ? n[0].id : null);
  };

  const handleCreateNote = async () => {
    console.log('[MainApp] handleCreateNote triggered');
    const now = new Date().toISOString();
    const newNote: Note = {
      id: window.crypto.randomUUID(),
      folder_id: selectedFolderId,
      title: 'Nueva nota',
      content: '',
      preview: '',
      pinned: 0,
      created_at: now,
      updated_at: now,
    };
    console.log('[MainApp] Creating note:', newNote);
    try {
      const saved = await window.cyberNotesAPI.saveNote(newNote);
      console.log('[MainApp] Note saved:', saved);
      setNotes(prev => [saved, ...prev]);
      setSelectedNoteId(saved.id);
    } catch (err) {
      console.error('[MainApp] Error creating note:', err);
    }
  };

  const handleSaveNote = useCallback(async (note: Note) => {
    const updated = { ...note, updated_at: new Date().toISOString() };
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
    await window.cyberNotesAPI.saveNote(updated);
  }, []);

  const handleDeleteNote = async (id: string) => {
    await window.cyberNotesAPI.deleteNote(id);
    const remaining = notes.filter(n => n.id !== id);
    setNotes(remaining);
    if (selectedNoteId === id) {
      setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleTogglePin = async (note: Note) => {
    const updated = { ...note, pinned: note.pinned === 1 ? 0 : 1 };
    await window.cyberNotesAPI.saveNote(updated);
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
  };

  const handleMoveNote = async (noteId: string, targetFolderId: string | null) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const updated = { ...note, folder_id: targetFolderId, updated_at: new Date().toISOString() };
    await window.cyberNotesAPI.saveNote(updated);
    
    // Si estamos viendo una carpeta específica y movemos la nota a otra, la quitamos de la lista
    if (selectedFolderId !== targetFolderId && !searchQuery) {
       const remaining = notes.filter(n => n.id !== noteId);
       setNotes(remaining);
       if (selectedNoteId === noteId) setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
    } else {
       setNotes(prev => prev.map(n => n.id === noteId ? updated : n));
    }
  };

  const handleCreateFolder = async (name: string, icon: string, color: string) => {
    const now = new Date().toISOString();
    const folder: Folder = {
      id: window.crypto.randomUUID(),
      name,
      icon,
      color,
      sort_order: folders.length,
      created_at: now,
    };
    await window.cyberNotesAPI.createFolder(folder);
    setFolders(prev => [...prev, folder]);
  };

  const handleUpdateFolder = async (folder: Folder) => {
    await window.cyberNotesAPI.updateFolder(folder);
    setFolders(prev => prev.map(f => f.id === folder.id ? folder : f));
  };

  const handleDeleteFolder = async (id: string) => {
    await window.cyberNotesAPI.deleteFolder(id);
    setFolders(prev => prev.filter(f => f.id !== id));
    if (selectedFolderId === id) {
      setSelectedFolderId(null);
      const n = await window.cyberNotesAPI.getNotesByFolder(null);
      setNotes(n);
      setSelectedNoteId(n.length > 0 ? n[0].id : null);
    }
  };

  const handleScaleChange = (scale: number) => {
    setUiScale(scale);
    window.cyberNotesAPI.setSetting('ui_scale', scale.toString());
  };

  const handleBgImageChange = (url: string | null) => {
    setBgImage(url);
    window.cyberNotesAPI.setSetting('bg_image', url || '');
  };

  const handleBlurChange = (val: number) => {
    setGlassBlur(val);
    window.cyberNotesAPI.setSetting('glass_blur', val.toString());
  };

  const handleOpacityChange = async (v: number) => {
    setBgOpacity(v);
    await window.cyberNotesAPI.setSetting('bg_opacity', v.toString());
  };

  const handleAutoLockChange = async (v: number) => {
    setAutoLockMinutes(v);
    await window.cyberNotesAPI.setSetting('auto_lock_minutes', v.toString());
  };

  const handleRememberLastNoteChange = async (v: boolean) => {
    setRememberLastNote(v);
    await window.cyberNotesAPI.setSetting('remember_last_note', v.toString());
  };

  const handleShowLineCounterChange = async (v: boolean) => {
    setShowLineCounter(v);
    await window.cyberNotesAPI.setSetting('show_line_counter', v.toString());
  };

  const handleAutosaveEnabledChange = async (v: boolean) => {
    setAutosaveEnabled(v);
    await window.cyberNotesAPI.setSetting('autosave_enabled', v.toString());
  };

  const selectedNote = notes.find(n => n.id === selectedNoteId) ?? null;

  const startDragSidebar = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
       setSidebarWidth(Math.min(Math.max(startWidth + (ev.clientX - startX), 150), 500));
    };
    const onUp = () => {
       document.removeEventListener('mousemove', onMove);
       document.removeEventListener('mouseup', onUp);
       document.body.style.cursor = 'default';
    };
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const startDragNoteList = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = noteListWidth;
    const onMove = (ev: MouseEvent) => {
       setNoteListWidth(Math.min(Math.max(startWidth + (ev.clientX - startX), 200), 600));
    };
    const onUp = () => {
       document.removeEventListener('mousemove', onMove);
       document.removeEventListener('mouseup', onUp);
       document.body.style.cursor = 'default';
    };
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div 
      className={bgImage ? 'has-bg' : ''}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        overflow: 'hidden',
        '--sidebar-width': `${sidebarWidth}px`,
        '--notelist-width': `${noteListWidth}px`,
        '--ui-scale': uiScale.toString(),
        '--bg-image': bgImage ? `url("${bgImage}")` : 'none',
        '--glass-blur': `${glassBlur}px`,
        '--bg-overlay-opacity': bgOpacity.toString(),
      } as React.CSSProperties}>
      
      {bgImage && (
        <div className="app-bg-layer">
          <img 
            src={bgImage} 
            alt="App Background" 
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
          />
        </div>
      )}
      {bgImage && <div className="app-overlay-layer" />}

      <TitleBar onLock={onLock} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        {layoutMode === 3 && (
          <>
            <Sidebar
              folders={folders}
              selectedFolderId={selectedFolderId}
              noteCount={notes.length}
              recentNotes={[...notes].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5)}
              onSelectNote={(id) => {
                let note = notes.find(n => n.id === id);
                if (note) { setSelectedNoteId(id); setSelectedFolderId(note.folder_id); }
              }}
              onSelectFolder={handleSelectFolder}
              onCreateFolder={handleCreateFolder}
              onUpdateFolder={handleUpdateFolder}
              onDeleteFolder={handleDeleteFolder}
              onOpenSettings={() => setShowSettings(true)}
              onLock={onLock}
              searchQuery={searchQuery}
              onSearch={handleSearch}
              onMoveNote={handleMoveNote}
            />
            <div 
              onMouseDown={startDragSidebar}
              style={{ width: 4, cursor: 'col-resize', background: 'transparent', flexShrink: 0, zIndex: 10, margin: '0 -2px' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'var(--accent)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
            />
          </>
        )}

        {/* Note list */}
        {layoutMode >= 2 && (
          <>
            <NoteList
              notes={notes}
              folders={folders}
              selectedNoteId={selectedNoteId}
              onSelectNote={setSelectedNoteId}
              onCreateNote={handleCreateNote}
              onDeleteNote={handleDeleteNote}
              onTogglePin={handleTogglePin}
              onMoveNote={handleMoveNote}
              onRenameNote={handleRenameNote}
              selectedFolder={folders.find(f => f.id === selectedFolderId) ?? null}
              searchQuery={searchQuery}
            />
            <div 
              onMouseDown={startDragNoteList}
              style={{ width: 4, cursor: 'col-resize', background: 'transparent', flexShrink: 0, zIndex: 10, margin: '0 -2px' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'var(--accent)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
            />
          </>
        )}

        {/* Editor */}
        <NoteEditor
          note={selectedNote}
          onSave={handleSaveNote}
          onCreateNote={handleCreateNote}
          layoutMode={layoutMode}
          onToggleLayout={() => setLayoutMode(prev => prev === 1 ? 3 : prev - 1 as any)}
          showLineCounter={showLineCounter}
          autosaveEnabled={autosaveEnabled}
        />
      </div>

      {showSettings && (
        <SettingsModal
          currentTheme={currentTheme}
          onThemeChange={onThemeChange}
          colorIntensity={colorIntensity}
          onIntensityChange={onIntensityChange}
          uiScale={uiScale}
          onScaleChange={handleScaleChange}
          bgImage={bgImage}
          onBgImageChange={handleBgImageChange}
          glassBlur={glassBlur}
          onBlurChange={handleBlurChange}
          bgOpacity={bgOpacity}
          onOpacityChange={handleOpacityChange}
          autoLockMinutes={autoLockMinutes}
          onAutoLockChange={handleAutoLockChange}
          rememberLastNote={rememberLastNote}
          onRememberLastNoteChange={handleRememberLastNoteChange}
          showLineCounter={showLineCounter}
          onShowLineCounterChange={handleShowLineCounterChange}
          autosaveEnabled={autosaveEnabled}
          onAutosaveEnabledChange={handleAutosaveEnabledChange}
          onClose={() => setShowSettings(false)}
          onLock={onLock}
        />
      )}

      {/* Status Bar (Hover Link) */}
      <AnimatePresence>
        {statusBarUrl && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{
              position: 'fixed',
              bottom: 12,
              left: 12,
              background: 'var(--bg-modal)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 10px',
              fontSize: 'calc(11px * var(--ui-scale))',
              color: 'var(--text-secondary)',
              maxWidth: '40vw',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              zIndex: 10001,
              pointerEvents: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}
            className="glass-effect"
          >
            {statusBarUrl}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
