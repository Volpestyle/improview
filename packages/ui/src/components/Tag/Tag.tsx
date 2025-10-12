import clsx from 'clsx';

type TagTone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

const TONE_MAP: Record<TagTone, string> = {
  default: 'bg-bg-sunken text-fg',
  success: 'bg-success-600/15 text-success-600',
  warning: 'bg-warning-600/15 text-warning-600',
  danger: 'bg-danger-600/15 text-danger-600',
  info: 'bg-info-600/15 text-info-600',
  accent: 'bg-accent/20 text-accent',
};

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: TagTone;
  size?: 'sm' | 'md';
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const Tag = ({
  tone = 'default',
  size = 'sm',
  className,
  leadingIcon,
  trailingIcon,
  children,
  ...rest
}: TagProps) => (
  <span
    {...rest}
    className={clsx(
      'inline-flex items-center gap-1 rounded-full font-medium',
      size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
      TONE_MAP[tone],
      className,
    )}
  >
    {leadingIcon ? <span aria-hidden="true">{leadingIcon}</span> : null}
    <span>{children}</span>
    {trailingIcon ? <span aria-hidden="true">{trailingIcon}</span> : null}
  </span>
);
