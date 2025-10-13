import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';

describe('Button a11y', () => {
  it('exposes accessible name via children', () => {
    render(<Button>Generate</Button>);
    const button = screen.getByRole('button', { name: /generate/i });
    expect(button).toBeInTheDocument();
  });
});
