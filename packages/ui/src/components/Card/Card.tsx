import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { CardProps } from './Card.types';
import './Card.css';

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      media,
      title,
      subtitle,
      children,
      footer,
      interactive = false,
      onClick,
      className = '',
      variant = 'default',
      ...props
    },
    ref,
  ) => {
    const classes = [
      'improview-card',
      `improview-card--${variant}`,
      interactive && 'improview-card--interactive',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const motionProps = interactive
      ? {
          whileHover: { scale: 1.02 },
          whileTap: { scale: 0.98 },
          transition: {
            duration: 0.06,
            ease: 'easeInOut',
          },
        }
      : {};

    const Component = interactive ? motion.div : 'div';

    return (
      <Component
        ref={ref}
        className={classes}
        onClick={onClick}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        {...(motionProps as any)}
        {...(props as any)}
      >
        {media && <div className="improview-card__media">{media}</div>}

        {(title || subtitle) && (
          <div className="improview-card__header">
            {title && <h3 className="improview-card__title">{title}</h3>}
            {subtitle && <p className="improview-card__subtitle">{subtitle}</p>}
          </div>
        )}

        {children && <div className="improview-card__body">{children}</div>}

        {footer && <div className="improview-card__footer">{footer}</div>}
      </Component>
    );
  },
);

Card.displayName = 'Card';
