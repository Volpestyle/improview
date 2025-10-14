import { forwardRef } from 'react';
import { cn } from '../utils/cn';

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export const Card = forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('rounded-lg border border-border-subtle bg-bg-panel shadow-sm', className)}
    {...props}
  />
));

Card.displayName = 'Card';

export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-2 p-6', className)} {...props} />
  ),
);

CardHeader.displayName = 'CardHeader';

export type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold leading-tight text-fg-default', className)}
      {...props}
    >
      {children}
    </h3>
  ),
);

CardTitle.displayName = 'CardTitle';

export type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-fg-muted', className)} {...props} />
  ),
);

CardDescription.displayName = 'CardDescription';

export type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  ),
);

CardContent.displayName = 'CardContent';

export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center gap-2 p-6 pt-0', className)} {...props} />
  ),
);

CardFooter.displayName = 'CardFooter';
