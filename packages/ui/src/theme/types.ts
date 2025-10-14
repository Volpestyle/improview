export type Theme = 'light' | 'dark';

export interface ColorTokens {
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
    info: { 600: string; soft: string };
    success: { 600: string; soft: string };
    warning: { 600: string; soft: string };
    danger: { 600: string; soft: string };
    border: {
        default: string;
        subtle: string;
        focus: string;
    };
}

export interface SpaceTokens {
    0: number;
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    6: number;
    8: number;
    10: number;
    12: number;
    16: number;
}

export interface RadiusTokens {
    sm: number;
    md: number;
    lg: number;
    xl: number;
}

export interface ShadowTokens {
    sm: string;
    md: string;
}

export interface FontTokens {
    family: {
        sans: string;
        mono: string;
    };
    size: {
        xs: number;
        sm: number;
        base: number;
        md: number;
        lg: number;
        xl: number;
        '2xl': number;
    };
    weight: {
        regular: number;
        medium: number;
        semibold: number;
    };
}

export interface BreakpointTokens {
    sm: number;
    md: number;
    lg: number;
    xl: number;
}

export interface ZIndexTokens {
    base: number;
    dropdown: number;
    modal: number;
    toast: number;
}

export interface MotionTokens {
    duration: {
        instant: number;
        fast: number;
        base: number;
        slow: number;
    };
    easing: {
        inOut: string;
        spring: string;
    };
}

export interface DesignTokens {
    color: {
        light: ColorTokens;
        dark: ColorTokens;
    };
    space: SpaceTokens;
    radius: RadiusTokens;
    shadow: {
        light: ShadowTokens;
        dark: ShadowTokens;
    };
    font: FontTokens;
    breakpoints: BreakpointTokens;
    z: ZIndexTokens;
    motion: MotionTokens;
}

