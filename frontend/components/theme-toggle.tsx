'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const synchronize = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem('izyprice-theme'); } catch { /* Storage may be disabled. */ }
      const next = saved === 'dark' || (saved !== 'light' && media.matches);
      document.documentElement.dataset.theme = next ? 'dark' : 'light';
      setDark(next);
    };
    synchronize();
    media.addEventListener('change', synchronize);
    window.addEventListener('storage', synchronize);
    return () => {
      media.removeEventListener('change', synchronize);
      window.removeEventListener('storage', synchronize);
    };
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    try { localStorage.setItem('izyprice-theme', next ? 'dark' : 'light'); } catch { /* The current session still changes theme. */ }
  }

  return <Button variant="outline" size="icon" onClick={toggle}
    aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'}
    title={dark ? 'Ativar tema claro' : 'Ativar tema escuro'}>
    {dark ? <Sun size={18} /> : <Moon size={18} />}
  </Button>;
}
