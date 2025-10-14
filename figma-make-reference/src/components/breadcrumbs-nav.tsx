import { ChevronRight, Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/breadcrumb';

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface BreadcrumbsNavProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbsNav({ items }: BreadcrumbsNavProps) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            onClick={items[0]?.onClick}
            className="flex items-center gap-1 cursor-pointer"
            style={{ color: 'var(--fg-muted)' }}
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Home</span>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {items.map((item, index) => (
          <div key={index} className="flex items-center">
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" style={{ color: 'var(--fg-subtle)' }} />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              {index === items.length - 1 ? (
                <BreadcrumbPage style={{ color: 'var(--fg-default)' }}>
                  {item.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  onClick={item.onClick}
                  className="cursor-pointer"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  {item.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
