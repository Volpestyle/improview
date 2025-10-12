import { forwardRef } from 'react';
import clsx from 'clsx';

type ChipVariant = 'default' | 'accent' | 'ghost';
type ChipSize = 'sm' | 'md';

const VARIANT_MAP: Record<ChipVariant, string> = {
  default:
    'bg-bg-panel text-fg hover:bg-bg-sunken focus-visible:ring-border-focus focus-visible:ring-offset-bg',
  accent:
    'bg-accent text-bg hover:bg-accent-emphasis focus-visible:ring-accent focus-visible:ring-offset-bg',
  ghost:
    'bg-transparent text-fg hover:bg-bg-sunken focus-visible:ring-border-focus focus-visible:ring-offset-bg',
};

const SIZE_MAP: Record<ChipSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-md',
};

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ChipVariant;
  size?: ChipSize;
  selected?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      selected = false,
      leadingIcon,
      trailingIcon,
      children,
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      type="button"
      className={clsx(
        'inline-flex items-center gap-2 rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed',
        VARIANT_MAP[variant],
        SIZE_MAP[size],
        selected && variant !== 'accent'
          ? 'bg-accent/20 text-accent focus-visible:ring-accent'
          : null,
        selected && variant === 'accent' ? 'ring-2 ring-accent ring-offset-2' : null,
        className,
      )}
      aria-pressed={selected}
      {...rest}
    >
      {leadingIcon ? (
        <span className="flex items-center text-fg-muted" aria-hidden="true">
          {leadingIcon}
        </span>
      ) : null}
      <span className="truncate">{children}</span>
      {trailingIcon ? (
        <span className="flex items-center text-fg-muted" aria-hidden="true">
          {trailingIcon}
        </span>
      ) : null}
    </button>
  ),
);

Chip.displayName = 'Chip';
