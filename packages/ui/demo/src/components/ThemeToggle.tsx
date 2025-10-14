import { type Theme } from '@improview/ui';
import './ThemeToggle.css';

interface ThemeToggleProps {
  currentTheme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ currentTheme, onToggle }: ThemeToggleProps) {
  return (
    <button className="theme-toggle" onClick={onToggle} aria-label="Toggle theme">
      <span className="theme-toggle__light">Switch to Dark Mode</span>
      <span className="theme-toggle__dark">Switch to Light Mode</span>
    </button>
  );
}
