import tokens from './tokens.json';
import type { DesignTokens, Theme } from './types';

export { tokens };
export * from './types';

/**
 * Design tokens for Improview UI
 * Single source of truth for all visual values
 */
export const designTokens = tokens as DesignTokens;

/**
 * Get color tokens for a specific theme
 */
export function getColorTokens(theme: Theme) {
    return designTokens.color[theme];
}

/**
 * Generate CSS custom properties from design tokens
 */
export function generateCSSVariables(theme: Theme): string {
    const colors = getColorTokens(theme);
    const shadows = designTokens.shadow[theme];

    const cssVars: Record<string, string | number> = {
        // Backgrounds
        '--color-bg-default': colors.bg.default,
        '--color-bg-panel': colors.bg.panel,
        '--color-bg-sunken': colors.bg.sunken,
        '--color-bg-elevated': colors.bg.elevated,

        // Foregrounds
        '--color-fg-default': colors.fg.default,
        '--color-fg-muted': colors.fg.muted,
        '--color-fg-subtle': colors.fg.subtle,
        '--color-fg-inverse': colors.fg.inverse,

        // Accents
        '--color-accent-primary': colors.accent.primary,
        '--color-accent-emphasis': colors.accent.emphasis,
        '--color-accent-soft': colors.accent.soft,

        // Semantic colors
        '--color-info-600': colors.info[600],
        '--color-info-soft': colors.info.soft,
        '--color-success-600': colors.success[600],
        '--color-success-soft': colors.success.soft,
        '--color-warning-600': colors.warning[600],
        '--color-warning-soft': colors.warning.soft,
        '--color-danger-600': colors.danger[600],
        '--color-danger-soft': colors.danger.soft,

        // Borders
        '--color-border-default': colors.border.default,
        '--color-border-subtle': colors.border.subtle,
        '--color-border-focus': colors.border.focus,

        // Shadows
        '--shadow-sm': shadows.sm,
        '--shadow-md': shadows.md,

        // Spacing
        '--space-0': `${designTokens.space[0]}px`,
        '--space-1': `${designTokens.space[1]}px`,
        '--space-2': `${designTokens.space[2]}px`,
        '--space-3': `${designTokens.space[3]}px`,
        '--space-4': `${designTokens.space[4]}px`,
        '--space-5': `${designTokens.space[5]}px`,
        '--space-6': `${designTokens.space[6]}px`,
        '--space-8': `${designTokens.space[8]}px`,
        '--space-10': `${designTokens.space[10]}px`,
        '--space-12': `${designTokens.space[12]}px`,
        '--space-16': `${designTokens.space[16]}px`,

        // Radius
        '--radius-sm': `${designTokens.radius.sm}px`,
        '--radius-md': `${designTokens.radius.md}px`,
        '--radius-lg': `${designTokens.radius.lg}px`,
        '--radius-xl': `${designTokens.radius.xl}px`,

        // Font
        '--font-sans': designTokens.font.family.sans,
        '--font-mono': designTokens.font.family.mono,
        '--font-size-xs': `${designTokens.font.size.xs}px`,
        '--font-size-sm': `${designTokens.font.size.sm}px`,
        '--font-size-base': `${designTokens.font.size.base}px`,
        '--font-size-md': `${designTokens.font.size.md}px`,
        '--font-size-lg': `${designTokens.font.size.lg}px`,
        '--font-size-xl': `${designTokens.font.size.xl}px`,
        '--font-size-2xl': `${designTokens.font.size['2xl']}px`,
        '--font-weight-regular': designTokens.font.weight.regular,
        '--font-weight-medium': designTokens.font.weight.medium,
        '--font-weight-semibold': designTokens.font.weight.semibold,

        // Motion
        '--motion-duration-instant': `${designTokens.motion.duration.instant}ms`,
        '--motion-duration-fast': `${designTokens.motion.duration.fast}ms`,
        '--motion-duration-base': `${designTokens.motion.duration.base}ms`,
        '--motion-duration-slow': `${designTokens.motion.duration.slow}ms`,
        '--motion-easing-in-out': designTokens.motion.easing.inOut,
        '--motion-easing-spring': designTokens.motion.easing.spring,

        // Z-index
        '--z-base': designTokens.z.base,
        '--z-dropdown': designTokens.z.dropdown,
        '--z-modal': designTokens.z.modal,
        '--z-toast': designTokens.z.toast,
    };

    return Object.entries(cssVars)
        .map(([key, value]) => `${key}: ${value};`)
        .join('\n  ');
}

/**
 * Apply theme to document root
 */
export function applyTheme(theme: Theme) {
    if (typeof document === 'undefined') return;

    document.documentElement.setAttribute('data-theme', theme);
    const cssVars = generateCSSVariables(theme);
    const styleTag = document.getElementById('improview-theme');

    if (styleTag) {
        styleTag.textContent = `:root {\n  ${cssVars}\n}`;
    } else {
        const style = document.createElement('style');
        style.id = 'improview-theme';
        style.textContent = `:root {\n  ${cssVars}\n}`;
        document.head.appendChild(style);
    }
}

/**
 * Detect system theme preference
 */
export function getSystemTheme(): Theme {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get stored theme preference from localStorage
 */
export function getStoredTheme(): Theme | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('improview-theme');
    return stored === 'light' || stored === 'dark' ? stored : null;
}

/**
 * Store theme preference in localStorage
 */
export function storeTheme(theme: Theme) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('improview-theme', theme);
}

/**
 * Initialize theme on page load
 * Respects stored preference, falls back to system preference
 */
export function initializeTheme(): Theme {
    const stored = getStoredTheme();
    const theme = stored ?? getSystemTheme();
    applyTheme(theme);
    return theme;
}

