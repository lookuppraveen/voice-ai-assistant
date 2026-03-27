'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx>({ theme: 'dark', toggle: () => {} });

const apply = (t: Theme) => {
  if (t === 'dark') document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start with undefined so we never render with a guessed value on the server.
  // The inline <script> in layout.tsx already applied the correct class before hydration.
  const [theme, setTheme] = useState<Theme | undefined>(undefined);

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    const initial = stored ?? 'dark';
    apply(initial);
    setTheme(initial);
  }, []);

  const toggle = () => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      apply(next);
      return next;
    });
  };

  // Render children immediately — the inline script already set the correct
  // class so there's no flash. We just haven't wired up the context value yet.
  return (
    <ThemeContext.Provider value={{ theme: theme ?? 'dark', toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
