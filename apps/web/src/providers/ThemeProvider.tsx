import {
  ThemeProvider as UiThemeProvider,
  ThemeScript,
  type ThemeProviderProps as UiThemeProviderProps,
} from '@improview/ui';

export interface ThemeProviderProps extends Pick<UiThemeProviderProps, 'children' | 'tokens'> {
  /**
   * Optional storage key if we want to scope theme preference per-app.
   */
  storageKey?: string;
}

export function ThemeProvider({
  children,
  storageKey = 'improview-app-theme',
  tokens,
}: ThemeProviderProps) {
  return (
    <>
      <ThemeScript storageKey={storageKey} />
      <UiThemeProvider storageKey={storageKey} tokens={tokens}>
        {children}
      </UiThemeProvider>
    </>
  );
}
