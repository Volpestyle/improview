import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('fires onClick handler when enabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Tap</Button>);
    fireEvent.click(screen.getByRole('button', { name: /tap/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables interaction when loading', () => {
    const handleClick = vi.fn();
    render(
      <Button loading onClick={handleClick}>
        Loading
      </Button>,
    );
    const button = screen.getByRole('button', { name: /loading/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('defaults type to button', () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
  });
});
