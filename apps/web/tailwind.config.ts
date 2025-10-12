import type { Config } from 'tailwindcss';
import tokens from '../../tokens/tokens.json';

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
  },
  fg: {
    DEFAULT: 'var(--color-fg-default)',
    muted: 'var(--color-fg-muted)',
    inverse: 'var(--color-fg-inverse)',
  },
  accent: {
    DEFAULT: 'var(--color-accent-primary)',
    emphasis: 'var(--color-accent-emphasis)',
  },
  info: {
    600: 'var(--color-info-600)',
  },
  success: {
    600: 'var(--color-success-600)',
  },
  warning: {
    600: 'var(--color-warning-600)',
  },
  danger: {
    600: 'var(--color-danger-600)',
  },
  border: {
    subtle: 'var(--color-border-subtle)',
    focus: 'var(--color-border-focus)',
  },
};

const zIndex = Object.fromEntries(
  Object.entries(tokens.z).map(([key, value]) => [key, String(value)]),
);

const config: Config = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../tokens/**/*.json',
  ],
  theme: {
    extend: {
      colors,
      spacing: space,
      borderRadius: radius,
      boxShadow: {
        sm: tokens.shadow.sm,
        md: tokens.shadow.md,
      },
      fontFamily: {
        sans: tokens.font.family.sans.split(',').map((x) => x.trim()),
        mono: tokens.font.family.mono.split(',').map((x) => x.trim()),
      },
      fontSize: Object.fromEntries(
        Object.entries(tokens.font.size).map(([key, value]) => [key, [`${value}px`, rem(24)]]),
      ),
      zIndex,
    },
  },
  plugins: [],
};

export default config;
