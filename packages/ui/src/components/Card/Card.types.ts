import { ReactNode } from 'react';

export interface CardProps {
    /** Optional media/image element at the top of the card */
    media?: ReactNode;

    /** Main heading text */
    title?: string;

    /** Subtitle or secondary text below the title */
    subtitle?: string;

    /** Main body content */
    children?: ReactNode;

    /** Optional footer content */
    footer?: ReactNode;

    /** Whether the card is interactive (adds hover effects) */
    interactive?: boolean;

    /** Click handler for interactive cards */
    onClick?: () => void;

    /** Additional CSS class names */
    className?: string;

    /** Card variant */
    variant?: 'default' | 'elevated' | 'outlined';
}

