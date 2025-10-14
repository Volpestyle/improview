import {
  forwardRef,
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type LiHTMLAttributes,
  type OlHTMLAttributes,
} from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../utils/cn';

export const Breadcrumb = ({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) => (
  <nav
    data-slot="breadcrumb"
    aria-label="Breadcrumb"
    className={cn('flex items-center text-sm text-fg-muted', className)}
    {...props}
  />
);
Breadcrumb.displayName = 'Breadcrumb';

export const BreadcrumbList = forwardRef<HTMLOListElement, OlHTMLAttributes<HTMLOListElement>>(
  ({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn('flex flex-wrap items-center gap-1', className)}
    {...props}
  />
));
BreadcrumbList.displayName = 'BreadcrumbList';

export const BreadcrumbItem = forwardRef<HTMLLIElement, LiHTMLAttributes<HTMLLIElement>>(
  ({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn('flex items-center gap-1 text-fg-muted', className)}
    {...props}
  />
));
BreadcrumbItem.displayName = 'BreadcrumbItem';

export interface BreadcrumbLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  asChild?: boolean;
}

export const BreadcrumbLink = forwardRef<
  HTMLAnchorElement,
  BreadcrumbLinkProps
>(({ className, asChild, ...props }, ref) => {
  const Comp = asChild ? Slot : 'a';
  return (
    <Comp
      ref={ref}
      className={cn(
        'transition-colors hover:text-fg-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
        className,
      )}
      {...props}
    />
  );
});
BreadcrumbLink.displayName = 'BreadcrumbLink';

export const BreadcrumbSeparator = ({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) => (
  <span
    role="presentation"
    className={cn('text-fg-subtle', className)}
    {...props}
  >
    {children ?? '/'}
  </span>
);
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

export const BreadcrumbPage = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn('font-medium text-fg-default', className)}
    aria-current="page"
    {...props}
  />
));
BreadcrumbPage.displayName = 'BreadcrumbPage';
