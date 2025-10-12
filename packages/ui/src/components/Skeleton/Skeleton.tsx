import clsx from 'clsx';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  radius?: 'sm' | 'md' | 'lg' | 'full';
}

const RADIUS_MAP: Record<NonNullable<SkeletonProps['radius']>, string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

export const Skeleton = ({ className, radius = 'md', ...rest }: SkeletonProps) => (
  <div
    aria-hidden="true"
    {...rest}
    className={clsx('animate-pulse bg-bg-sunken', RADIUS_MAP[radius], className)}
  />
);
