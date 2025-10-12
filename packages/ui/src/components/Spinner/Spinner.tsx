import { forwardRef } from 'react';
import clsx from 'clsx';

type SpinnerSize = 'sm' | 'md' | 'lg';
type SpinnerTone = 'default' | 'inverted' | 'accent';

const SIZE_MAP: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

const RING_WIDTH_MAP: Record<SpinnerSize, string> = {
  sm: 'border-2',
  md: 'border-2',
  lg: 'border-[3px]',
};

const TONE_MAP: Record<SpinnerTone, string> = {
  default: 'border-border-subtle',
  inverted: 'border-fg',
  accent: 'border-accent',
};

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  label?: string;
  tone?: SpinnerTone;
}

export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 'md', className, label = 'Loading', tone = 'default', ...rest }, ref) => (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      {...rest}
      ref={ref}
      className={clsx(
        'inline-flex items-center justify-center',
        SIZE_MAP[size],
        className,
      )}
    >
      <span
        className={clsx(
          'inline-block h-full w-full animate-spin rounded-full border-t-transparent border-solid',
          RING_WIDTH_MAP[size],
          TONE_MAP[tone],
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  ),
);

Spinner.displayName = 'Spinner';
