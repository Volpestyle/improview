# Button Component Documentation

## Overview

The Button component is a foundational interactive element with **tactile feedback** animations, multiple style variants, and full accessibility support.

## Features

✨ **Tactile Animations**

- Hover: `scale(1.02)` with shadow elevation (120ms)
- Active: `scale(0.97)` press effect (60ms)
- GPU-accelerated transforms only

🎨 **Style Variants**

- `primary` - Accent color background for primary actions
- `secondary` - Panel background with border for secondary actions
- `ghost` - Transparent with hover state for tertiary actions
- `danger` - Red background for destructive actions

📏 **Size Variants**

- `sm` - Small (36px min-height)
- `md` - Medium (44px min-height, default)
- `lg` - Large (52px min-height)

♿ **Accessibility**

- Full keyboard support
- Focus visible with 2px outline
- ARIA labels for loading states
- Screen reader announcements
- 44px minimum touch target

🔧 **Additional Features**

- Loading states with animated spinner
- Left/right icon support
- Full width option
- Disabled states
- Theme-aware colors

## Usage

### Basic Example

```tsx
import { Button } from '@improview/ui';

function MyComponent() {
  return <Button variant="primary">Click me</Button>;
}
```

### All Variants

```tsx
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>
```

### Sizes

```tsx
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

### With Icons

```tsx
<Button variant="primary" leftIcon={<PlusIcon />}>
  Add Item
</Button>

<Button variant="secondary" rightIcon={<ChevronRightIcon />}>
  Continue
</Button>
```

### Loading State

```tsx
const [isLoading, setIsLoading] = useState(false);

<Button variant="primary" isLoading={isLoading} onClick={() => handleSubmit()}>
  Submit
</Button>;
```

### Full Width

```tsx
<Button variant="primary" fullWidth>
  Full Width Button
</Button>
```

### Disabled

```tsx
<Button variant="primary" disabled>
  Disabled Button
</Button>
```

## Props

```typescript
interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';

  /** Size of the button */
  size?: 'sm' | 'md' | 'lg';

  /** Loading state */
  isLoading?: boolean;

  /** Icon before text */
  leftIcon?: ReactNode;

  /** Icon after text */
  rightIcon?: ReactNode;

  /** Full width */
  fullWidth?: boolean;

  /** Button content */
  children: ReactNode;
}
```

## Design Tokens Used

The Button component uses CSS custom properties from the design system:

### Colors

- `--color-accent-primary` - Primary button background
- `--color-accent-emphasis` - Primary button hover
- `--color-bg-panel` - Secondary button background
- `--color-bg-elevated` - Secondary button hover
- `--color-fg-default` - Text color
- `--color-fg-inverse` - Text on colored backgrounds
- `--color-danger-600` - Danger button background
- `--color-border-default` - Secondary button border
- `--color-border-focus` - Focus outline

### Spacing

- `--space-2` through `--space-8` for padding
- `--space-2` for icon gaps

### Typography

- `--font-sans` - Font family
- `--font-weight-medium` - Font weight
- `--font-size-sm/base/md` - Size-specific font sizes

### Other

- `--radius-md` - Border radius (12px)
- `--shadow-sm/md` - Box shadows
- `--motion-duration-fast/base` - Animation durations
- `--motion-easing-in-out` - Transition easing

## Accessibility Checklist

- ✅ Keyboard accessible (Enter/Space to activate)
- ✅ Focus visible (2px outline)
- ✅ Screen reader friendly
- ✅ Loading state announced
- ✅ Disabled state properly handled
- ✅ Minimum 44px touch target
- ✅ Color contrast meets WCAG AA
- ✅ Respects `prefers-reduced-motion`

## Animation Specifications

### Hover (scale 1.02)

```css
transition: transform 120ms ease;
transform: scale(1.02);
```

### Active (scale 0.97)

```css
transition: transform 60ms ease;
transform: scale(0.97);
```

### Loading Spinner

```css
animation: spin 800ms linear infinite;
```

### Reduced Motion

All animations disabled when `prefers-reduced-motion: reduce` is set.

## Examples in Demo

Visit `http://localhost:3001` after running `pnpm demo` to see:

- All variant combinations
- Size variations
- Icon examples
- Loading states
- Disabled states
- Full width examples
- Real-world usage patterns

## Best Practices

### ✅ Do

- Use `primary` for main call-to-action
- Use `secondary` for alternative actions
- Use `ghost` for tertiary/low-priority actions
- Use `danger` for destructive actions (delete, remove, etc.)
- Provide loading states for async operations
- Use icons to enhance clarity
- Ensure button text is descriptive

### ❌ Don't

- Don't use multiple primary buttons in one section
- Don't use danger variant for non-destructive actions
- Don't override theme colors directly
- Don't animate layout properties (width/height)
- Don't disable buttons without explanation
- Don't use tiny buttons (<36px height)

## Integration with Form Libraries

### React Hook Form

```tsx
import { useForm } from 'react-hook-form';
import { Button } from '@improview/ui';

function MyForm() {
  const { handleSubmit, formState } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* form fields */}
      <Button type="submit" variant="primary" isLoading={formState.isSubmitting}>
        Submit
      </Button>
    </form>
  );
}
```

### With Async Actions

```tsx
function AsyncButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await someAsyncOperation();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button variant="primary" isLoading={isLoading} onClick={handleClick}>
      Save Changes
    </Button>
  );
}
```

## Customization

The Button component uses CSS custom properties, allowing you to customize colors at the theme level without modifying the component:

```css
:root {
  --color-accent-primary: #YOUR_COLOR;
  --color-danger-600: #YOUR_COLOR;
}
```

## Performance

- **GPU-accelerated**: Only `transform` and `opacity` are animated
- **Lightweight**: ~2KB gzipped
- **Tree-shakeable**: Only imported variants are included
- **No layout shift**: Maintains size during loading states
- **Optimized**: Framer Motion optimizes animations automatically

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support (including touch targets)
- IE11: ❌ Not supported

## Related Components

- **ButtonGroup** (Coming soon) - Group multiple buttons
- **IconButton** (Coming soon) - Icon-only button variant
- **LinkButton** (Coming soon) - Button styled as link

## File Structure

```
src/components/Button/
├── Button.tsx        # Main component
├── Button.types.ts   # TypeScript types
├── Button.css        # Styles
└── index.ts          # Exports
```
