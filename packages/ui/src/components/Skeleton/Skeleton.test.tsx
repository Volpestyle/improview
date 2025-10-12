import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders without errors', () => {
    const { container } = render(<Skeleton className="h-4 w-4" />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('allows radius variants', () => {
    const { rerender, container } = render(<Skeleton radius="sm" />);
    expect(container.firstChild).toHaveClass('rounded-sm');
    rerender(<Skeleton radius="full" />);
    expect(container.firstChild).toHaveClass('rounded-full');
  });
});
