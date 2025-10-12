import { forwardRef } from 'react';
import clsx from 'clsx';
import { Spinner } from '../Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-bg hover:bg-accent-emphasis focus-visible:ring-accent focus-visible:ring-offset-bg',
  secondary:
    'bg-bg-panel text-fg hover:bg-bg-sunken focus-visible:ring-border-focus focus-visible:ring-offset-bg',
  ghost:
    'bg-transparent text-fg hover:bg-bg-sunken focus-visible:ring-border-focus focus-visible:ring-offset-bg',
  danger:
    'bg-danger-600 text-bg hover:bg-danger-600/90 focus-visible:ring-danger-600 focus-visible:ring-offset-bg',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-2',
  md: 'h-11 px-4 text-md gap-2',
  lg: 'h-12 px-5 text-lg gap-3',
};

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = 'primary',
      size = 'md',
      startIcon,
      endIcon,
      loading = false,
      disabled,
      type = 'button',
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        type={type}
        className={clsx(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none',
          VARIANT_STYLES[variant],
          SIZE_STYLES[size],
          className,
        )}
        disabled={isDisabled}
        {...rest}
      >
        {loading ? (
          <Spinner size="sm" tone="inverted" />
        ) : startIcon ? (
          <span className="flex items-center">{startIcon}</span>
        ) : null}
        <span className="truncate">{children}</span>
        {endIcon && !loading ? (
          <span className="flex items-center" aria-hidden="true">
            {endIcon}
          </span>
        ) : null}
      </button>
    );
  },
);

Button.displayName = 'Button';
