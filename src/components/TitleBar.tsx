import { Minus, Square, X, BookOpen } from 'lucide-react';

interface Props {
  onLock?: () => void;
}

export default function TitleBar({ onLock }: Props) {
  return (
    <div
      className="glass-effect titlebar-glass"
      style={{
        height: 'var(--titlebar-height)',
        background: 'var(--bg-sidebar)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px 0 16px',
        flexShrink: 0,
        WebkitAppRegion: 'drag',
      } as any}
    >
      {/* Logo + título */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 22,
          height: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <img src="icon.png" style={{ width: 22, height: 22, borderRadius: 4 }} alt="Logo" />
        </div>
        <span style={{
          fontSize: 'calc(13px * var(--ui-scale))',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: 0.3,
        }}>
          CyberNotes
        </span>
      </div>

      {/* Controles de ventana */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 4, WebkitAppRegion: 'no-drag' } as any}
      >
        <button
          className="btn-icon titlebar-btn"
          onClick={() => window.cyberNotesAPI.windowMinimize()}
          title="Minimizar"
          style={{ width: 28, height: 28 }}
        >
          <Minus size={13} />
        </button>
        <button
          className="btn-icon titlebar-btn"
          onClick={() => window.cyberNotesAPI.windowMaximizeToggle()}
          title="Maximizar"
          style={{ width: 28, height: 28 }}
        >
          <Square size={11} />
        </button>
        <button
          className="btn-icon titlebar-btn close-btn"
          onClick={() => window.cyberNotesAPI.windowClose()}
          title="Cerrar"
          style={{ width: 28, height: 28 }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
