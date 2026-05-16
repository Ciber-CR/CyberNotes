import { useState, useEffect, useCallback } from 'react';
import { ThemeId } from './types';
import { applyThemeVars } from './themes';
import LockScreen from './components/LockScreen';
import MainApp from './components/MainApp';

type AppView = 'loading' | 'lock' | 'app';

export default function App() {
  const [view, setView] = useState<AppView>('loading');
  const [theme, setTheme] = useState<ThemeId>('cyber-dark');
  const [colorIntensity, setColorIntensity] = useState(50);

  // Cargar tema e intensidad guardados
  useEffect(() => {
    const init = async () => {
      try {
        const savedTheme = await window.cyberNotesAPI.getSetting('theme');
        const savedIntensity = await window.cyberNotesAPI.getSetting('colorIntensity');
        let t = savedTheme ? (savedTheme as ThemeId) : 'cyber-dark';
        let i = savedIntensity ? parseInt(savedIntensity) : 50;
        setTheme(t);
        setColorIntensity(i);
        applyThemeVars(t, i);

        const hasPassword = await window.cyberNotesAPI.hasPassword();
        setView(hasPassword ? 'lock' : 'app');
      } catch (err) {
        console.error('Init error:', err);
        setView('app');
      }
    };
    init();
  }, []);

  const handleThemeChange = useCallback(async (t: ThemeId) => {
    setTheme(t);
    applyThemeVars(t, colorIntensity);
    await window.cyberNotesAPI.setSetting('theme', t);
  }, [colorIntensity]);

  const handleIntensityChange = useCallback(async (v: number) => {
    setColorIntensity(v);
    applyThemeVars(theme, v);
    await window.cyberNotesAPI.setSetting('colorIntensity', v.toString());
  }, [theme]);

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
      colorIntensity={colorIntensity}
      onIntensityChange={handleIntensityChange}
      onLock={handleLock}
    />
  );
}
