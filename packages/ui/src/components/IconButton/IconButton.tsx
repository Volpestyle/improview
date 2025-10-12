import { forwardRef } from 'react';
import clsx from 'clsx';
import { ButtonProps } from '../Button/Button';

type IconButtonSize = 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<IconButtonSize, string> = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-12 w-12',
};

export interface IconButtonProps
  extends Omit<ButtonProps, 'children' | 'startIcon' | 'endIcon'> {
  icon: React.ReactNode;
  size?: IconButtonSize;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, icon, size = 'md', 'aria-label': ariaLabel, ...rest }, ref) => {
    if (!ariaLabel) {
      throw new Error('IconButton requires an accessible aria-label.');
    }

    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        className={clsx(
          'inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed',
          SIZE_MAP[size],
          rest.variant === 'ghost'
            ? 'bg-transparent text-fg hover:bg-bg-sunken focus-visible:ring-border-focus focus-visible:ring-offset-bg'
            : rest.variant === 'secondary'
            ? 'bg-bg-panel text-fg hover:bg-bg-sunken focus-visible:ring-border-focus focus-visible:ring-offset-bg'
            : rest.variant === 'danger'
            ? 'bg-danger-600 text-bg hover:bg-danger-600/90 focus-visible:ring-danger-600 focus-visible:ring-offset-bg'
            : 'bg-accent text-bg hover:bg-accent-emphasis focus-visible:ring-accent focus-visible:ring-offset-bg',
          className,
        )}
        {...rest}
      >
        <span className="flex items-center justify-center" aria-hidden="true">
          {icon}
        </span>
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';
