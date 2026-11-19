import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { Logo } from './Logo';

export interface HeaderNavProps {
  title?: string;
  userEmail?: string;
  onSignOut?: () => void;
  onLogoClick?: () => void;
  subconsciousActive?: boolean;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  title,
  userEmail,
  onSignOut,
  onLogoClick,
  subconsciousActive = false,
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <header
      className={`h-10 pointer-coarse:h-14 w-full bg-paper border-b border-paper-darker flex items-center justify-between px-4 select-none flex-shrink-0 transition-all duration-500 ${
        subconsciousActive ? 'opacity-10 pointer-events-none' : ''
      }`}
    >
      {/* Left: Logo + back to home / title */}
      <div className="flex items-center gap-2">
        <button
          onClick={onLogoClick}
          className="rounded-lg px-1 -mx-1 hover:opacity-80 transition cursor-pointer"
          title="All Songs"
          aria-label="All songs"
        >
          <Logo size={20} />
        </button>
        {title && (
          <span className="text-[10px] bg-paper-dark border border-paper-darker text-ink-muted px-1.5 py-0.5 rounded font-mono font-medium">
            {title}
          </span>
        )}
      </div>

      {/* Right: Theme toggle + User + Sign Out */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="w-8 h-8 pointer-coarse:w-11 pointer-coarse:h-11 flex items-center justify-center text-ink-muted hover:text-ink hover:bg-paper-active transition rounded-lg cursor-pointer"
          title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        {userEmail && (
          <span className="text-[11px] text-ink-muted hidden sm:inline">
            {userEmail}
          </span>
        )}
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="h-8 pointer-coarse:h-11 px-3 text-xs font-medium text-ink-muted hover:text-ink hover:bg-paper-active transition border border-paper-darker rounded-lg cursor-pointer"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
};
