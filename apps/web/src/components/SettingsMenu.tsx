import { useEffect, useId, useRef, useState } from 'react';
import { IconButton, type ThemeMode } from '@improview/ui';
import clsx from 'clsx';
import { Moon, Settings, Sun } from 'lucide-react';
import { useTheme } from '../providers/ThemeProvider';
import { useAuthStore } from '../state/authStore';
import { AUTH_SESSION_KEYS, authService } from '../services/authService';

export const SettingsMenu = () => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      menuRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  const handleToggleMenu = () => {
    setOpen((prev) => !prev);
  };

  const handleToggleTheme = () => {
    setTheme((prev: ThemeMode) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLogout = () => {
    logout();
    sessionStorage.removeItem(AUTH_SESSION_KEYS.codeVerifier);
    sessionStorage.removeItem(AUTH_SESSION_KEYS.state);
    sessionStorage.removeItem(AUTH_SESSION_KEYS.redirect);
    setOpen(false);
    try {
      const logoutUrl = authService.getLogoutUrl(window.location.origin);
      window.location.assign(logoutUrl);
    } catch (error) {
      console.error('Failed to compute logout URL', error);
      window.location.href = '/auth/login';
    }
  };

  const isDark = theme === 'dark';
  const Icon = isDark ? Moon : Sun;

  return (
    <div className="relative">
      <IconButton
        ref={triggerRef}
        icon={<Settings className="h-5 w-5" />}
        size="sm"
        variant="ghost"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-label="Open settings menu"
        onClick={handleToggleMenu}
      />
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          tabIndex={-1}
          className="absolute right-0 mt-2 w-48 rounded-md border border-border-subtle bg-bg-panel p-2 text-sm text-fg shadow-md focus:outline-none"
        >
          <div className="flex flex-col gap-1 pb-2">
            <p className="px-2 text-xs font-medium uppercase tracking-wide text-fg-muted">Account</p>
            <div className="rounded-md px-2 py-1 text-sm text-fg">
              <span className="block truncate font-medium">{user?.username ?? 'Signed in'}</span>
              {user?.email ? <span className="block text-xs text-fg-muted">{user.email}</span> : null}
            </div>
            <button
              type="button"
              className="rounded-md px-2 py-2 text-left font-medium text-danger-600 transition-colors hover:bg-danger-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              onClick={handleLogout}
            >
              Sign out
            </button>
          </div>
          <div className="my-2 h-px w-full bg-border-subtle" />
          <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-fg-muted">
            Appearance
          </p>
          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            aria-label="Toggle dark mode"
            className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left transition-colors hover:bg-bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            onClick={handleToggleTheme}
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" aria-hidden="true" />
                Dark mode
              </span>
            <span
              className={clsx(
                'relative flex h-6 w-11 items-center rounded-full border transition-colors',
                isDark ? 'border-accent bg-accent' : 'border-border-subtle bg-border-subtle',
              )}
              aria-hidden="true"
            >
              <span
                className={clsx(
                  'absolute left-1 top-1 h-4 w-4 rounded-full bg-bg shadow transition-transform duration-150',
                  isDark ? 'translate-x-5' : 'translate-x-0',
                )}
              />
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
};
