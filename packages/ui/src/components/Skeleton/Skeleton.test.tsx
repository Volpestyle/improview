import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders without errors', () => {
    render(<Skeleton className="h-4 w-4" data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('animate-pulse');
  });

  it('allows radius variants', () => {
    const { rerender } = render(<Skeleton radius="sm" data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('rounded-sm');
    rerender(<Skeleton radius="full" data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('rounded-full');
  });
});
