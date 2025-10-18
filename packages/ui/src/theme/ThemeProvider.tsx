import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { applyTokenTheme, type ApplyTokenThemeOptions } from './applyTokens';
import type { DesignTokens, ThemeMode } from './types';

type ThemePreference = ThemeMode | 'system';

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ThemeMode;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
  tokens: DesignTokens;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DEFAULT_STORAGE_KEY = 'improview-ui-theme';

const readStoredTheme = (storageKey: string): ThemePreference | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return null;
  } catch {
    return null;
  }
};

const storeTheme = (storageKey: string, theme: ThemePreference) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, theme);
  } catch {
    /* noop */
  }
};

const applyDocumentTheme = (mode: ThemeMode) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  root.style.colorScheme = mode;
};

export interface ThemeProviderProps extends Pick<ApplyTokenThemeOptions, 'tokens'> {
  children: ReactNode;
  defaultTheme?: ThemePreference;
  storageKey?: string;
}

export const ThemeProvider = ({
  children,
  defaultTheme = 'system',
  storageKey = DEFAULT_STORAGE_KEY,
  tokens: tokenOverrides,
}: ThemeProviderProps) => {
  const prefersDarkRef = useRef<MediaQueryList | null>(null);
  const mergedTokens = useMemo(
    () => applyTokenTheme({ tokens: tokenOverrides, injectStyles: false }).tokens,
    [tokenOverrides],
  );

  useEffect(() => {
    applyTokenTheme({ tokens: tokenOverrides, injectStyles: true });
  }, [tokenOverrides]);

  const [theme, setThemeState] = useState<ThemePreference>(() => {
    const stored = readStoredTheme(storageKey);
    return stored ?? defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<ThemeMode>(() => {
    if (defaultTheme === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    }
    return defaultTheme;
  });

  useEffect(() => {
    // Sync theme state with stored preference when storage key changes.
    const stored = readStoredTheme(storageKey);
    if (stored) {
      setThemeState(stored);
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)');
    prefersDarkRef.current = prefersDark ?? null;

    const update = (mode: ThemeMode) => {
      setResolvedTheme(mode);
      applyDocumentTheme(mode);
    };

    if (theme === 'system') {
      const mode = prefersDark?.matches ? 'dark' : 'light';
      update(mode ?? 'light');

      const handleChange = (event: MediaQueryListEvent) => {
        update(event.matches ? 'dark' : 'light');
      };

      prefersDark?.addEventListener?.('change', handleChange);
      return () => prefersDark?.removeEventListener?.('change', handleChange);
    }

    update(theme);
    return undefined;
  }, [theme]);

  const setTheme = useCallback(
    (nextTheme: ThemePreference) => {
      setThemeState(nextTheme);
      storeTheme(storageKey, nextTheme);
    },
    [storageKey],
  );

  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
      tokens: mergedTokens,
    }),
    [mergedTokens, resolvedTheme, setTheme, theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const useThemeContext = () => useContext(ThemeContext);

interface ThemeScriptProps {
  storageKey?: string;
  defaultTheme?: ThemePreference;
}

export const ThemeScript = ({
  storageKey = DEFAULT_STORAGE_KEY,
  defaultTheme = 'system',
}: ThemeScriptProps) => {
  const script = `(function(){try{var storageKey='${storageKey}';var fallback='${defaultTheme}';var stored=null;try{stored=localStorage.getItem(storageKey);}catch(e){}var theme=stored===null?fallback:stored;var mqlSupported=typeof window.matchMedia==='function';var resolve=function(){if(mqlSupported){return window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}return 'light';};var resolved=theme==='system'?resolve():theme;if(resolved!=='light'&&resolved!=='dark'){resolved=resolve();}document.documentElement.setAttribute('data-theme',resolved);document.documentElement.style.colorScheme=resolved;}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
};
