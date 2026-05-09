import { useState, useEffect, useCallback } from 'react';
import { ThemeId } from './types';
import LockScreen from './components/LockScreen';
import MainApp from './components/MainApp';

type AppView = 'loading' | 'lock' | 'app';

export default function App() {
  const [view, setView] = useState<AppView>('loading');
  const [theme, setTheme] = useState<ThemeId>('cyber-dark');

  // Cargar tema guardado
  useEffect(() => {
    const init = async () => {
      try {
        const savedTheme = await window.cyberNotesAPI.getSetting('theme');
        if (savedTheme) {
          setTheme(savedTheme as ThemeId);
          applyTheme(savedTheme as ThemeId);
        }

        const hasPassword = await window.cyberNotesAPI.hasPassword();
        setView(hasPassword ? 'lock' : 'app');
      } catch (err) {
        console.error('Init error:', err);
        setView('app');
      }
    };
    init();
  }, []);

  const applyTheme = (t: ThemeId) => {
    document.documentElement.setAttribute('data-theme', t === 'cyber-dark' ? '' : t);
  };

  const handleThemeChange = useCallback(async (t: ThemeId) => {
    setTheme(t);
    applyTheme(t);
    await window.cyberNotesAPI.setSetting('theme', t);
  }, []);

  const handleUnlock = () => setView('app');

  const handleLock = () => setView('lock');

  if (view === 'loading') {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app)',
      }}>
        <div style={{ color: 'var(--accent)', fontSize: 28, fontWeight: 700, letterSpacing: -1 }}>
          CyberNotes
        </div>
      </div>
    );
  }

  if (view === 'lock') {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  return (
    <MainApp
      currentTheme={theme}
      onThemeChange={handleThemeChange}
      onLock={handleLock}
    />
  );
}
