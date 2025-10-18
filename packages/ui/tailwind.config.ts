import type { Config } from 'tailwindcss';
import tokens from './src/theme/tokens.json';

const rem = (value: number) => `${value / 16}rem`;

const space = Object.fromEntries(
  Object.entries(tokens.space).map(([key, value]) => [key, rem(value as number)]),
);

const radius = Object.fromEntries(
  Object.entries(tokens.radius).map(([key, value]) => [key, `${value}px`]),
);

const colors = {
  bg: {
    DEFAULT: 'var(--color-bg-default)',
    panel: 'var(--color-bg-panel)',
    sunken: 'var(--color-bg-sunken)',
    elevated: 'var(--color-bg-elevated)',
  },
  fg: {
    DEFAULT: 'var(--color-fg-default)',
    muted: 'var(--color-fg-muted)',
    subtle: 'var(--color-fg-subtle)',
    inverse: 'var(--color-fg-inverse)',
  },
  accent: {
    DEFAULT: 'var(--color-accent-primary)',
    emphasis: 'var(--color-accent-emphasis)',
    soft: 'var(--color-accent-soft)',
  },
  info: {
    600: 'var(--color-info-600)',
    soft: 'var(--color-info-soft)',
  },
  success: {
    600: 'var(--color-success-600)',
    soft: 'var(--color-success-soft)',
  },
  warning: {
    600: 'var(--color-warning-600)',
    soft: 'var(--color-warning-soft)',
  },
  danger: {
    600: 'var(--color-danger-600)',
    soft: 'var(--color-danger-soft)',
  },
  border: {
    DEFAULT: 'var(--color-border-default)',
    subtle: 'var(--color-border-subtle)',
    focus: 'var(--color-border-focus)',
  },
  overlay: {
    backdrop: 'var(--color-overlay-backdrop)',
  },
  editor: {
    background: 'var(--editor-background)',
    gutter: 'var(--editor-gutter)',
    line: 'var(--editor-line-number)',
    active: 'var(--editor-line-active)',
    selection: 'var(--editor-selection)',
    cursor: 'var(--editor-cursor)',
    pass: 'var(--editor-pass)',
    fail: 'var(--editor-fail)',
  },
};

const zIndex = Object.fromEntries(
  Object.entries(tokens.z).map(([key, value]) => [key, String(value)]),
);

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}', '../../tokens/**/*.json'],
  theme: {
    extend: {
      colors,
      spacing: space,
      borderRadius: radius,
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
      },
      fontFamily: {
        sans: tokens.font.family.sans.split(',').map((x) => x.trim()),
        mono: tokens.font.family.mono.split(',').map((x) => x.trim()),
      },
      fontSize: Object.fromEntries(
        Object.entries(tokens.font.size).map(([key, value]) => [
          key,
          [
            `${value}px`,
            {
              lineHeight: '1.5',
            },
          ],
        ]),
      ),
      zIndex,
    },
  },
  plugins: [],
};

export default config;
