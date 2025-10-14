# Getting Started with @improview/ui

Welcome to the Improview UI Design System! This guide will help you get up and running.

## 📁 Directory Structure

```
packages/ui/
├── src/
│   ├── theme/                    # Design tokens and theme utilities
│   │   ├── tokens.json          # ⭐ Single source of truth for all design values
│   │   ├── types.ts             # TypeScript types for tokens
│   │   └── index.ts             # Theme utilities (applyTheme, etc.)
│   ├── styles/
│   │   └── theme.css            # Base theme styles
│   ├── components/              # React components (coming soon)
│   └── index.ts                 # Main entry point
├── docs/
│   ├── ui_design_guide.md       # 📖 Comprehensive design system documentation
│   └── color-palette-guide.md   # 🎨 Color token reference
├── demo/
│   └── index.html               # 🎭 Interactive design system showcase
└── README.md                     # Package documentation
```

## 🚀 Quick Commands

### View the Interactive Demo

```bash
cd packages/ui
pnpm demo
```

This opens `demo/index.html` in your browser where you can:

- 🎨 See all colors live
- 🔄 Toggle between light/dark themes
- 📋 Click any color to copy hex values
- 👁️ Preview typography with Geist font

### Build the Package

```bash
cd packages/ui
pnpm build
```

### Development Mode

```bash
cd packages/ui
pnpm dev
```

Watches for changes and rebuilds automatically.

### Run Storybook (coming soon)

```bash
cd packages/ui
pnpm storybook
```

## 🎨 Understanding the Design System

### 1. Design Tokens (`src/theme/tokens.json`)

This is your **single source of truth**. All visual values are defined here:

```json
{
  "color": {
    "light": {
      /* light mode colors */
    },
    "dark": {
      /* dark mode colors */
    }
  },
  "space": {
    /* spacing scale */
  },
  "radius": {
    /* border radius values */
  },
  "font": {
    /* typography scale */
  },
  "motion": {
    /* animation durations */
  }
}
```

**Never hard-code values** in components. Always reference tokens!

### 2. Theme System

The theme system converts tokens into CSS custom properties and manages light/dark switching:

```tsx
import { initializeTheme, applyTheme } from '@improview/ui';

// Initialize on app load
const currentTheme = initializeTheme();

// Switch themes
applyTheme('dark');
```

### 3. Design Principles

Read the **[UI Design Guide](./docs/ui_design_guide.md)** to understand:

- ✨ **Tactile interactions**: Every component has hover/active feedback (≤180ms)
- ⚡ **Instant navigation**: Zero page transition animations
- 🎨 **Pastel aesthetics**: Desaturated, calming colors
- ♿ **Accessibility**: WCAG 2.2 AA minimum
- 🌓 **Theme flexibility**: Seamless light/dark support

## 📖 Essential Reading

### Start Here

1. **[README.md](./README.md)** - Package overview and quick start
2. **[demo/index.html](./demo/index.html)** - Visual exploration (open in browser!)
3. **[docs/color-palette-guide.md](./docs/color-palette-guide.md)** - Color token reference

## 💡 Common Tasks

### Use a Color Token

```tsx
import { designTokens } from '@improview/ui';

// JavaScript
const bgColor = designTokens.color.light.bg.default; // #FBF1C7

// CSS
.my-component {
  background: var(--color-bg-default);
  color: var(--color-fg-default);
}
```

### Apply Theme on Page Load

```tsx
import { initializeTheme } from '@improview/ui';
import '@improview/ui/styles';

// In your app entry point
function App() {
  useEffect(() => {
    initializeTheme(); // Respects stored preference or system theme
  }, []);

  return <YourApp />;
}
```

### Create a Themed Component

```tsx
import { tokens } from '@improview/ui';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', children }: ButtonProps) {
  return (
    <button
      className="button"
      data-variant={variant}
      style={{
        // Use CSS custom properties
        padding: `var(--space-3) var(--space-6)`,
        borderRadius: `var(--radius-md)`,
        fontFamily: `var(--font-sans)`,
        fontWeight: `var(--font-weight-medium)`,
        transition: `transform var(--motion-duration-fast) ease`,
      }}
    >
      {children}
    </button>
  );
}
```

```css
/* button.css */
.button {
  background: var(--color-accent-primary);
  color: var(--color-fg-inverse);
  border: none;
  cursor: pointer;
}

.button:hover {
  transform: scale(1.02);
}

.button:active {
  transform: scale(0.97);
}

.button[data-variant='secondary'] {
  background: var(--color-bg-panel);
  color: var(--color-fg-default);
  border: 1px solid var(--color-border-default);
}
```

### Add Tactile Feedback (Required!)

Every interactive component **must** have tactile feedback:

```css
.interactive-element {
  transition:
    transform 120ms ease,
    box-shadow 120ms ease;
}

.interactive-element:hover {
  transform: scale(1.02) translateY(-1px);
  box-shadow: var(--shadow-md);
}

.interactive-element:active {
  transform: scale(0.97);
}
```

## 🎯 Next Steps

1. **Explore the demo**: `pnpm demo` - See colors and typography in action
2. **Read the design guide**: Open `docs/ui_design_guide.md`
3. **Check contrast ratios**: Review `docs/color-palette-guide.md`
4. **Start building**: Create your first component following the patterns

## 🤝 Contributing

When adding components:

1. ✅ Use tokens only (no hard-coded colors)
2. ✅ Add tactile feedback (hover/active states)
3. ✅ Support light/dark themes
4. ✅ Meet accessibility standards (WCAG 2.2 AA)
5. ✅ Add TypeScript types
6. ✅ Write Storybook stories
7. ✅ Include tests

## 🆘 Need Help?

- **Color questions?** → `docs/color-palette-guide.md`
- **Motion guidelines?** → `docs/ui_design_guide.md` (Motion & Feedback section)
- **Component patterns?** → `docs/ui_design_guide.md` (Components & Patterns section)
- **Token usage?** → `src/theme/index.ts` exports and README examples

---

Happy building! 🎨✨
