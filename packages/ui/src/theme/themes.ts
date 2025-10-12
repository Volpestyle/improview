import lightTokens from '../../../../tokens/themes/light.json';
import { applyTokenTheme, type TokenDictionary } from './applyTokens';

export type ThemeMode = 'dark' | 'light';

const THEME_OVERRIDES: Record<ThemeMode, TokenDictionary | undefined> = {
  dark: undefined,
  light: lightTokens as TokenDictionary,
};

const updateDocumentThemeAttributes = (mode: ThemeMode) => {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.dataset.theme = mode;
  root.classList.toggle('dark', mode === 'dark');
  root.style.setProperty('color-scheme', mode);
};

export const applyThemeMode = (mode: ThemeMode) => {
  const overrideTokens = THEME_OVERRIDES[mode];

  if (overrideTokens) {
    applyTokenTheme({ overrideTokens });
  } else {
    applyTokenTheme();
  }

  updateDocumentThemeAttributes(mode);
};

export const getThemeOverride = (mode: ThemeMode) => THEME_OVERRIDES[mode];
