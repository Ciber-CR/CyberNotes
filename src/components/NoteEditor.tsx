import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { Note } from '../types';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, List, ListOrdered, Link as LinkIcon,
  Image as ImageIcon, Highlighter, Quote, Minus, Code,
  Plus, Pin, AlignLeft, AlignCenter, AlignRight, Braces, PanelLeft,
  Undo, Redo
} from 'lucide-react';

interface Props {
  note: Note | null;
  onSave: (note: Note) => void;
  onCreateNote: () => void;
  layoutMode: number;
  onToggleLayout: () => void;
  showLineCounter?: boolean;
}

// Extensión personalizada para imagen con soporte de tamaño y alineación
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        renderHTML: attributes => ({
          style: `width: ${attributes.width}; height: auto; display: block; margin-left: ${attributes.align === 'left' ? '0' : attributes.align === 'right' ? 'auto' : 'auto'}; margin-right: ${attributes.align === 'right' ? '0' : attributes.align === 'left' ? 'auto' : 'auto'};`,
        }),
        parseHTML: element => element.style.width,
      },
      align: {
        default: 'center',
        renderHTML: attributes => ({
          'data-align': attributes.align,
        }),
        parseHTML: element => element.getAttribute('data-align'),
      },
    };
  },
});

function extractPreview(html: string): string {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').slice(0, 200).replace(/\s+/g, ' ');
}

const ToolbarBtn = ({
  onClick, active = false, title, children, disabled = false,
}: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode; disabled?: boolean }) => (
  <motion.button
    whileHover={{ scale: 1.05, background: 'var(--bg-hover)' }}
    whileTap={{ scale: 0.95 }}
    onMouseDown={(e) => e.preventDefault()} // CRÍTICO: Previene pérdida de foco
    onClick={onClick}
    title={title}
    disabled={disabled}
    className="btn-icon"
    style={{
      background: active ? 'var(--accent-dim)' : 'transparent',
      color: active ? 'var(--accent-light)' : 'var(--text-muted)',
      border: active ? '1px solid var(--accent)' : '1px solid transparent',
      borderRadius: 6,
      padding: '6px 8px',
      transition: 'color 0.2s, border 0.2s',
      opacity: disabled ? 0.4 : 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {children}
  </motion.button>
);

export default function NoteEditor({ note, onSave, onCreateNote, layoutMode, onToggleLayout, showLineCounter }: Props) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentNoteRef = useRef<Note | null>(note);
  const [pinned, setPinned] = useState(note?.pinned === 1);
  const [isRaw, setIsRaw] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, linkHref?: string, suggestions?: string[], misspelledWord?: string } | null>(null);
  const [editLinkData, setEditLinkData] = useState<{ href: string } | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [inputContextMenu, setInputContextMenu] = useState<{ x: number, y: number } | null>(null);
  const [lineInfo, setLineInfo] = useState({ line: 1, col: 1, total: 1 });

  useEffect(() => {
    const closeMenu = () => {
      setContextMenu(null);
      setInputContextMenu(null);
    };
    document.addEventListener('click', closeMenu);
    
    // Escuchar el menú contextual desde Electron
    let unregisterContext: (() => void) | undefined;
    if (window.cyberNotesAPI && window.cyberNotesAPI.onContextMenuData) {
      unregisterContext = window.cyberNotesAPI.onContextMenuData((data: any) => {
        // Usamos las coordenadas reales del ratón (capturadas globalmente)
        const mousePos = (window as any).lastMousePos || { x: data.x, y: data.y };
        
        // Filtro inteligente: solo mostrar si el clic fue dentro del editor o el título
        const targetEl = document.elementFromPoint(mousePos.x, mousePos.y);
        const isInEditor = targetEl?.closest('.editor-glass') || targetEl?.closest('.title-input');
        
        if (!isInEditor) return;

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
    }
    
    return () => {
      document.removeEventListener('click', closeMenu);
      if (unregisterContext) unregisterContext();
    };
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      CustomImage.configure({
        allowBase64: true,
        inline: false,
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder: 'Escribe aquí tu nota...',
      }),
      Underline,
      Highlight.configure({ multicolor: false }),
    ],
    editorProps: {
      attributes: {
        spellcheck: 'true',
      },
    },
    content: '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      scheduleAutoSave(html);
      updateLineInfo(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      updateLineInfo(editor);
    },
  });

  const updateLineInfo = (editor: any) => {
    if (!showLineCounter) return;
    const { from } = editor.state.selection;
    const textBefore = editor.state.doc.textBetween(0, from, '\n');
    const linesBefore = textBefore.split('\n');
    const currentLine = linesBefore.length;
    const currentCol = linesBefore[linesBefore.length - 1].length + 1;
    
    const totalText = editor.getText();
    const totalLines = totalText.split('\n').length;
    
    setLineInfo({ line: currentLine, col: currentCol, total: totalLines });
  };

  // Actualizar editor cuando cambia la nota seleccionada
  useEffect(() => {
    currentNoteRef.current = note;
    setPinned(note?.pinned === 1);

    if (!editor || !note) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);

    // Carga inteligente: intenta parsear JSON, si falla carga como HTML
    const content = note.content || '';
    if (content.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(content);
        editor.commands.setContent(parsed, false);
      } catch (e) {
        editor.commands.setContent(content, false);
      }
    } else {
      editor.commands.setContent(content, false);
    }
    
    editor.commands.focus('start');
    setIsRaw(false);
  }, [note?.id, editor]);

  const scheduleAutoSave = useCallback((html: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const current = currentNoteRef.current;
      if (!current) return;
      const preview = extractPreview(html);
      onSave({ ...current, content: html, preview });
    }, 500); // Más rápido
  }, [onSave]);

  const handlePin = () => {
    if (!note) return;
    const newPinned = pinned ? 0 : 1;
    setPinned(!pinned);
    onSave({ ...note, pinned: newPinned });
  };

  const handleSetLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href;
    setEditLinkData({ href: prev || 'https://' });
  };

  const handleInsertImage = async () => {
    if (!editor) return;
    const url = await window.cyberNotesAPI.selectAndSaveImage();
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  };

  if (!note) {
    return (
      <div className="glass-effect editor-glass" style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg-editor)', gap: 16, color: 'var(--text-muted)',
      }}>
        <motion.span 
          animate={{ y: [0, -10, 0] }} 
          transition={{ repeat: Infinity, duration: 3 }}
          style={{ fontSize: 48, opacity: 0.2 }}
        >✏️</motion.span>
        <p style={{ fontSize: 15 }}>Selecciona o crea una nota</p>
        <button className="btn btn-primary" onClick={onCreateNote} style={{ gap: 6 }}>
          <Plus size={15} /> Nueva nota
        </button>
        <button className="btn btn-ghost" onClick={onToggleLayout} style={{ gap: 6, marginTop: 12 }}>
          <PanelLeft size={15} /> Cambiar vista
        </button>
      </div>
    );
  }

  return (
    <div 
      key={note.id}
      className="glass-effect editor-glass"
      style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-editor)', overflow: 'hidden' }}
    >
      <div style={{
        display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border)',
        flexShrink: 0, background: 'var(--bg-notelist)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', flexWrap: 'wrap' }}>
          {editor && (
            <>
              <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Deshacer (Ctrl+Z)"><Undo size={15} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rehacer (Ctrl+Y)"><Redo size={15} /></ToolbarBtn>
              
              <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />

              <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrita"><Bold size={15} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Cursiva"><Italic size={15} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Subrayado"><UnderlineIcon size={15} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Tachado"><Strikethrough size={15} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Resaltar"><Highlighter size={15} /></ToolbarBtn>
              
              <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
              
              <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Título 1"><Heading1 size={15} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Título 2"><Heading2 size={15} /></ToolbarBtn>
              
              <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
              
              <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista"><List size={15} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada"><ListOrdered size={15} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Cita"><Quote size={15} /></ToolbarBtn>
              
              <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
              
              <ToolbarBtn onClick={handleSetLink} active={editor.isActive('link')} title="Insertar link"><LinkIcon size={15} /></ToolbarBtn>
              <ToolbarBtn onClick={handleInsertImage} title="Insertar imagen"><ImageIcon size={15} /></ToolbarBtn>
              
              <div style={{ flex: 1 }} />
              
              <ToolbarBtn onClick={handlePin} active={pinned} title="Fijar nota"><Pin size={15} /></ToolbarBtn>
              <ToolbarBtn onClick={() => setIsRaw(!isRaw)} active={isRaw} title="Vista HTML"><Braces size={15} /></ToolbarBtn>
              
              <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
              <ToolbarBtn onClick={onToggleLayout} title={`Cambiar vista (Actual: ${layoutMode} columnas)`}>
                <PanelLeft size={15} />
              </ToolbarBtn>
            </>
          )}
        </div>

        <AnimatePresence>
          {editor?.isActive('image') && (
            <motion.div
              initial={{ height: 0, y: -10, opacity: 0 }}
              animate={{ height: 'auto', y: 0, opacity: 1 }}
              exit={{ height: 0, y: -10, opacity: 0 }}
              style={{
                background: 'var(--bg-editor)', borderTop: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', overflow: 'hidden',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>Imagen:</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <ToolbarBtn onClick={() => editor.chain().focus().updateAttributes('image', { align: 'left' }).run()} active={editor.getAttributes('image').align === 'left'} title="Izquierda"><AlignLeft size={14} /></ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().updateAttributes('image', { align: 'center' }).run()} active={editor.getAttributes('image').align === 'center'} title="Centro"><AlignCenter size={14} /></ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().updateAttributes('image', { align: 'right' }).run()} active={editor.getAttributes('image').align === 'right'} title="Derecha"><AlignRight size={14} /></ToolbarBtn>
              </div>
              <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 4px' }} />
              <div style={{ display: 'flex', gap: 4 }}>
                {['20%', '40%', '60%', '80%', '100%'].map(size => (
                  <motion.button
                    key={size}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => editor.chain().focus().updateAttributes('image', { width: size }).run()}
                    style={{
                      padding: '4px 8px', fontSize: 10, fontWeight: 700, borderRadius: 4,
                      border: '1px solid var(--border)', cursor: 'pointer',
                      background: editor.getAttributes('image').width === size ? 'var(--accent)' : 'transparent',
                      color: editor.getAttributes('image').width === size ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    {size}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: '32px 48px 0', flexShrink: 0 }}>
          <input
            value={note.title}
            onChange={e => onSave({ ...note, title: e.target.value })}
            className="title-input"
            style={{
              width: '100%',
              fontSize: 'calc(32px * var(--ui-scale))',
              fontWeight: 700,
              background: 'transparent',
              border: 'none', outline: 'none', color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.03em',
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16, opacity: 0.6, display: 'flex', gap: 12 }}>
            <span>Creada: {new Date(note.created_at).toLocaleDateString()}</span>
            <span>•</span>
            <span>Editada: {new Date(note.updated_at).toLocaleTimeString()}</span>
          </div>
        </div>

        <div 
          className={showLineCounter ? 'show-line-numbers' : ''}
          style={{ position: 'relative', cursor: 'text', flex: '1 0 auto', display: 'flex', flexDirection: 'column' }}
          onClick={(e) => {
            if (editor && e.target === e.currentTarget) {
              editor.commands.focus('end');
            }
          }}
          onMouseMove={e => {
            const aTag = (e.target as HTMLElement).closest('a');
            if (aTag && aTag.href) {
              if (aTag.href !== hoveredLink) setHoveredLink(aTag.href);
            } else {
              if (hoveredLink) setHoveredLink(null);
            }
          }}
          onMouseLeave={() => setHoveredLink(null)}
        >
          {isRaw ? (
            <textarea
              value={editor?.getHTML() || ''}
              readOnly
              style={{
                width: '100%', height: '100%', padding: '0 48px 32px', background: 'transparent',
                color: 'var(--accent-light)', fontFamily: 'var(--font-mono)', fontSize: 'calc(15px * var(--ui-scale))', lineHeight: 1.3,
                border: 'none', outline: 'none', resize: 'none', flex: '1 0 auto',
              }}
            />
          ) : (
            editor && <EditorContent editor={editor} style={{ minHeight: '100%', width: '100%', flex: '1 0 auto' }} />
          )}

          {/* Browser-like Link Hover Preview */}
          {hoveredLink && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                background: '#1a1a1a', // Gris oscuro
                color: '#cccccc', // Gris claro
                padding: '3px 8px',
                fontSize: 11.5,
                borderTopRightRadius: 6,
                maxWidth: '85%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                pointerEvents: 'none',
                zIndex: 50,
                borderTop: '1px solid #333',
                borderRight: '1px solid #333',
                boxShadow: '0 -2px 10px rgba(0,0,0,0.3)',
              }}
            >
              {hoveredLink}
            </motion.div>
          )}
        </div>

      </div>

      {showLineCounter && (
        <div style={{
          padding: '4px 16px',
          background: 'var(--bg-notelist)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 16,
          fontSize: 10,
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: 0.5,
          opacity: 0.8,
          flexShrink: 0
        }}>
          <span>LÍNEA: {lineInfo.line}</span>
          <span>COL: {lineInfo.col}</span>
          <span>TOTAL: {lineInfo.total} LÍNEAS</span>
        </div>
      )}

      {contextMenu && editor && createPortal(
        <div 
          className="glass-effect"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'var(--bg-modal)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: 6,
            zIndex: 100000,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            minWidth: 160,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.suggestions && contextMenu.suggestions.length > 0 && (
            <>
              {contextMenu.suggestions.map((suggestion: string) => (
                <button
                  key={suggestion}
                  onClick={() => {
                     if (window.cyberNotesAPI && window.cyberNotesAPI.replaceMisspelling) {
                       window.cyberNotesAPI.replaceMisspelling(suggestion);
                     }
                     setContextMenu(null);
                  }}
                  style={{ textAlign: 'left', padding: '6px 10px', fontSize: 13, background: 'transparent', color: 'var(--text-primary)', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >{suggestion}</button>
              ))}
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            </>
          )}

          {contextMenu.misspelledWord && (
            <>
              <button
                onClick={() => {
                   if (window.cyberNotesAPI && window.cyberNotesAPI.addToDictionary) {
                     window.cyberNotesAPI.addToDictionary(contextMenu.misspelledWord!);
                   }
                   setContextMenu(null);
                }}
                style={{ textAlign: 'left', padding: '6px 10px', fontSize: 13, background: 'transparent', color: 'var(--success)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >Agregar "{contextMenu.misspelledWord}" al diccionario</button>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            </>
          )}

          {contextMenu.linkHref && (
            <>
              <button
                onClick={() => { window.open(contextMenu.linkHref, '_blank'); setContextMenu(null); }}
                style={{ textAlign: 'left', padding: '6px 10px', fontSize: 13, background: 'transparent', color: 'var(--accent-light)', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >Abrir en navegador</button>
              
              <button
                onClick={() => { 
                  setEditLinkData({ href: contextMenu.linkHref! });
                  setContextMenu(null);
                }}
                style={{ textAlign: 'left', padding: '6px 10px', fontSize: 13, background: 'transparent', color: 'var(--text-primary)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >Editar enlace</button>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            </>
          )}

          <button
            onClick={() => { editor.chain().focus().undo().run(); setContextMenu(null); }}
            disabled={!editor.can().undo()}
            style={{ textAlign: 'left', padding: '6px 10px', fontSize: 13, background: 'transparent', color: editor.can().undo() ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', borderRadius: 4, cursor: editor.can().undo() ? 'pointer' : 'default', opacity: editor.can().undo() ? 1 : 0.5 }}
            onMouseEnter={e => { if (editor.can().undo()) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >Deshacer</button>
          <button
            onClick={() => { editor.chain().focus().redo().run(); setContextMenu(null); }}
            disabled={!editor.can().redo()}
            style={{ textAlign: 'left', padding: '6px 10px', fontSize: 13, background: 'transparent', color: editor.can().redo() ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', borderRadius: 4, cursor: editor.can().redo() ? 'pointer' : 'default', opacity: editor.can().redo() ? 1 : 0.5 }}
            onMouseEnter={e => { if (editor.can().redo()) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >Rehacer</button>
          
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

          <button
            onClick={() => { document.execCommand('cut'); setContextMenu(null); }}
            style={{ textAlign: 'left', padding: '6px 10px', fontSize: 13, background: 'transparent', color: 'var(--text-primary)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >Cortar</button>
          <button
            onClick={() => { document.execCommand('copy'); setContextMenu(null); }}
            style={{ textAlign: 'left', padding: '6px 10px', fontSize: 13, background: 'transparent', color: 'var(--text-primary)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >Copiar</button>
          <button
            onClick={() => {
              navigator.clipboard.readText().then(text => {
                editor.chain().focus().insertContent(text).run();
              }).catch(() => {
                // Fallback para pegar
                document.execCommand('paste');
              });
              setContextMenu(null);
            }}
            style={{ textAlign: 'left', padding: '6px 10px', fontSize: 13, background: 'transparent', color: 'var(--text-primary)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >Pegar</button>
          
          <button
            onClick={() => { editor.chain().focus().selectAll().run(); setContextMenu(null); }}
            style={{ textAlign: 'left', padding: '6px 10px', fontSize: 13, background: 'transparent', color: 'var(--text-primary)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >Seleccionar todo</button>
          
          <button
            onClick={() => { editor.chain().focus().deleteSelection().run(); setContextMenu(null); }}
            style={{ textAlign: 'left', padding: '6px 10px', fontSize: 13, background: 'transparent', color: 'var(--danger)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--danger-dim)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >Eliminar</button>

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          
          <button
            onClick={() => { editor.chain().focus().toggleBold().run(); setContextMenu(null); }}
            style={{ textAlign: 'left', padding: '6px 10px', fontSize: 13, fontWeight: 'bold', background: 'transparent', color: 'var(--text-primary)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >Negrita</button>
          <button
            onClick={() => { editor.chain().focus().toggleItalic().run(); setContextMenu(null); }}
            style={{ textAlign: 'left', padding: '6px 10px', fontSize: 13, fontStyle: 'italic', background: 'transparent', color: 'var(--text-primary)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >Cursiva</button>
          <button
            onClick={() => { editor.chain().focus().toggleUnderline().run(); setContextMenu(null); }}
            style={{ textAlign: 'left', padding: '6px 10px', fontSize: 13, textDecoration: 'underline', background: 'transparent', color: 'var(--text-primary)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >Subrayado</button>

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          
          <button
            onClick={() => { editor.chain().focus().clearNodes().unsetAllMarks().run(); setContextMenu(null); }}
            style={{ textAlign: 'left', padding: '6px 10px', fontSize: 13, color: 'var(--text-muted)', background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >Limpiar formato</button>
        </div>,
        document.body
      )}

      {/* Modal Editar Enlace */}
      {editLinkData && editor && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--bg-editor-glass)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
        }} onClick={() => setEditLinkData(null)}>
          <div style={{
            background: 'var(--bg-modal)', padding: 24, borderRadius: 'var(--radius-lg)',
            width: 400, display: 'flex', flexDirection: 'column', gap: 16, border: '1px solid var(--border)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)', fontWeight: 600 }}>Editar enlace</h3>
            <input
              autoFocus
              type="url"
              value={editLinkData.href}
              onChange={e => setEditLinkData({ href: e.target.value })}
              className="input"
              placeholder="https://"
              onContextMenu={e => {
                e.preventDefault();
                setInputContextMenu({ x: e.clientX, y: e.clientY });
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                   if (editLinkData.href === '') {
                     editor.chain().focus().extendMarkRange('link').unsetLink().run();
                   } else {
                     if (editor.state.selection.empty && !editor.isActive('link')) {
                       editor.chain().focus().insertContent(`<a target="_blank" rel="noopener noreferrer" href="${editLinkData.href}">${editLinkData.href}</a> `).run();
                     } else {
                       editor.chain().focus().extendMarkRange('link').setLink({ href: editLinkData.href }).run();
                     }
                   }
                   setEditLinkData(null);
                }
                if (e.key === 'Escape') setEditLinkData(null);
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setEditLinkData(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => {
                 if (editLinkData.href === '') {
                   editor.chain().focus().extendMarkRange('link').unsetLink().run();
                 } else {
                   if (editor.state.selection.empty && !editor.isActive('link')) {
                     editor.chain().focus().insertContent(`<a target="_blank" rel="noopener noreferrer" href="${editLinkData.href}">${editLinkData.href}</a> `).run();
                   } else {
                     editor.chain().focus().extendMarkRange('link').setLink({ href: editLinkData.href }).run();
                   }
                 }
                 setEditLinkData(null);
              }}>Guardar</button>
            </div>
            
            {inputContextMenu && (
              <div style={{
                position: 'fixed',
                left: inputContextMenu.x,
                top: inputContextMenu.y,
                background: 'var(--bg-modal)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: 6,
                zIndex: 10001,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                minWidth: 140,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}>
                <button
                  onClick={() => { document.execCommand('cut'); setInputContextMenu(null); }}
                  style={{ textAlign: 'left', padding: '6px 10px', fontSize: 13, background: 'transparent', color: 'var(--text-primary)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >Cortar</button>
                <button
                  onClick={() => { document.execCommand('copy'); setInputContextMenu(null); }}
                  style={{ textAlign: 'left', padding: '6px 10px', fontSize: 13, background: 'transparent', color: 'var(--text-primary)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >Copiar</button>
                <button
                  onClick={() => {
                    navigator.clipboard.readText().then(text => {
                      setEditLinkData({ href: text });
                    });
                    setInputContextMenu(null);
                  }}
                  style={{ textAlign: 'left', padding: '6px 10px', fontSize: 13, background: 'transparent', color: 'var(--text-primary)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >Pegar y Reemplazar</button>
                <button
                  onClick={() => { setEditLinkData({ href: '' }); setInputContextMenu(null); }}
                  style={{ textAlign: 'left', padding: '6px 10px', fontSize: 13, background: 'transparent', color: 'var(--text-muted)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >Limpiar campo</button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .ProseMirror {
          caret-color: var(--text-primary) !important;
        }
      `}</style>
    </div>
  );
}
