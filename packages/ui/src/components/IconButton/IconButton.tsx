import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { buttonStyles, type ButtonProps } from '../button';
import { cn } from '../../utils/cn';

export interface IconButtonProps
  extends Omit<ButtonProps, 'children' | 'asChild'> {
  icon: ReactNode;
  srLabel?: string;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      className,
      srLabel,
      variant = 'ghost',
      size = 'icon',
      weight = 'normal',
      type = 'button',
      'aria-label': ariaLabel,
      ...rest
    },
    ref,
  ) => {
    const accessibleLabel = ariaLabel ?? srLabel;

    return (
      <button
        ref={ref}
        type={type}
        aria-label={accessibleLabel}
        className={cn(buttonStyles({ variant, size, weight }), 'p-0', className)}
        {...rest}
      >
        {icon}
        {srLabel && !ariaLabel && <span className="sr-only">{srLabel}</span>}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';
