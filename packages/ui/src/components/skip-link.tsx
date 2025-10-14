import { cn } from '../utils/cn';

export interface SkipLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {}

export const SkipLink = ({ className, children = 'Skip to content', ...props }: SkipLinkProps) => (
  <a
    className={cn(
      'sr-only',
      'focus:not-sr-only',
      'fixed',
      'left-4',
      'top-4',
      'z-[var(--z-modal,999)]',
      'rounded-md',
      'bg-fg-default',
      'px-3',
      'py-2',
      'text-sm',
      'font-medium',
      'text-bg-default',
      'shadow-md',
      className,
    )}
    {...props}
  >
    {children}
  </a>
);
