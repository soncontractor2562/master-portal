import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({ isDark: true, toggle: () => {} });

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('app_theme');
      return saved ? saved === 'dark' : true; // default dark
    } catch { return true; }
  });

  useEffect(() => {
    // Apply to Master Portal HTML root
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('app_theme', isDark ? 'dark' : 'light');

    // Broadcast to all iframes
    const theme = isDark ? 'dark' : 'light';
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(f => {
      try { f.contentWindow.postMessage({ type: 'SET_THEME', theme }, '*'); } catch (_) {}
    });
  }, [isDark]);

  const toggle = () => setIsDark(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
