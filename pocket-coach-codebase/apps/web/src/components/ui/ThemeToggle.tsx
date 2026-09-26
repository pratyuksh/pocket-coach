import React from 'react';
import { useTheme } from '../../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle Theme"
      className={`relative p-2.5 rounded-xl bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm transition-all duration-200 cursor-pointer ${className}`}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-amber-400 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 text-indigo-600 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
};
