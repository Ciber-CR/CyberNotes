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
  Plus, Pin, Keyboard, AlignLeft, AlignCenter, AlignRight, Braces, PanelLeft,
  Undo, Redo, Save, Download
} from 'lucide-react';

interface Props {
  note: Note | null;
  onSave: (note: Note) => void;
  onCreateNote: () => void;
  layoutMode: number;
  onToggleLayout: () => void;
  showLineCounter?: boolean;
  autosaveEnabled?: boolean;
  autoUnlockCapsLock?: boolean;
  autoUnlockCapsLockTimeout?: number;
  onAutoUnlockCapsLockChange?: (v: boolean) => void;
  uiScale?: number;
  onScaleChange?: (scale: number) => void;
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

export default function NoteEditor({ 
  note, 
  onSave, 
  onCreateNote, 
  layoutMode, 
  onToggleLayout, 
  showLineCounter, 
  autosaveEnabled = true,
  autoUnlockCapsLock = false,
  autoUnlockCapsLockTimeout = 8,
  onAutoUnlockCapsLockChange,
  uiScale = 1.0,
  onScaleChange
}: Props) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentNoteRef = useRef<Note | null>(note);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  // Sincronizar ref con cada render para que scheduleAutoSave siempre tenga la note actual
  const [pinned, setPinned] = useState(note?.pinned === 1);
  const [isRaw, setIsRaw] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, linkHref?: string, suggestions?: string[], misspelledWord?: string } | null>(null);
  const [editLinkData, setEditLinkData] = useState<{ href: string } | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [inputContextMenu, setInputContextMenu] = useState<{ x: number, y: number } | null>(null);
  const [lineInfo, setLineInfo] = useState({ line: 1, col: 1, total: 1 });
  const [textMetrics, setTextMetrics] = useState({ words: 0, chars: 0, readingTime: 0 });
  const [localTitle, setLocalTitle] = useState(note?.title || '');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isCapsLockActive, setIsCapsLockActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [capsToast, setCapsToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevCapsActiveRef = useRef<boolean | null>(null);

  // 1. Initial check on startup / mount
  useEffect(() => {
    const checkInitialCaps = async () => {
      if (window.cyberNotesAPI && window.cyberNotesAPI.checkCapsLock) {
        const isActive = await window.cyberNotesAPI.checkCapsLock();
        if (isActive) {
          setIsCapsLockActive(true);
          prevCapsActiveRef.current = true;
          if (autoUnlockCapsLock) {
            setTimeLeft(autoUnlockCapsLockTimeout);
          }
        } else {
          prevCapsActiveRef.current = false;
        }
      }
    };
    checkInitialCaps();
  }, [autoUnlockCapsLock, autoUnlockCapsLockTimeout]);

  // 2. Keyboard event listeners to capture physical typing updates
  useEffect(() => {
    const handleKeyboardActivity = (e: KeyboardEvent) => {
      const capActive = e.getModifierState && e.getModifierState("CapsLock");
      setIsCapsLockActive(!!capActive);

      if (autoUnlockCapsLock && capActive) {
        setTimeLeft(autoUnlockCapsLockTimeout);
      } else {
        setTimeLeft(0);
      }
    };

    window.addEventListener('keydown', handleKeyboardActivity, true);
    window.addEventListener('keyup', handleKeyboardActivity, true);

    return () => {
      window.removeEventListener('keydown', handleKeyboardActivity, true);
      window.removeEventListener('keyup', handleKeyboardActivity, true);
    };
  }, [autoUnlockCapsLock, autoUnlockCapsLockTimeout]);

  // 3. State transition toast trigger for physical CapsLock toggles
  useEffect(() => {
    // Avoid firing toast on the very first cold mount
    if (prevCapsActiveRef.current === null) {
      prevCapsActiveRef.current = isCapsLockActive;
      return;
    }

    if (prevCapsActiveRef.current !== isCapsLockActive) {
      if (isCapsLockActive) {
        setCapsToast("Bloq Mayús: ACTIVADO ⚠️");
      } else {
        // If it was auto-unlocked (timeLeft === 0), show a special Auto-desactivado toast
        if (autoUnlockCapsLock && timeLeft === 0) {
          setCapsToast("Bloq Mayús: AUTO-DESACTIVADO 💡");
        } else {
          setCapsToast("Bloq Mayús: DESACTIVADO ✅");
        }
      }

      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setCapsToast(null);
      }, 2000);

      prevCapsActiveRef.current = isCapsLockActive;
    }
  }, [isCapsLockActive, autoUnlockCapsLock, timeLeft]);

  // 4. Isolated cleanup for toast timeout on component unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // 5. Countdown timer loop effect
  useEffect(() => {
    if (!autoUnlockCapsLock || !isCapsLockActive || timeLeft <= 0) return;

    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoUnlockCapsLock, isCapsLockActive, timeLeft]);

  // 6. Unlock Caps Lock trigger effect when countdown hits 0 (Unconditional visual reset!)
  useEffect(() => {
    if (autoUnlockCapsLock && isCapsLockActive && timeLeft === 0) {
      const triggerUnlock = async () => {
        // Unconditionally clear visual indicators immediately!
        setIsCapsLockActive(false);

        if (window.cyberNotesAPI && window.cyberNotesAPI.unlockCapsLock) {
          await window.cyberNotesAPI.unlockCapsLock();
        }
      };
      triggerUnlock();
    }
  }, [autoUnlockCapsLock, isCapsLockActive, timeLeft]);

  useEffect(() => {
    const closeMenu = () => {
      setContextMenu(null);
      setInputContextMenu(null);
      setShowExportMenu(false);
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
      updateTextMetrics(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      updateLineInfo(editor);
    },
    onBlur: ({ editor }) => {
      const html = editor.getHTML();
      const current = currentNoteRef.current;
      if (!current) return;
      const preview = extractPreview(html);
      onSave({ ...current, content: html, preview });
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
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

  const updateTextMetrics = (editor: any) => {
    const text = editor.getText();
    const chars = text.length;
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const readingTime = Math.ceil(words / 200);
    setTextMetrics({ words, chars, readingTime });
  };

  const handleManualSave = useCallback(() => {
    if (!editor || !note) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const html = editor.getHTML();
    const preview = extractPreview(html);
    onSave({ ...note, content: html, title: localTitle, preview });
    setHasUnsavedChanges(false);
  }, [editor, note, localTitle, onSave]);

  // Sincronizar estado de cambios no guardados con el proceso principal
  useEffect(() => {
    window.cyberNotesAPI?.setUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges]);

  // Actualizar editor cuando cambia la nota seleccionada
  useEffect(() => {
    setPinned(note?.pinned === 1);
    setLocalTitle(note?.title || '');
    setHasUnsavedChanges(false);

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

    updateTextMetrics(editor);
    updateLineInfo(editor);
    
    if (note.title === 'Nueva nota') {
      setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus();
          const len = titleInputRef.current.value.length;
          titleInputRef.current.setSelectionRange(len, len);
        }
      }, 50);
    } else {
      editor.commands.focus('start');
    }
    setIsRaw(false);

    return () => {
      // Closure-based safeguard: flush save immediately when note changes or unmounts
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        const current = currentNoteRef.current;
        if (current && editor) {
          const html = editor.getHTML();
          const preview = extractPreview(html);
          onSave({ ...current, content: html, preview });
        }
      }
    };
  }, [note?.id, editor]);

  // Sincronizar ref con la note prop cuando cambia (mismo id, nuevo ref)
  useEffect(() => {
    currentNoteRef.current = note;
  }, [note]);

  const scheduleAutoSave = useCallback((html: string) => {
    if (!autosaveEnabled) {
      setHasUnsavedChanges(true);
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const current = currentNoteRef.current;
      if (!current) return;
      const preview = extractPreview(html);
      onSave({ ...current, content: html, preview });
    }, 500);
  }, [onSave, autosaveEnabled]);

  const handlePin = () => {
    if (!note) return;
    const newPinned = pinned ? 0 : 1;
    setPinned(!pinned);
    onSave({ ...note, pinned: newPinned });
    currentNoteRef.current = { ...note, pinned: newPinned };
  };

  const convertHtmlToMarkdown = (html: string): string => {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;

    const traverse = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }
      const el = node as HTMLElement;
      const childrenStr = Array.from(el.childNodes).map(traverse).join('');

      switch (el.tagName.toLowerCase()) {
        case 'p': return `\n${childrenStr}\n`;
        case 'h1': return `\n# ${childrenStr}\n`;
        case 'h2': return `\n## ${childrenStr}\n`;
        case 'h3': return `\n### ${childrenStr}\n`;
        case 'strong':
        case 'b': return `**${childrenStr}**`;
        case 'em':
        case 'i': return `*${childrenStr}*`;
        case 'u': return `_${childrenStr}_`;
        case 's':
        case 'strike':
        case 'del': return `~~${childrenStr}~~`;
        case 'ul': return `\n${childrenStr}\n`;
        case 'ol': return `\n${childrenStr}\n`;
        case 'li': return `* ${childrenStr}\n`;
        case 'blockquote': return `\n> ${childrenStr.trim().split('\n').join('\n> ')}\n`;
        case 'code': return `\`${childrenStr}\``;
        case 'pre': return `\n\`\`\`\n${childrenStr.trim()}\n\`\`\`\n`;
        case 'br': return '\n';
        case 'hr': return '\n---\n';
        case 'a': return `[${childrenStr}](${el.getAttribute('href') || ''})`;
        case 'img': return `![Imagen](${el.getAttribute('src') || ''})`;
        default: return childrenStr;
      }
    };

    return traverse(temp).trim().replace(/\n{3,}/g, '\n\n');
  };

  const handleExportMarkdown = () => {
    if (!note) return;
    const editorHtml = editor?.getHTML() || '';
    const title = note.title || 'Nota';
    const md = convertHtmlToMarkdown(editorHtml);
    const mdContent = `# ${title}\n\n${md}`;

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '-')}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const handleExportHtml = () => {
    if (!note) return;
    const editorHtml = editor?.getHTML() || '';
    const title = note.title || 'Nota';
    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0f0f13;
      color: #e2e8f0;
      line-height: 1.6;
      max-width: 700px;
      margin: 40px auto;
      padding: 0 20px;
    }
    h1 {
      font-size: 2.2em;
      border-bottom: 1px solid #2d3748;
      padding-bottom: 10px;
      color: #38bdf8;
      letter-spacing: -0.02em;
    }
    h2 { color: #f472b6; }
    h3 { color: #c084fc; }
    a { color: #38bdf8; text-decoration: none; }
    a:hover { text-underline-offset: 4px; text-decoration: underline; }
    pre {
      background: #1a1a24;
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
      border: 1px solid #2d3748;
    }
    code { font-family: monospace; }
    blockquote {
      border-left: 4px solid #a855f7;
      padding-left: 20px;
      margin-left: 0;
      color: #94a3b8;
      font-style: italic;
    }
    img { max-width: 100%; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div>${editorHtml}</div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '-')}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
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
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <input
                ref={titleInputRef}
                value={localTitle}
                onChange={e => {
                  setLocalTitle(e.target.value);
                  const current = currentNoteRef.current;
                  if (current) {
                    const updated = { ...current, title: e.target.value };
                    currentNoteRef.current = updated;
                    if (autosaveEnabled) {
                      onSave(updated);
                    } else {
                      setHasUnsavedChanges(true);
                    }
                  }
                }}
                className="title-input"
                style={{
                  width: '100%',
                  fontSize: 'calc(32px * var(--ui-scale))',
                  fontWeight: 700,
                  background: 'transparent',
                  border: 'none', outline: 'none', color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.03em',
                }}
              />
            </div>
            
            {/* Note-Level Actions Toolbar Panel */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              flexShrink: 0,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              padding: '4px 6px',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              marginTop: 4,
            }}>
              {/* Custom Keyboard/CapsLock Auto-Unlocker Toggle Button */}
              <style>{`
                @keyframes cyber-warning-pulse {
                  0% { border-color: rgba(239, 68, 68, 0.3); box-shadow: 0 0 4px rgba(239, 68, 68, 0.1); }
                  50% { border-color: rgba(239, 68, 68, 0.8); box-shadow: 0 0 10px rgba(239, 68, 68, 0.35); }
                  100% { border-color: rgba(239, 68, 68, 0.3); box-shadow: 0 0 4px rgba(239, 68, 68, 0.1); }
                }
                @keyframes dot-pulse {
                  0% { transform: scale(0.85); opacity: 0.5; }
                  50% { transform: scale(1.15); opacity: 1; }
                  100% { transform: scale(0.85); opacity: 0.5; }
                }
              `}</style>
              {/* Countdown Timer Badge */}
              <AnimatePresence>
                {autoUnlockCapsLock && isCapsLockActive && timeLeft > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, x: 5 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: 5 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#ef4444',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      boxShadow: '0 0 6px rgba(239, 68, 68, 0.2)',
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                      gap: 4,
                      animation: 'cyber-warning-pulse 1.5s infinite ease-in-out',
                    }}
                  >
                    <span>⏱️</span>
                    <span>
                      {(() => {
                        if (timeLeft < 60) return `${timeLeft}s`;
                        if (timeLeft < 3600) {
                          const m = Math.floor(timeLeft / 60);
                          const s = timeLeft % 60;
                          return `${m}:${s < 10 ? '0' : ''}${s}`;
                        }
                        const h = Math.floor(timeLeft / 3600);
                        const m = Math.floor((timeLeft % 3600) / 60);
                        return `${h}h ${m}m`;
                      })()}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                onClick={() => {
                  const nextVal = !autoUnlockCapsLock;
                  onAutoUnlockCapsLockChange?.(nextVal);
                  
                  // Trigger a beautiful floating toast alert
                  setCapsToast(nextVal 
                    ? "Bloq Mayús Auto-desactivar: ACTIVADO" 
                    : "Bloq Mayús Auto-desactivar: DESACTIVADO"
                  );
                  if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                  toastTimeoutRef.current = setTimeout(() => {
                    setCapsToast(null);
                  }, 2000);
                }}
                title={isCapsLockActive 
                  ? `Bloq Mayús ACTIVO (Auto-desactivar: ${autoUnlockCapsLock ? 'ENCENDIDO' : 'APAGADO'})`
                  : `Desactivar Bloq Mayús por inactividad (Estado: ${autoUnlockCapsLock ? 'ACTIVO' : 'INACTIVO'})`
                }
                style={{ 
                  padding: 6,
                  position: 'relative',
                  color: isCapsLockActive 
                    ? '#ef4444' 
                    : autoUnlockCapsLock 
                      ? 'var(--accent-light)' 
                      : 'var(--text-muted)',
                  background: autoUnlockCapsLock ? 'var(--accent-dim)' : 'transparent',
                  border: (isCapsLockActive && autoUnlockCapsLock)
                    ? '1px solid rgba(239, 68, 68, 0.4)' 
                    : '1px solid transparent',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  boxShadow: (isCapsLockActive && autoUnlockCapsLock)
                    ? '0 0 8px rgba(239, 68, 68, 0.25)' 
                    : 'none',
                  animation: (isCapsLockActive && autoUnlockCapsLock) 
                    ? 'cyber-warning-pulse 1.5s infinite ease-in-out' 
                    : 'none',
                }}
                onMouseEnter={e => { 
                  if (!autoUnlockCapsLock && !isCapsLockActive) e.currentTarget.style.color = 'var(--text-primary)'; 
                }}
                onMouseLeave={e => { 
                  if (!autoUnlockCapsLock && !isCapsLockActive) e.currentTarget.style.color = 'var(--text-muted)'; 
                }}
              >
                <Keyboard size={14} />
                
                {/* Pulsing Red Dot for physical CapsLock active state (Only active when feature is also enabled) */}
                {isCapsLockActive && autoUnlockCapsLock && (
                  <span style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 5,
                    height: 5,
                    background: '#ef4444',
                    borderRadius: '50%',
                    boxShadow: '0 0 6px #ef4444',
                    animation: 'dot-pulse 1.5s infinite ease-in-out',
                  }} />
                )}
              </button>

              {/* Pin */}
              <button 
                onClick={handlePin}
                title={pinned ? "Desfijar nota" : "Fijar nota"}
                style={{ 
                  padding: 6,
                  color: pinned ? 'var(--accent-light)' : 'var(--text-muted)',
                  background: pinned ? 'var(--accent-dim)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { if (!pinned) e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { if (!pinned) e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <Pin size={14} />
              </button>

              {/* Vista HTML */}
              <button 
                onClick={() => setIsRaw(!isRaw)}
                title="Vista HTML (Ver código fuente)"
                style={{ 
                  padding: 6,
                  color: isRaw ? 'var(--accent-light)' : 'var(--text-muted)',
                  background: isRaw ? 'var(--accent-dim)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { if (!isRaw) e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { if (!isRaw) e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <Braces size={14} />
              </button>

              <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 2px' }} />

              {/* Cambiar vista */}
              <button 
                onClick={onToggleLayout}
                title={`Cambiar vista (Actual: ${layoutMode} columnas)`}
                style={{ 
                  padding: 6,
                  color: 'var(--text-muted)',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <PanelLeft size={14} />
              </button>

              <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 2px' }} />

              {/* Exportar nota dropdown trigger */}
              <div style={{ position: 'relative', display: 'flex' }}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowExportMenu(!showExportMenu);
                  }}
                  title="Exportar nota (.md / .html)"
                  style={{ 
                    padding: 6,
                    color: showExportMenu ? 'var(--accent-light)' : 'var(--text-muted)',
                    background: showExportMenu ? 'var(--accent-dim)' : 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (!showExportMenu) e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { if (!showExportMenu) e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <Download size={14} />
                </button>

                <AnimatePresence>
                  {showExportMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: 6,
                        background: 'var(--bg-modal)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                        zIndex: 100,
                        minWidth: 180,
                        overflow: 'hidden',
                        padding: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                      }}
                      className="glass-effect"
                    >
                      <button
                        onClick={handleExportMarkdown}
                        style={{
                          padding: '8px 12px',
                          fontSize: 12,
                          textAlign: 'left',
                          background: 'transparent',
                          color: 'var(--text-primary)',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        📝 Exportar como Markdown (.md)
                      </button>
                      <button
                        onClick={handleExportHtml}
                        style={{
                          padding: '8px 12px',
                          fontSize: 12,
                          textAlign: 'left',
                          background: 'transparent',
                          color: 'var(--text-primary)',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        🌐 Exportar como HTML (.html)
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 16, opacity: 0.85, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <span>Creada: {new Date(note.created_at).toLocaleDateString()}</span>
              <span>•</span>
              <span>Editada: {new Date(note.updated_at).toLocaleTimeString()}</span>
            </div>

            {/* Manual Save status block inside the metadata row on the right */}
            {!autosaveEnabled && hasUnsavedChanges && (
              <motion.button
                onClick={handleManualSave}
                title="Guardar cambios pendientes"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--accent)',
                  background: 'var(--accent-dim)',
                  color: 'var(--accent-light)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 11,
                  boxShadow: '0 0 8px var(--accent-glow)',
                  animation: 'cyber-border-pulse 3s ease-in-out infinite',
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <Save size={12} />
                <span>Guardar</span>
              </motion.button>
            )}
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

      <div style={{
        padding: '6px 16px',
        background: 'var(--bg-notelist)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 10,
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        letterSpacing: 0.5,
        opacity: 0.95,
        flexShrink: 0
      }}>
        {/* Global UI Scale Text Size Controller */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
          <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.85, marginRight: 2 }}>Escala:</span>
          
          <button 
            onClick={() => onScaleChange?.(Math.max(0.8, parseFloat((uiScale - 0.05).toFixed(2))))}
            title="Reducir tamaño de interfaz (5%)"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-light)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            onMouseDown={e => e.preventDefault()}
          >
            <Minus size={11} />
          </button>

          <input 
            type="range"
            min="0.8"
            max="1.5"
            step="0.05"
            value={uiScale}
            onChange={(e) => onScaleChange?.(parseFloat(e.target.value))}
            style={{
              width: 80,
              height: 4,
              background: 'var(--border)',
              borderRadius: 2,
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer',
              accentColor: 'var(--accent)',
              transition: 'background 0.2s',
            }}
          />

          <button 
            onClick={() => onScaleChange?.(Math.min(1.5, parseFloat((uiScale + 0.05).toFixed(2))))}
            title="Aumentar tamaño de interfaz (5%)"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-light)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            onMouseDown={e => e.preventDefault()}
          >
            <Plus size={11} />
          </button>

          <span style={{ fontSize: 9.5, fontWeight: 700, minWidth: 32, color: 'var(--accent-light)', textAlign: 'right', marginLeft: 4 }}>
            {Math.round(uiScale * 100)}%
          </span>
        </div>

        {/* Editor Line/Col stats & Text Metrics */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: 0.85 }}>
          {showLineCounter && (
            <>
              <div style={{ display: 'flex', gap: 10 }}>
                <span>LN {lineInfo.line}</span>
                <span>COL {lineInfo.col}</span>
                <span>TOTAL {lineInfo.total} LN</span>
              </div>
              <span style={{ opacity: 0.3, fontWeight: 300 }}>|</span>
            </>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <span>{textMetrics.words} PALABRAS</span>
            <span>{textMetrics.chars} CARS</span>
            <span style={{ color: 'var(--accent-light)', fontWeight: 600 }}>{textMetrics.readingTime} {textMetrics.readingTime === 1 ? 'MIN' : 'MINS'} LEER</span>
          </div>
        </div>
      </div>

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

      <AnimatePresence>
        {capsToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
            style={{
              position: 'absolute',
              top: 75,
              left: '50%',
              x: '-50%',
              zIndex: 9999,
              background: 'var(--bg-modal)',
              border: '1px solid var(--accent)',
              color: 'var(--accent-light)',
              padding: '8px 18px',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              fontWeight: 600,
              boxShadow: '0 4px 20px var(--accent-glow)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            className="glass-effect"
          >
            <span style={{ color: 'var(--accent)' }}>ℹ️</span>
            <span>{capsToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .ProseMirror {
          caret-color: var(--text-primary) !important;
        }
        @keyframes cyber-border-pulse {
          0%, 100% { border-color: var(--accent); }
          25%      { border-color: var(--pulse-1); }
          50%      { border-color: var(--pulse-2); }
          75%      { border-color: var(--pulse-3); }
        }
      `}</style>
    </div>
  );
}
