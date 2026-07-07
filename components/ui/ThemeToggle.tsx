import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import Button from './Button';

const ThemeToggle: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { resolved, mode, setMode, toggle } = useTheme();

  if (compact) {
    return (
      <Button
        variant="ghost"
        iconOnly
        onClick={toggle}
        aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} mode`}
        title={`${resolved === 'dark' ? 'Light' : 'Dark'} mode`}
      >
        <i className={`fas ${resolved === 'dark' ? 'fa-sun' : 'fa-moon'}`} aria-hidden="true" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-muted)] border border-[var(--border)]" role="group" aria-label="Theme">
      {(['light', 'dark', 'system'] as const).map(option => (
        <button
          key={option}
          type="button"
          onClick={() => setMode(option)}
          className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
            mode === option
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
          aria-pressed={mode === option}
        >
          {option}
        </button>
      ))}
    </div>
  );
};

export default ThemeToggle;
