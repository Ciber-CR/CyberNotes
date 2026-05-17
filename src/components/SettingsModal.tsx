import { useState, useEffect, useRef } from 'react';
import { ThemeId } from '../types';
import { THEMES, isColorfulTheme, getPreviewColor } from '../themes';
import { X, Lock, Shield, FolderOpen, Palette, Monitor, Trash2, Eye, EyeOff, Download, Upload } from 'lucide-react';

interface Props {
  currentTheme: ThemeId;
  onThemeChange: (t: ThemeId) => void;
  colorIntensity: number;
  onIntensityChange: (v: number) => void;
  bgImage: string | null;
  onBgImageChange: (url: string | null) => void;
  glassBlur: number;
  onBlurChange: (v: number) => void;
  bgOpacity: number;
  onOpacityChange: (v: number) => void;
  autoLockMinutes: number;
  onAutoLockChange: (v: number) => void;
  rememberLastNote: boolean;
  onRememberLastNoteChange: (v: boolean) => void;
  showLineCounter: boolean;
  onShowLineCounterChange: (v: boolean) => void;
  autosaveEnabled: boolean;
  onAutosaveEnabledChange: (v: boolean) => void;
  autoUnlockCapsLock: boolean;
  onAutoUnlockCapsLockChange: (v: boolean) => void;
  autoUnlockCapsLockTimeout: number;
  onAutoUnlockCapsLockTimeoutChange: (v: number) => void;
  onClose: () => void;
  onLock: () => void;
}

type Tab = 'general' | 'security' | 'about';

export default function SettingsModal({ 
  currentTheme, onThemeChange, colorIntensity, onIntensityChange, 
  bgImage, onBgImageChange, glassBlur, onBlurChange, bgOpacity, onOpacityChange,
  autoLockMinutes, onAutoLockChange,
  rememberLastNote, onRememberLastNoteChange,
  showLineCounter, onShowLineCounterChange,
  autosaveEnabled, onAutosaveEnabledChange,
  autoUnlockCapsLock, onAutoUnlockCapsLockChange,
  autoUnlockCapsLockTimeout, onAutoUnlockCapsLockTimeoutChange,
  onClose, onLock 
}: Props) {
  const [tab, setTab] = useState<Tab>('general');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdMessage, setPwdMessage] = useState('');
  const [pwdError, setPwdError] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [closeToTray, setCloseToTray] = useState(false);
  const [autoStart, setAutoStart] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const val = await window.cyberNotesAPI.getSetting('close_to_tray');
      setCloseToTray(val === 'true');
      const isAutoStart = await window.cyberNotesAPI.getAutoStart();
      setAutoStart(isAutoStart);
    };
    loadSettings();
  }, []);

  const handleToggleTray = async (val: boolean) => {
    setCloseToTray(val);
    await window.cyberNotesAPI.setSetting('close_to_tray', val.toString());
  };

  const handleToggleAutoStart = async (val: boolean) => {
    setAutoStart(val);
    await window.cyberNotesAPI.setAutoStart(val);
  };

  const handleSetPassword = async () => {
    setPwdMessage('');
    setPwdError(false);

    if (newPwd.length < 4) {
      setPwdMessage('La contraseña debe tener al menos 4 caracteres');
      setPwdError(true);
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMessage('Las contraseñas no coinciden');
      setPwdError(true);
      return;
    }

    setPwdLoading(true);
    try {
      // Verificar contraseña actual si existe
      const hasPassword = await window.cyberNotesAPI.hasPassword();
      if (hasPassword) {
        if (!currentPwd) {
          setPwdMessage('Ingresa tu contraseña actual');
          setPwdError(true);
          return;
        }
        const ok = await window.cyberNotesAPI.verifyPassword(currentPwd);
        if (!ok) {
          setPwdMessage('Contraseña actual incorrecta');
          setPwdError(true);
          return;
        }
      }

      await window.cyberNotesAPI.setPassword(newPwd);
      setPwdMessage('✓ Contraseña guardada correctamente');
      setPwdError(false);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch {
      setPwdMessage('Error al guardar la contraseña');
      setPwdError(true);
    } finally {
      setPwdLoading(false);
    }
  };

  const handleRemovePassword = async () => {
    if (!confirm('¿Eliminar la contraseña de acceso? La app quedará sin protección.')) return;
    const ok = await window.cyberNotesAPI.verifyPassword(currentPwd);
    if (!ok) {
      setPwdMessage('Contraseña actual incorrecta');
      setPwdError(true);
      return;
    }
    await window.cyberNotesAPI.removePassword();
    setPwdMessage('✓ Contraseña eliminada');
    setPwdError(false);
    setCurrentPwd('');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: bgImage ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9998,
      backdropFilter: bgImage ? 'blur(2px)' : 'blur(4px)',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="animate-fade-in"
        style={{
          background: 'var(--bg-modal)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          width: 560,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <h2 style={{ fontSize: 'calc(18px * var(--ui-scale))', fontWeight: 700, color: 'var(--text-primary)' }}>⚙️ Ajustes</h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '16px 24px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {[
            { id: 'general' as Tab, label: 'General', icon: <Palette size={14} /> },
            { id: 'security' as Tab, label: 'Seguridad', icon: <Shield size={14} /> },
            { id: 'about' as Tab, label: 'Acerca de', icon: <Monitor size={14} /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                background: tab === t.id ? 'var(--bg-active)' : 'transparent',
                color: tab === t.id ? 'var(--accent-light)' : 'var(--text-muted)',
                fontWeight: tab === t.id ? 600 : 400,
                fontSize: 13,
                cursor: 'pointer',
                borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'all var(--transition)',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {/* ── GENERAL ── */}
          {tab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Tema visual
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {THEMES.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => onThemeChange(theme.id as ThemeId)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: currentTheme === theme.id ? `2px solid var(--accent)` : '1px solid var(--border)',
                        background: currentTheme === theme.id ? 'var(--accent-dim)' : 'var(--bg-surface)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        transition: 'all var(--transition)',
                        boxShadow: currentTheme === theme.id ? '0 0 12px var(--accent-glow)' : 'none',
                      }}
                    >
                      <div style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: getPreviewColor(theme.id, currentTheme === theme.id ? colorIntensity : 50),
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 16,
                      }}>
                        {theme.emoji}
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{theme.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {currentTheme === theme.id ? '● Activo' : 'Click para activar'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                opacity: isColorfulTheme(currentTheme) ? 1 : 0.4,
                pointerEvents: isColorfulTheme(currentTheme) ? 'auto' : 'none',
                transition: 'opacity var(--transition)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>Intensidad de color</span>
                  <span style={{ fontSize: 13, color: 'var(--accent-light)', fontWeight: 700, background: 'var(--accent-dim)', padding: '2px 8px', borderRadius: 4 }}>
                    {colorIntensity}%
                  </span>
                </div>
                <input 
                  type="range" min="0" max="100" step="5" 
                  value={colorIntensity}
                  onChange={(e) => onIntensityChange(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  <span>Suave</span>
                  <span>Intenso</span>
                </div>
                {!isColorfulTheme(currentTheme) && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
                    No aplica para {currentTheme === 'graphite' ? 'Graphite' : 'Light'}
                  </div>
                )}
              </div>

              <div className="divider" />
 


              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Fondo Personalizado
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Selector de Imagen */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{
                      width: 80,
                      height: 50,
                      borderRadius: 8,
                      background: bgImage ? `url("${bgImage}")` : 'var(--bg-surface)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      border: '1px solid var(--border)',
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ flex: 1, fontSize: 12 }}
                        onClick={async () => {
                          const url = await window.cyberNotesAPI.selectAndSaveImage();
                          if (url) onBgImageChange(url);
                        }}
                      >
                        Cambiar imagen
                      </button>
                      {bgImage && (
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '8px 12px' }}
                          onClick={() => onBgImageChange(null)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sliders */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-primary)' }}>Efecto Glass (Desenfoque)</span>
                        <span style={{ color: 'var(--accent-light)' }}>{glassBlur}px</span>
                      </div>
                      <input 
                        type="range" min="0" max="40" step="1" 
                        value={glassBlur} onChange={(e) => onBlurChange(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent)' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-primary)' }}>Opacidad del Overlay</span>
                        <span style={{ color: 'var(--accent-light)' }}>{Math.round(bgOpacity * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="0.95" step="0.05" 
                        value={bgOpacity} onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="divider" />

              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Comportamiento
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>Cerrar a la bandeja de sistema</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Al presionar X, la app se mantendrá activa en la bandeja</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={closeToTray}
                      onChange={(e) => handleToggleTray(e.target.checked)}
                      style={{
                        width: 40,
                        height: 20,
                        appearance: 'none',
                        background: closeToTray ? 'var(--accent)' : 'var(--border)',
                        borderRadius: 10,
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                    />
                  </label>

                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>Iniciar con Windows (minimizado)</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>La app se abrirá en la bandeja al arrancar el equipo</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={autoStart}
                      onChange={(e) => handleToggleAutoStart(e.target.checked)}
                      style={{
                        width: 40,
                        height: 20,
                        appearance: 'none',
                        background: autoStart ? 'var(--accent)' : 'var(--border)',
                        borderRadius: 10,
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                    />
                  </label>

                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>Recordar última nota al abrir</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>La app se reabrirá en la nota donde la dejaste</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={rememberLastNote}
                      onChange={(e) => onRememberLastNoteChange(e.target.checked)}
                      style={{
                        width: 40,
                        height: 20,
                        appearance: 'none',
                        background: rememberLastNote ? 'var(--accent)' : 'var(--border)',
                        borderRadius: 10,
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                    />
                  </label>

                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>Mostrar contador de líneas</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Muestra la línea y columna actual en el editor</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={showLineCounter}
                      onChange={(e) => onShowLineCounterChange(e.target.checked)}
                      style={{
                        width: 40,
                        height: 20,
                        appearance: 'none',
                        background: showLineCounter ? 'var(--accent)' : 'var(--border)',
                        borderRadius: 10,
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                    />
                  </label>

                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>Autoguardado</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Guardar automáticamente al editar. Si se desactiva, usa el botón Guardar en el editor.</span>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={autosaveEnabled}
                      onChange={(e) => onAutosaveEnabledChange(e.target.checked)}
                      style={{
                        width: 40,
                        height: 20,
                        appearance: 'none',
                        background: autosaveEnabled ? 'var(--accent)' : 'var(--border)',
                        borderRadius: 10,
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                    />
                  </label>

                  <div style={{
                    display: 'flex', 
                    flexDirection: 'column',
                    padding: '12px 16px',
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    gap: 12,
                  }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      width: '100%',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>Desactivar Bloq Mayús por inactividad</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Desactiva físicamente el Bloq Mayús tras un periodo ajustable de inactividad de teclado en el editor</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={autoUnlockCapsLock}
                        onChange={(e) => onAutoUnlockCapsLockChange(e.target.checked)}
                        style={{
                          width: 40,
                          height: 20,
                          appearance: 'none',
                          background: autoUnlockCapsLock ? 'var(--accent)' : 'var(--border)',
                          borderRadius: 10,
                          position: 'relative',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                          flexShrink: 0,
                        }}
                      />
                    </label>

                    {autoUnlockCapsLock && (
                      <div style={{
                        marginTop: 4,
                        padding: '10px 14px',
                        background: 'var(--bg-notelist)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Tiempo de inactividad</span>
                          <span style={{ fontSize: 11, color: 'var(--accent-light)', fontWeight: 700 }}>
                            {(() => {
                              const CAPS_LOCK_STEPS = [5, 10, 15, 30, 45, 60, 120, 300, 600, 900, 1800, 3600, 7200, 10800, 21600];
                              const CAPS_LOCK_LABELS = ['5s', '10s', '15s', '30s', '45s', '1m', '2m', '5m', '10m', '15m', '30m', '1h', '2h', '3h', '6h'];
                              const idx = CAPS_LOCK_STEPS.indexOf(autoUnlockCapsLockTimeout);
                              return idx !== -1 ? CAPS_LOCK_LABELS[idx] : '8s';
                            })()}
                          </span>
                        </div>
                        <input 
                          type="range"
                          min="0"
                          max="14"
                          step="1"
                          value={(() => {
                            const CAPS_LOCK_STEPS = [5, 10, 15, 30, 45, 60, 120, 300, 600, 900, 1800, 3600, 7200, 10800, 21600];
                            const idx = CAPS_LOCK_STEPS.indexOf(autoUnlockCapsLockTimeout);
                            return idx !== -1 ? idx : 1;
                          })()}
                          onChange={(e) => {
                            const CAPS_LOCK_STEPS = [5, 10, 15, 30, 45, 60, 120, 300, 600, 900, 1800, 3600, 7200, 10800, 21600];
                            const idx = parseInt(e.target.value);
                            onAutoUnlockCapsLockTimeoutChange(CAPS_LOCK_STEPS[idx]);
                          }}
                          style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="divider" />

              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Herramientas y Datos
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    className="btn btn-ghost"
                    onClick={() => window.cyberNotesAPI.openDevTools()}
                    style={{ gap: 8, fontSize: 13 }}
                  >
                    <Monitor size={15} />
                    Abrir consola
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => window.cyberNotesAPI.openDataFolder()}
                    style={{ gap: 8, fontSize: 13 }}
                  >
                    <FolderOpen size={15} />
                    Carpeta de datos
                  </button>
                  
                  <button
                    className="btn btn-ghost"
                    onClick={async () => {
                      const ok = await window.cyberNotesAPI.exportData();
                      if (ok) alert('Datos exportados exitosamente.');
                    }}
                    style={{ gap: 8, fontSize: 'calc(13px * var(--ui-scale))' }}
                  >
                    <Download size={15} />
                    Exportar Backup (JSON)
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ gap: 8, fontSize: 13, color: 'var(--warning)' }}
                    onClick={async () => {
                      if (!confirm('Importar un backup mezclará los datos con los actuales. ¿Deseas continuar?')) return;
                      const ok = await window.cyberNotesAPI.importData();
                      if (ok) {
                        alert('Datos importados correctamente. La aplicación se recargará.');
                        window.location.reload();
                      }
                    }}
                  >
                    <Upload size={15} />
                    Importar Backup
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── SECURITY ── */}
          {tab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                La contraseña protege el acceso a la app. Deja los campos vacíos si no quieres contraseña.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={currentPwd}
                    onChange={e => setCurrentPwd(e.target.value)}
                    placeholder="Contraseña actual (si tienes una)"
                    className="input"
                    style={{ paddingRight: 36 }}
                  />
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => setShowPwd(!showPwd)}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                <input
                  type={showPwd ? 'text' : 'password'}
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  placeholder="Nueva contraseña"
                  className="input"
                />

                <input
                  type={showPwd ? 'text' : 'password'}
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  placeholder="Confirmar nueva contraseña"
                  className="input"
                  onKeyDown={e => { if (e.key === 'Enter') handleSetPassword(); }}
                />

                {pwdMessage && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: pwdError ? 'var(--danger-dim)' : 'rgba(34,197,94,0.12)',
                    color: pwdError ? 'var(--danger)' : 'var(--success)',
                    fontSize: 12,
                  }}>
                    {pwdMessage}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleSetPassword}
                    disabled={pwdLoading}
                    style={{ flex: 1, gap: 6 }}
                  >
                    <Lock size={14} />
                    {pwdLoading ? 'Guardando...' : 'Guardar contraseña'}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleRemovePassword}
                    title="Eliminar contraseña"
                    style={{ gap: 6 }}
                  >
                    <Trash2 size={14} />
                    Quitar
                  </button>
                </div>
              </div>

              <div className="divider" />

              <button
                className="btn btn-ghost"
                onClick={() => { onClose(); onLock(); }}
                style={{ gap: 8, fontSize: 'calc(13px * var(--ui-scale))', justifyContent: 'flex-start' }}
              >
                <Lock size={14} />
                Bloquear app ahora
              </button>

              <div className="divider" />

              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Auto-bloqueo por inactividad
                </h3>
                <div style={{ 
                  padding: '16px',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ color: 'var(--accent)', opacity: 0.8 }}><Shield size={18} /></div>
                    <select 
                      value={autoLockMinutes}
                      onChange={(e) => onAutoLockChange(parseInt(e.target.value))}
                      className="input"
                      style={{ flex: 1, background: 'var(--bg-app)', cursor: 'pointer' }}
                    >
                      <option value="0">Nunca (Desactivado)</option>
                      <option value="1">Después de 1 minuto</option>
                      <option value="5">Después de 5 minutos</option>
                      <option value="15">Después de 15 minutos</option>
                      <option value="30">Después de 30 minutos</option>
                      <option value="60">Después de 1 hora</option>
                    </select>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                    La aplicación se bloqueará automáticamente si no detecta actividad del ratón o teclado durante el tiempo seleccionado.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── ABOUT ── */}
          {tab === 'about' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '20px 0' }}>
                <img 
                  src="icon.png" 
                  alt="CyberNotes Icon" 
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 20,
                    boxShadow: '0 0 32px var(--accent-glow)',
                  }} 
                />
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>CyberNotes</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 13 }}>Versión 1.0.0</p>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', maxWidth: 300, lineHeight: 1.7 }}>
                Tu app de notas personal. Offline, privada, y rápida.
                Construida con Electron + React + TipTap.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
