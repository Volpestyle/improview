import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './Skeleton';

describe('Skeleton a11y', () => {
  it('marks skeleton as hidden from assistive tech', () => {
    const { container } = render(<Skeleton className="h-4 w-4" />);
    const element = container.firstChild as HTMLElement;
    expect(element).toHaveAttribute('aria-hidden', 'true');
  });
});
