import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  heading?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING_MAP: Record<NonNullable<CardProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = ({
  heading,
  description,
  actions,
  className,
  children,
  padding = 'md',
  ...rest
}: CardProps) => (
  <div
    {...rest}
    className={clsx(
      'rounded-lg border border-border-subtle bg-bg-panel shadow-sm transition-colors',
      className,
    )}
  >
    {(heading || description || actions) && (
      <div className={clsx('flex flex-col gap-2 border-b border-border-subtle p-4 md:flex-row md:items-center md:justify-between md:gap-4')}>
        <div className="flex flex-col gap-1">
          {heading ? <h3 className="text-lg font-semibold text-fg">{heading}</h3> : null}
          {description ? <p className="text-sm text-fg-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    )}
    <div className={clsx(PADDING_MAP[padding])}>{children}</div>
  </div>
);
