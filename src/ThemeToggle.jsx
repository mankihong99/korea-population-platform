import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return localStorage.getItem('population-theme') === 'dark'; } catch { return false; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try { localStorage.setItem('population-theme', dark ? 'dark' : 'light'); } catch { /* Private storage may be unavailable. */ }
  }, [dark]);
  return <button type="button" className="theme-toggle" aria-label="다크모드" aria-pressed={dark} onClick={() => setDark(value => !value)}>
    {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    <span>{dark ? '라이트 모드' : '다크 모드'}</span>
  </button>;
}
