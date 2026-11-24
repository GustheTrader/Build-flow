import { useEffect, useState } from 'react';

/** Light or dark for the field app: the phone's own setting until the person picks one (sunlight often wants light). */
const KEY = 'bf-field-theme';
const initial = (): 'light' | 'dark' => {
  try { const t = localStorage.getItem(KEY); if (t === 'light' || t === 'dark') return t; } catch { /* ignore */ }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};
export function useFieldTheme() {
  const [theme, setTheme] = useState(initial);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b0b0c' : '#f7f5f2');
    try { localStorage.setItem(KEY, theme); } catch { /* ignore */ }
  }, [theme]);
  return [theme, setTheme] as const;
}
