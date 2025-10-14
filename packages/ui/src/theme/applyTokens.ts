import defaultTokensJson from './tokens.json';
import type { DeepPartial, DesignTokens, ThemeMode } from './types';

const STYLE_ELEMENT_ID = 'improview-ui-theme';

const defaultTokens: DesignTokens = defaultTokensJson as DesignTokens;

const cloneTokens = (tokens: DesignTokens): DesignTokens =>
  JSON.parse(JSON.stringify(tokens)) as DesignTokens;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const deepMerge = <T>(target: T, source: DeepPartial<T>): T => {
  if (!source) {
    return target;
  }

  const result: Record<string, unknown> = { ...(target as unknown as Record<string, unknown>) };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    if (sourceValue === undefined) continue;
    const targetValue = (target as unknown as Record<string, unknown>)[key as string];

    if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
      result[key as string] = deepMerge(targetValue, sourceValue as DeepPartial<typeof targetValue>);
    } else {
      result[key as string] = sourceValue as unknown;
    }
  }

  return result as T;
};

const formatVars = (vars: Record<string, string>): string =>
  Object.entries(vars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

const formatBlock = (selector: string, vars: Record<string, string>): string =>
  `${selector} {\n${formatVars(vars)}\n}`;

const rem = (value: number) => `${value / 16}rem`;
const px = (value: number) => `${value}px`;
const ms = (value: number) => `${value}ms`;

const buildColorVariables = (tokens: DesignTokens, mode: ThemeMode): Record<string, string> => {
  const palette = tokens.color[mode];

  const prefixed = {
    '--color-bg-default': palette.bg.default,
    '--color-bg-panel': palette.bg.panel,
    '--color-bg-sunken': palette.bg.sunken,
    '--color-bg-elevated': palette.bg.elevated,
    '--color-fg-default': palette.fg.default,
    '--color-fg-muted': palette.fg.muted,
    '--color-fg-subtle': palette.fg.subtle,
    '--color-fg-inverse': palette.fg.inverse,
    '--color-accent-primary': palette.accent.primary,
    '--color-accent-emphasis': palette.accent.emphasis,
    '--color-accent-soft': palette.accent.soft,
    '--color-info-600': palette.info['600'],
    '--color-info-soft': palette.info.soft,
    '--color-success-600': palette.success['600'],
    '--color-success-soft': palette.success.soft,
    '--color-warning-600': palette.warning['600'],
    '--color-warning-soft': palette.warning.soft,
    '--color-danger-600': palette.danger['600'],
    '--color-danger-soft': palette.danger.soft,
    '--color-border-default': palette.border.default,
    '--color-border-subtle': palette.border.subtle,
    '--color-border-focus': palette.border.focus,
    '--color-overlay-backdrop': palette.overlay.backdrop,
  };

  const aliases = {
    '--bg-default': palette.bg.default,
    '--bg-panel': palette.bg.panel,
    '--bg-sunken': palette.bg.sunken,
    '--bg-elevated': palette.bg.elevated,
    '--background': palette.bg.default,
    '--foreground': palette.fg.default,
    '--card': palette.bg.panel,
    '--card-foreground': palette.fg.default,
    '--popover': palette.bg.elevated,
    '--popover-foreground': palette.fg.default,
    '--accent-primary': palette.accent.primary,
    '--accent-emphasis': palette.accent.emphasis,
    '--accent-soft': palette.accent.soft,
    '--accent': palette.accent.primary,
    '--accent-foreground': palette.fg.inverse,
    '--fg-default': palette.fg.default,
    '--fg-muted': palette.fg.muted,
    '--fg-subtle': palette.fg.subtle,
    '--fg-inverse': palette.fg.inverse,
    '--muted': palette.bg.sunken,
    '--muted-foreground': palette.fg.muted,
    '--secondary': palette.bg.sunken,
    '--secondary-foreground': palette.fg.default,
    '--primary': palette.accent.primary,
    '--primary-foreground': palette.fg.inverse,
    '--destructive': palette.danger['600'],
    '--destructive-foreground': palette.fg.inverse,
    '--info-600': palette.info['600'],
    '--info-soft': palette.info.soft,
    '--success-600': palette.success['600'],
    '--success-soft': palette.success.soft,
    '--warning-600': palette.warning['600'],
    '--warning-soft': palette.warning.soft,
    '--danger-600': palette.danger['600'],
    '--danger-500': palette.danger['600'],
    '--danger-soft': palette.danger.soft,
    '--border-default': palette.border.default,
    '--border-subtle': palette.border.subtle,
    '--border-focus': palette.border.focus,
    '--border': palette.border.default,
    '--input': palette.bg.panel,
    '--ring': palette.border.focus,
  };

  return { ...prefixed, ...aliases };
};

const buildEditorVariables = (tokens: DesignTokens, mode: ThemeMode): Record<string, string> => {
  const palette = tokens.editor[mode];
  return {
    '--editor-background': palette.background,
    '--editor-gutter': palette.gutter,
    '--editor-line-number': palette.lineNumber,
    '--editor-text': palette.text,
    '--editor-line-active': palette.lineActive,
    '--editor-selection': palette.selection,
    '--editor-cursor': palette.cursor,
    '--editor-token-comment': palette.tokenComment,
    '--editor-token-keyword': palette.tokenKeyword,
    '--editor-token-string': palette.tokenString,
    '--editor-token-function': palette.tokenFunction,
    '--editor-token-number': palette.tokenNumber,
    '--editor-token-operator': palette.tokenOperator,
    '--editor-token-punctuation': palette.tokenPunctuation,
    '--editor-pass': palette.pass,
    '--editor-fail': palette.fail,
  };
};

const buildBaseVariables = (tokens: DesignTokens): Record<string, string> => {
  const spacing: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens.space)) {
    spacing[`--space-${key}`] = rem(value);
  }

  const radius: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens.radius)) {
    radius[`--radius-${key}`] = `${value}px`;
  }

  const fontSizes: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens.font.size)) {
    fontSizes[`--font-size-${key}`] = px(value);
  }

  const fontWeights: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens.font.weight)) {
    fontWeights[`--font-weight-${key}`] = `${value}`;
  }

  const breakpoints: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens.breakpoints)) {
    breakpoints[`--breakpoint-${key}`] = px(value);
  }

  const zIndex: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens.z)) {
    zIndex[`--z-${key}`] = `${value}`;
  }

  const motionDurations: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens.motion.duration)) {
    motionDurations[`--motion-duration-${key}`] = ms(value);
  }

  const motionEasing: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens.motion.easing)) {
    motionEasing[`--motion-easing-${key}`] = value;
  }

  return {
    '--font-family-sans': tokens.font.family.sans,
    '--font-family-mono': tokens.font.family.mono,
    '--font-size-root': px(tokens.font.size.base),
    ...spacing,
    ...radius,
    ...fontSizes,
    ...fontWeights,
    ...breakpoints,
    ...zIndex,
    ...motionDurations,
    ...motionEasing,
  };
};

const buildShadowVariables = (tokens: DesignTokens, mode: ThemeMode): Record<string, string> => {
  const shadowScale = tokens.shadow[mode];
  return {
    '--shadow-sm': shadowScale.sm,
    '--shadow-md': shadowScale.md,
  };
};

const buildCssText = (tokens: DesignTokens): string => {
  const baseVars = buildBaseVariables(tokens);
  const lightVars = {
    ...buildColorVariables(tokens, 'light'),
    ...buildEditorVariables(tokens, 'light'),
    ...buildShadowVariables(tokens, 'light'),
    'color-scheme': 'light',
  };
  const darkVars = {
    ...buildColorVariables(tokens, 'dark'),
    ...buildEditorVariables(tokens, 'dark'),
    ...buildShadowVariables(tokens, 'dark'),
    'color-scheme': 'dark',
  };

  const blocks = [
    formatBlock(':root', { ...baseVars, ...lightVars }),
    formatBlock(':root[data-theme="light"]', lightVars),
    formatBlock(':root[data-theme="dark"]', darkVars),
    formatBlock('[data-theme="light"]', lightVars),
    formatBlock('[data-theme="dark"]', darkVars),
  ];

  return blocks.join('\n');
};

export interface ApplyTokenThemeOptions {
  /**
   * Deep partial overrides that will be merged with the default tokens.
   */
  tokens?: DeepPartial<DesignTokens>;
  /**
   * Custom style element identifier. Defaults to `improview-ui-theme`.
   */
  styleElementId?: string;
  /**
   * When true (default), injects the generated CSS into the DOM if available.
   */
  injectStyles?: boolean;
}

export interface ApplyTokenThemeResult {
  tokens: DesignTokens;
  cssText: string;
}

export const applyTokenTheme = (
  options: ApplyTokenThemeOptions = {},
): ApplyTokenThemeResult => {
  const { tokens: tokenOverrides, styleElementId = STYLE_ELEMENT_ID, injectStyles = true } = options;

  const tokens = tokenOverrides
    ? deepMerge(cloneTokens(defaultTokens), tokenOverrides as DeepPartial<DesignTokens>)
    : cloneTokens(defaultTokens);

  const cssText = buildCssText(tokens);

  if (injectStyles && typeof document !== 'undefined') {
    let styleElement = document.getElementById(styleElementId) as HTMLStyleElement | null;
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleElementId;
      document.head.appendChild(styleElement);
    }
    if (styleElement.textContent !== cssText) {
      styleElement.textContent = cssText;
    }
  }

  return { tokens, cssText };
};

export const getDefaultTokens = (): DesignTokens => cloneTokens(defaultTokens);
