# Card Component

A flexible, reusable container component for displaying content with optional media, header, body, and footer sections. Supports interactive states with tactile animations.

## Features

- **Flexible Layout**: Configurable media, header, body, and footer sections
- **Interactive States**: Optional hover/tap animations for clickable cards
- **Theming**: Seamlessly adapts to light/dark themes
- **Accessibility**: Keyboard navigation, WCAG 2.2 AA compliant
- **Variants**: Default, elevated, and outlined styles
- **Tactile Feedback**: 60ms scale transforms on interaction

## Installation

The Card component is part of the `@improview/ui` package:

```bash
pnpm add @improview/ui
```

## Basic Usage

```tsx
import { Card } from '@improview/ui';

function Example() {
  return (
    <Card title="Card Title" subtitle="Subtitle text">
      Card body content goes here.
    </Card>
  );
}
```

## Props

```typescript
interface CardProps {
  /** Optional media/image element at the top of the card */
  media?: ReactNode;

  /** Main heading text */
  title?: string;

  /** Subtitle or secondary text below the title */
  subtitle?: string;

  /** Main body content */
  children?: ReactNode;

  /** Optional footer content */
  footer?: ReactNode;

  /** Whether the card is interactive (adds hover effects) */
  interactive?: boolean;

  /** Click handler for interactive cards */
  onClick?: () => void;

  /** Additional CSS class names */
  className?: string;

  /** Card variant */
  variant?: 'default' | 'elevated' | 'outlined';
}
```

## Examples

### Basic Card

```tsx
<Card title="Welcome" subtitle="Getting started">
  This is a simple card with a title, subtitle, and body content.
</Card>
```

### Card with Media

```tsx
<Card
  media={<img src="/image.jpg" alt="Preview" />}
  title="Beautiful Image"
  subtitle="High resolution"
>
  This card includes an image at the top.
</Card>
```

### Interactive Card

```tsx
<Card interactive onClick={() => console.log('Card clicked')} title="Clickable Card">
  Click anywhere on this card to trigger an action. Includes scale animations on hover and tap.
</Card>
```

### Card with Footer

```tsx
<Card
  title="Article Title"
  subtitle="By Jane Doe"
  footer={
    <div style={{ display: 'flex', gap: '8px' }}>
      <Button size="sm">Read More</Button>
      <Button size="sm" variant="ghost">
        Share
      </Button>
    </div>
  }
>
  Article preview text goes here...
</Card>
```

### Elevated Card

```tsx
<Card variant="elevated" title="Elevated Card">
  This card has a shadow and stands out from the background.
</Card>
```

### Outlined Card

```tsx
<Card variant="outlined" title="Outlined Card">
  This card has a prominent border and transparent background.
</Card>
```

### Color Palette Card (Real-world Example)

```tsx
function ColorCard({ name, hex, usage }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card
      interactive
      onClick={copyToClipboard}
      media={
        <div style={{ height: '120px', background: hex, position: 'relative' }}>
          {copied && <span style={copiedStyle}>Copied!</span>}
        </div>
      }
      title={name}
      subtitle={hex}
    >
      {usage}
    </Card>
  );
}
```

## Variants

### Default

- Panel background color
- Subtle border
- Standard elevation

### Elevated

- Elevated background color
- Medium shadow
- No border

### Outlined

- Transparent background
- Prominent 2px border
- No shadow

## Accessibility

- **Keyboard Navigation**: Interactive cards are keyboard accessible with `tabIndex={0}`
- **Focus Visible**: Clear focus outline for keyboard navigation
- **Role**: Interactive cards include `role="button"` for screen readers
- **Reduced Motion**: Respects `prefers-reduced-motion` user preference

## Styling

The Card component uses CSS custom properties for theming and can be customized via the design token system:

```css
.improview-card {
  border-radius: var(--radius-lg);
  /* Uses theme-aware colors */
  background-color: var(--color-bg-panel);
  border: 1px solid var(--color-border-default);
}
```

## Animation Details

Interactive cards use GPU-accelerated transforms:

- **Hover**: `scale(1.02)` - subtle lift effect
- **Tap**: `scale(0.98)` - tactile press feedback
- **Duration**: 60ms for instant response
- **Easing**: `easeInOut` for smooth transitions

## Best Practices

1. **Use Interactive Wisely**: Only set `interactive={true}` for cards that actually respond to clicks
2. **Keep Media Consistent**: Use consistent aspect ratios for media across similar cards
3. **Footer for Actions**: Place action buttons in the footer for better UX
4. **Title Hierarchy**: Use title for the main heading, subtitle for metadata
5. **Accessibility**: Always provide meaningful click handlers for interactive cards

## Related Components

- [Button](./BUTTON_COMPONENT.md) - Often used in card footers
- [Theme System](../README.md#theming) - For customizing card appearance
