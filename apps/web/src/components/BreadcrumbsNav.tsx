import { Home, ChevronRight } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@improview/ui';

export interface BreadcrumbEntry {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface BreadcrumbsNavProps {
  items: BreadcrumbEntry[];
}

export const BreadcrumbsNav = ({ items }: BreadcrumbsNavProps) => {
  const [maybeFirst, ...rest] = items;
  const first = maybeFirst ?? { label: 'Home' };
  const firstLabel = first.label ?? 'Home';
  const firstIsButton = !first.href && typeof first.onClick === 'function';

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            asChild={firstIsButton}
            href={first?.href}
            onClick={first?.onClick}
            className="inline-flex items-center gap-1 bg-transparent p-0 text-left cursor-pointer"
            aria-label={first.href || first.onClick ? firstLabel : undefined}
          >
            {firstIsButton ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 bg-transparent p-0 text-left"
                aria-label={firstLabel}
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">{firstLabel}</span>
              </button>
            ) : first.href || first.onClick ? (
              <>
                <Home className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">{firstLabel}</span>
              </>
            ) : (
              <span>{firstLabel}</span>
            )}
          </BreadcrumbLink>
        </BreadcrumbItem>

        {rest.map((item, index) => (
          <BreadcrumbItem key={`${item.label}-${index}`} className="flex items-center">
            <BreadcrumbSeparator className="mx-1 flex items-center">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </BreadcrumbSeparator>
            {index === rest.length - 1 ? (
              <BreadcrumbPage>{item.label}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink
                asChild={!item.href && typeof item.onClick === 'function'}
                href={item.href}
                onClick={item.onClick}
                className="inline-flex items-center gap-1 bg-transparent p-0 text-left cursor-pointer hover:text-fg-default"
              >
                {item.href ? (
                  <span>{item.label}</span>
                ) : (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 bg-transparent p-0 text-left"
                  >
                    <span>{item.label}</span>
                  </button>
                )}
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
