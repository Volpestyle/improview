export type ThemeMode = 'light' | 'dark';

export interface ColorPalette {
  bg: {
    default: string;
    panel: string;
    sunken: string;
    elevated: string;
  };
  fg: {
    default: string;
    muted: string;
    subtle: string;
    inverse: string;
  };
  accent: {
    primary: string;
    emphasis: string;
    soft: string;
  };
  info: {
    600: string;
    soft: string;
  };
  success: {
    600: string;
    soft: string;
  };
  warning: {
    600: string;
    soft: string;
  };
  danger: {
    600: string;
    soft: string;
  };
  border: {
    default: string;
    subtle: string;
    focus: string;
  };
  overlay: {
    backdrop: string;
  };
}

export interface EditorPalette {
  background: string;
  gutter: string;
  lineNumber: string;
  text: string;
  lineActive: string;
  selection: string;
  cursor: string;
  tokenComment: string;
  tokenKeyword: string;
  tokenString: string;
  tokenFunction: string;
  tokenNumber: string;
  tokenOperator: string;
  tokenPunctuation: string;
  pass: string;
  fail: string;
}

export interface FontScale {
  family: {
    sans: string;
    mono: string;
  };
  size: Record<'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl', number>;
  weight: Record<'regular' | 'medium' | 'semibold', number>;
}

export interface MotionTokens {
  duration: Record<'instant' | 'fast' | 'base' | 'slow', number>;
  easing: Record<'inOut' | 'spring', string>;
}

export interface ShadowScale {
  sm: string;
  md: string;
}

export interface DesignTokens {
  color: Record<ThemeMode, ColorPalette>;
  editor: Record<ThemeMode, EditorPalette>;
  space: Record<string, number>;
  radius: Record<string, number>;
  shadow: Record<ThemeMode, ShadowScale>;
  font: FontScale;
  breakpoints: Record<string, number>;
  z: Record<string, number>;
  motion: MotionTokens;
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown> ? DeepPartial<T[K]> : T[K];
};
