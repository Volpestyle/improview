# @improview/ui

Improview's design system and UI component library. Built with **pastel aesthetics**, **tactile interactions**, and **accessibility first** principles.

## 🎨 Design Philosophy

- **Pastel-first**: Desaturated, luminosity-balanced colors that feel calm and professional
- **Tactile Everything**: Every interaction provides immediate visual feedback (≤180ms)
- **Instant Navigation**: Zero-millisecond page transitions for speed perception
- **Light/Dark Themes**: Seamless theme support with consistent pastel accents
- **Accessibility**: WCAG 2.2 AA compliant with ≥4.5:1 text contrast

## 📦 What's Inside

```
packages/ui/
├── src/
│   ├── theme/           # Design tokens and theme utilities
│   │   ├── tokens.json  # Single source of truth for all design values
│   │   ├── types.ts     # TypeScript types for tokens
│   │   └── index.ts     # Theme utilities (applyTheme, initializeTheme, etc.)
│   ├── styles/          # Global styles and CSS
│   │   └── theme.css    # Base theme styles
│   ├── components/      # React components
│   │   ├── Button/      # Button component
│   │   └── Card/        # Card component
│   └── index.ts         # Main entry point
├── docs/
│   ├── ui_design_guide.md        # Comprehensive design system guide
│   └── color-palette-guide.md    # Color token reference
└── demo/
    └── index.html                 # Interactive design system showcase
```

## 🚀 Quick Start

### Installation

```bash
pnpm add @improview/ui
```

### Basic Usage

```tsx
import { initializeTheme, applyTheme, Button, Card } from '@improview/ui';
import '@improview/ui/styles';

// Initialize theme on app load (respects user preference)
const currentTheme = initializeTheme();

// Manually switch themes
applyTheme('dark'); // or 'light'

// Use components
function MyApp() {
  return (
    <Card
      title="Welcome"
      subtitle="Get started with Improview UI"
      footer={<Button variant="primary">Get Started</Button>}
    >
      A beautiful, accessible component library with tactile interactions.
    </Card>
  );
}
```

### Using Design Tokens

```tsx
import { designTokens, getColorTokens } from '@improview/ui';

// Access tokens directly
const spacing = designTokens.space[4]; // 16px
const primaryColor = designTokens.color.light.accent.primary; // #83A598

// Get theme-specific tokens
const darkColors = getColorTokens('dark');
console.log(darkColors.bg.default); // #1C1C1C
```

### CSS Custom Properties

All tokens are automatically available as CSS custom properties:

```css
.my-component {
  background: var(--color-bg-panel);
  color: var(--color-fg-default);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  font-family: var(--font-sans);
  transition: transform var(--motion-duration-base) var(--motion-easing-spring);
}

.my-button:hover {
  transform: scale(1.02);
}

.my-button:active {
  transform: scale(0.97);
}
```

## 🎨 Color Palette

### Light Mode

- **Background**: `#FBF1C7` (warm papier)
- **Text**: `#1C1C1C` (pure black)
- **Primary Accent**: `#83A598` (teal-blue)
- **Success**: `#689D6A` (soft green)
- **Warning**: `#D79921` (warm amber)
- **Danger**: `#CC241D` (muted red)

### Dark Mode

- **Background**: `#1C1C1C` (charcoal)
- **Text**: `#EBDBB2` (soft white)
- **Primary Accent**: `#83A598` (same teal-blue!)
- **Success**: `#8EC07C` (mint green)
- **Warning**: `#FABD2F` (bright yellow)
- **Danger**: `#FB4934` (coral red)

**Note**: Primary accent (`#83A598`) is shared across both themes for brand consistency.

## 🎭 Motion Guidelines

### Tactile Interactions (Required for all components)

```css
/* Button tactile feedback */
.button {
  transition:
    transform 60ms ease,
    box-shadow 120ms ease;
}

.button:hover {
  transform: scale(1.02);
}

.button:active {
  transform: scale(0.97);
}

/* Input focus glow */
.input {
  transition:
    border-color 120ms ease,
    box-shadow 120ms ease;
}

.input:focus {
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}

/* Card hover lift */
.card {
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
```

### Duration Limits

- **Micro-interactions**: ≤120ms
- **Standard interactions**: ≤180ms
- **Complex interactions**: ≤240ms

### No Navigation Animations

```tsx
// ✅ DO: Instant page transitions
<Route path="/workspace" element={<WorkspacePage />} />

// ❌ DON'T: Animated route transitions
<AnimatedRoutes transition="fade" duration={300}>
  <Route path="/workspace" element={<WorkspacePage />} />
</AnimatedRoutes>
```

## 🔧 Utilities

### Theme Functions

```tsx
import {
  initializeTheme,
  applyTheme,
  getSystemTheme,
  getStoredTheme,
  storeTheme,
} from '@improview/ui';

// Initialize on app load
const theme = initializeTheme(); // Uses stored preference or system preference

// Manually switch
applyTheme('dark');
storeTheme('dark'); // Persist to localStorage

// Check preferences
const systemTheme = getSystemTheme(); // 'light' or 'dark'
const storedTheme = getStoredTheme(); // 'light' | 'dark' | null
```

### CSS Variable Generation

```tsx
import { generateCSSVariables } from '@improview/ui';

// Generate CSS custom properties for a theme
const lightVars = generateCSSVariables('light');
console.log(lightVars);
// --color-bg-default: #FBF1C7;
// --color-fg-default: #1C1C1C;
// ...
```

## 📖 Documentation

- **[UI Design Guide](./docs/ui_design_guide.md)**: Complete design system documentation
- **[Color Palette Guide](./docs/color-palette-guide.md)**: Color token reference with examples
- **[Interactive Demo](./demo/index.html)**: Open in browser to explore colors and typography

### View Demo

```bash
cd packages/ui
open demo/index.html
```

## 🧪 Development

### Build

```bash
pnpm build
```

### Watch Mode

```bash
pnpm dev
```

### Storybook

```bash
pnpm storybook
```

## ✨ Component Guidelines

All components must follow these principles:

1. **Tactile Feedback**: Every interactive element has hover/active states
2. **Theme-Aware**: Use CSS custom properties, never hard-coded colors
3. **Accessible**: WCAG 2.2 AA minimum, keyboard navigable
4. **Typed**: Full TypeScript support with proper generic typing
5. **Tested**: Unit tests + visual regression tests + accessibility tests
6. **Documented**: Storybook stories with usage examples

## 📦 Components API

### Button

Tactile button component with multiple variants and sizes.

```tsx
import { Button } from '@improview/ui';

<Button variant="primary" size="md">
  Click me
</Button>;
```

**Props**: `variant` (primary | secondary | ghost | danger), `size` (sm | md | lg), `isLoading`, `leftIcon`, `rightIcon`, `fullWidth`, `disabled`

[View full documentation](./docs/BUTTON_COMPONENT.md)

### Card

Flexible container component for content with optional media, header, body, and footer.

```tsx
import { Card } from '@improview/ui';

<Card interactive title="Card Title" subtitle="Subtitle" media={<img src="..." />}>
  Card content
</Card>;
```

**Props**: `media`, `title`, `subtitle`, `children`, `footer`, `interactive`, `onClick`, `variant` (default | elevated | outlined)

[View full documentation](./docs/CARD_COMPONENT.md)

## 🎯 Roadmap

- [x] Core components (Button, Card)
- [ ] Input components
- [ ] Form components with validation
- [ ] Modal/Dialog system
- [ ] Toast notification system
- [ ] Navigation components
- [ ] Data table components
- [ ] React hooks for theme management
- [ ] Framer Motion integration
- [ ] Tailwind CSS plugin

## 📄 License

MIT © Improview

---

**Built with 💙 using Geist font and pastel colors**
