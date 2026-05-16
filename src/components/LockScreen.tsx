import { useState, useRef, useEffect } from 'react';
import { Lock, Eye, EyeOff, Shield, Minus, Square, X } from 'lucide-react';

interface Props {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: Props) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [hasPassword, setHasPassword] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.cyberNotesAPI.hasPassword().then(setHasPassword);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasPassword && !password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const ok = await window.cyberNotesAPI.verifyPassword(password);
      if (ok) {
        onUnlock();
      } else {
        setError('Contraseña incorrecta');
        setShaking(true);
        setPassword('');
        setTimeout(() => {
          setShaking(false);
          inputRef.current?.focus();
        }, 400);
      }
    } catch (err) {
      setError('Error al verificar contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-app)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        opacity: 0.4,
      }} />

      {/* Card */}
      <div
        className={shaking ? 'animate-shake' : ''}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '48px 40px',
          width: 380,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Window Controls */}
        <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          <button
            className="btn-icon"
            onClick={() => window.cyberNotesAPI.windowMinimize()}
            title="Minimizar"
            style={{ width: 26, height: 26 }}
          >
            <Minus size={12} />
          </button>
          <button
            className="btn-icon"
            onClick={() => window.cyberNotesAPI.windowMaximizeToggle()}
            title="Maximizar/Restaurar"
            style={{ width: 26, height: 26 }}
          >
            <Square size={11} />
          </button>
          <button
            className="btn-icon"
            onClick={() => window.cyberNotesAPI.windowClose()}
            title="Cerrar"
            style={{ width: 26, height: 26, color: 'var(--text-muted)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--danger)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 64,
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img 
              src="icon.png" 
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                boxShadow: '0 0 24px var(--accent-glow)',
              }} 
              alt="Logo"
            />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
              CyberNotes
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {hasPassword 
                ? 'Ingresa tu contraseña para continuar'
                : 'No has configurado una contraseña aún'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {hasPassword && (
            <div style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Contraseña"
                autoFocus
                className="input"
                style={{ paddingRight: 40, fontSize: 15 }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="btn-icon"
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
                tabIndex={-1}
              >
                {showPassword
                  ? <EyeOff size={16} color="var(--text-muted)" />
                  : <Eye size={16} color="var(--text-muted)" />}
              </button>
            </div>
          )}

          {error && (
            <div style={{
              color: 'var(--danger)',
              fontSize: 12,
              textAlign: 'center',
              background: 'var(--danger-dim)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '10px', fontSize: 14, fontWeight: 600 }}
          >
            {loading ? (
              <span style={{ opacity: 0.7 }}>Verificando...</span>
            ) : (
              <>
                <Lock size={15} />
                {hasPassword ? 'Desbloquear' : 'Entrar'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
