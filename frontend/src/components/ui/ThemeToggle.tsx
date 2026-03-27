'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/theme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative h-8 w-14 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50
        bg-slate-700 dark:bg-slate-700
        light:bg-gray-200"
      style={{ background: theme === 'dark' ? '#334155' : '#e2e8f0' }}
    >
      {/* Track icons */}
      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
        <Moon className="h-3.5 w-3.5 text-indigo-300" />
      </span>
      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
        <Sun className="h-3.5 w-3.5 text-amber-400" />
      </span>

      {/* Thumb */}
      <span
        className={`absolute top-1 h-6 w-6 rounded-full shadow-md transition-transform duration-300 flex items-center justify-center
          ${theme === 'dark'
            ? 'translate-x-0 bg-indigo-500'
            : 'translate-x-6 bg-amber-400'
          }`}
      >
        {theme === 'dark'
          ? <Moon className="h-3 w-3 text-white" />
          : <Sun className="h-3 w-3 text-white" />
        }
      </span>
    </button>
  );
}
