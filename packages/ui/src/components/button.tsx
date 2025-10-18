import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';
import { cn } from '../utils/cn';

const buttonVariants = cva(
  [
    'inline-flex',
    'items-center',
    'justify-center',
    'rounded-md',
    'text-sm',
    'transition-colors',
    'focus-visible:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-offset-2',
    'focus-visible:ring-offset-bg',
    'disabled:opacity-50',
    'disabled:pointer-events-none',
    'gap-2',
    'whitespace-nowrap',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: cn(
          'bg-accent',
          'text-fg-inverse',
          'hover:bg-accent-emphasis',
          'focus-visible:ring-accent',
        ),
        secondary: cn(
          'bg-bg-panel',
          'text-fg-default',
          'hover:bg-bg-elevated/80',
          'border',
          'border-border-subtle',
          'focus-visible:ring-border-focus',
        ),
        ghost: cn(
          'bg-transparent',
          'text-fg-muted',
          'hover:bg-bg-panel/70',
          'focus-visible:ring-border-focus',
        ),
        outline: cn(
          'border',
          'border-border-subtle',
          'bg-transparent',
          'hover:bg-bg-panel/60',
          'text-fg-default',
          'focus-visible:ring-border-focus',
        ),
        selectable: cn(
          'border',
          'border-border-subtle',
          'bg-transparent',
          'text-fg-default',
          'aria-[pressed=true]:border-transparent',
          'aria-[pressed=true]:bg-accent',
          'aria-[pressed=true]:text-fg-inverse',
          'aria-[pressed=false]:hover:bg-bg-panel/60',
          'focus-visible:ring-accent',
        ),
        destructive: cn(
          'bg-danger-600',
          'text-fg-inverse',
          'hover:bg-danger-soft',
          'focus-visible:ring-danger-600',
        ),
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-4 text-base',
        pill: 'h-8 px-4 rounded-full text-sm',
        icon: 'h-10 w-10',
      },
      weight: {
        normal: 'font-medium',
        semibold: 'font-semibold',
        bold: 'font-bold',
      },
    },
    compoundVariants: [
      {
        variant: 'ghost',
        size: 'icon',
        className: 'hover:bg-bg-panel/80',
      },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      weight: 'bold',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, weight, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, weight }), className)}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';

export const buttonStyles = buttonVariants;
