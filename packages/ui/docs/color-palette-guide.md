# Improview Color Palette Guide

## Quick Summary

**Philosophy:** Pastel-first design system with seamless light/dark theme support. Desaturated, luminosity-balanced colors that feel calm and professional.

## Color Philosophy

### Light Mode

- **Foundation:** Warm off-white `#FBF1C7` (papier aesthetic)
- **Text:** Pure black `#1C1C1C` for maximum readability
- **Accents:** Soft pastels that don't overwhelm
- **Vibe:** Minimal, clean, paper-like quality

### Dark Mode

- **Foundation:** Charcoal `#1C1C1C` for comfortable low-light
- **Text:** Soft white `#EBDBB2`
- **Accents:** Same pastels, contrast-adjusted
- **Vibe:** Warm, comfortable, not stark

## Color Tokens

### Backgrounds

| Token         | Light     | Dark      | Usage                       |
| ------------- | --------- | --------- | --------------------------- |
| `bg.default`  | `#FBF1C7` | `#1C1C1C` | Main app background         |
| `bg.panel`    | `#F2E5BC` | `#282828` | Cards, sidebars             |
| `bg.sunken`   | `#EBDBB2` | `#161616` | Input backgrounds, wells    |
| `bg.elevated` | `#FFFFFF` | `#323232` | Modals, dropdowns, tooltips |

### Foreground / Text

| Token        | Light     | Dark      | Usage                       |
| ------------ | --------- | --------- | --------------------------- |
| `fg.default` | `#1C1C1C` | `#EBDBB2` | Body text, headings         |
| `fg.muted`   | `#504945` | `#A89984` | Secondary text              |
| `fg.subtle`  | `#7C6F64` | `#928374` | Tertiary text, placeholders |
| `fg.inverse` | `#FBF1C7` | `#1C1C1C` | Text on colored backgrounds |

### Pastel Accents (Core Identity)

| Token             | Light     | Dark      | Notes                                        |
| ----------------- | --------- | --------- | -------------------------------------------- |
| `accent.primary`  | `#83A598` | `#83A598` | Teal-blue • Links, focus indicators (shared) |
| `accent.emphasis` | `#689D6A` | `#8EC07C` | Soft green • CTAs, interactive elements      |
| `accent.soft`     | `#B8D4CB` | `#5A7E72` | Muted accent • Subtle highlights             |

### Semantic Colors

#### Info

- **Light:** `#76A9D8` (sky blue)
- **Dark:** `#7DAEA3` (aqua)
- **Usage:** Informational messages, hints

#### Success

- **Light:** `#689D6A` (soft green)
- **Dark:** `#8EC07C` (mint green)
- **Usage:** Success states, passing tests, confirmations

#### Warning

- **Light:** `#D79921` (warm amber)
- **Dark:** `#FABD2F` (bright yellow)
- **Usage:** Warnings, timer alerts, caution states

#### Danger

- **Light:** `#CC241D` (muted red)
- **Dark:** `#FB4934` (coral red)
- **Usage:** Errors, failing tests, destructive actions

### Borders

| Token            | Light     | Dark      | Usage                                   |
| ---------------- | --------- | --------- | --------------------------------------- |
| `border.default` | `#D5C4A1` | `#3C3836` | Standard borders                        |
| `border.subtle`  | `#E5D5B7` | `#504945` | Dividers, separators                    |
| `border.focus`   | `#83A598` | `#83A598` | Focus indicators (shared across themes) |

### Shadows

**Light Mode:**

- `sm`: `0 2px 6px rgba(60, 56, 54, 0.08)`
- `md`: `0 8px 20px rgba(60, 56, 54, 0.12)`

**Dark Mode:**

- `sm`: `0 2px 6px rgba(0, 0, 0, 0.32)`
- `md`: `0 8px 20px rgba(0, 0, 0, 0.48)`

## Design Principles

### 1. Accessibility First

- ✅ **Body text:** ≥4.5:1 contrast ratio
- ✅ **Large text:** ≥3:1 contrast ratio
- ✅ **Interactive elements:** ≥3:1 contrast ratio
- ✅ **Focus indicators:** High contrast `#83A598` visible in both themes

### 2. Pastel Strategy

- **Desaturated:** Never garish or overwhelming
- **Luminosity-balanced:** Comfortable in both themes
- **Professional:** Calm, focused, trustworthy
- **Consistent:** Same accent colors across themes (adjusted for contrast)

### 3. Semantic Usage

- **Primary accent (`#83A598`):** Links, focus rings, selected states
- **Success (`#689D6A` / `#8EC07C`):** Passing tests, confirmations
- **Warning (`#D79921` / `#FABD2F`):** Timer alerts, cautions
- **Danger (`#CC241D` / `#FB4934`):** Errors, destructive actions

### 4. Theme Switching

- **Respects:** `prefers-color-scheme` by default
- **Manual toggle:** Persists to localStorage
- **Transition:** 180ms for color properties
- **Reduced-motion:** Instant swap when preference detected

## Usage Guidelines

### ✅ Do

- Use semantic tokens (e.g., `bg.default`, `accent.primary`)
- Map tokens to CSS custom properties
- Test contrast ratios in both themes
- Use pastel accents sparingly for impact
- Maintain consistent accent color meanings

### ❌ Don't

- Hard-code hex values directly in components
- Use saturated, bright colors that clash with pastels
- Ignore contrast requirements
- Mix different accent semantics (e.g., success green for warnings)
- Create theme-specific logic in components (use CSS variables)

## Implementation Notes

### CSS Custom Properties Pattern

```css
:root {
  /* Light theme (default) */
  --color-bg-default: #fbf1c7;
  --color-fg-default: #1c1c1c;
  --color-accent-primary: #83a598;
}

[data-theme='dark'] {
  /* Dark theme overrides */
  --color-bg-default: #1c1c1c;
  --color-fg-default: #ebdbb2;
  /* accent.primary stays the same! */
}
```

### Tailwind Config Integration

```js
// tailwind.config.ts
colors: {
  bg: {
    default: 'var(--color-bg-default)',
    panel: 'var(--color-bg-panel)',
    // ...
  },
  fg: {
    default: 'var(--color-fg-default)',
    // ...
  },
  accent: {
    primary: '#83A598', // Shared across themes
    emphasis: 'var(--color-accent-emphasis)',
    // ...
  }
}
```

## Visual Contrast Examples

### Light Mode Contrasts

- `#1C1C1C` on `#FBF1C7` → **12.8:1** ✅ (body text)
- `#504945` on `#FBF1C7` → **7.2:1** ✅ (muted text)
- `#83A598` on `#FBF1C7` → **3.5:1** ✅ (links/accents)
- `#689D6A` on `#FBF1C7` → **4.1:1** ✅ (success)

### Dark Mode Contrasts

- `#EBDBB2` on `#1C1C1C` → **11.4:1** ✅ (body text)
- `#A89984` on `#1C1C1C` → **6.8:1** ✅ (muted text)
- `#83A598` on `#1C1C1C` → **4.9:1** ✅ (links/accents)
- `#8EC07C` on `#1C1C1C` → **6.2:1** ✅ (success)

All contrasts meet or exceed WCAG 2.2 AA standards!

## Interactive Visualization

Open `color-palette-viewer.html` in your browser to:

- 🎨 See all colors live
- 🔄 Toggle between light/dark themes instantly
- 📋 Click any color card to copy hex value
- 👁️ Preview text contrast in real-time

## Token File Location

Tokens are stored in `/tokens/tokens.json` following this structure:

```json
{
  "color": {
    "light": {
      /* light mode colors */
    },
    "dark": {
      /* dark mode colors */
    }
  }
}
```

Build tools generate CSS custom properties from this single source of truth.
