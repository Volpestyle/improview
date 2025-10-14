import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const badgeVariants = cva(
  [
    'inline-flex',
    'items-center',
    'rounded-full',
    'border',
    'border-transparent',
    'text-xs',
    'font-medium',
    'px-2.5',
    'py-1',
    'uppercase',
    'tracking-wide',
  ].join(' '),
  {
    variants: {
      variant: {
        neutral: 'bg-bg-panel text-fg-muted',
        accent: 'bg-accent text-fg-inverse',
        outline: 'border-border-subtle text-fg-muted',
        success: 'bg-success-soft text-fg-inverse',
        danger: 'bg-danger-soft text-danger-600',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);

export const badgeStyles = badgeVariants;
