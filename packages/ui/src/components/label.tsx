import * as LabelPrimitive from '@radix-ui/react-label';
import { forwardRef } from 'react';
import { cn } from '../utils/cn';

export interface LabelProps extends LabelPrimitive.LabelProps {
  optional?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, optional, children, ...props }, ref) => (
    <LabelPrimitive.Root
      ref={ref}
      className={cn('text-sm font-medium text-fg-default', 'peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)}
      {...props}
    >
      {children}
      {optional ? <span className="ml-1 text-xs text-fg-muted">(optional)</span> : null}
    </LabelPrimitive.Root>
  ),
);

Label.displayName = 'Label';
