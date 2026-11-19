import React from 'react';
import { Sun, Moon, User, LogOut } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Button } from './ui/Button';
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

      {/* Right: Theme toggle + Profile menu (email, sign out) */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-lg"
          title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        {(userEmail || onSignOut) && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full font-semibold uppercase"
                aria-label="Account menu"
                title="Account"
              >
                {userEmail ? userEmail.charAt(0) : <User className="w-4 h-4" />}
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="radix-menu-content" align="end" sideOffset={6}>
                {userEmail && (
                  <DropdownMenu.Label className="px-3 py-2 text-[11px] text-ink-muted max-w-[220px] truncate">
                    {userEmail}
                  </DropdownMenu.Label>
                )}
                {onSignOut && (
                  <DropdownMenu.Item className="radix-menu-item is-danger" onSelect={onSignOut}>
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </DropdownMenu.Item>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>
    </header>
  );
};
