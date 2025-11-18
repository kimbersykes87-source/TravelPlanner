# Design System Documentation

This document outlines the design system for the Travel Planner application, including all fonts, colors, and design tokens used throughout the application.

## Table of Contents
- [Typography](#typography)
- [Colors](#colors)
- [Spacing & Layout](#spacing--layout)
- [Borders & Shadows](#borders--shadows)
- [Usage Guidelines](#usage-guidelines)

---

## Typography

### Font Families

The application uses a carefully selected font stack for different purposes:

#### Primary Font (Body Text)
- **Variable**: `--font-primary`
- **Value**: `'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`
- **Usage**: All body text, paragraphs, and general content
- **Source**: Google Fonts (Inter)

#### Display Font (Headings)
- **Variable**: `--font-display`
- **Value**: `'Bebas Neue', 'Inter', system-ui, -apple-system, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`
- **Usage**: Headings (h1, h2, h3), tab labels, navigation
- **Source**: Google Fonts (Bebas Neue)
- **Characteristics**: Uppercase, wide letter spacing, bold appearance

#### Monospace Font
- **Variable**: `--font-mono`
- **Value**: `'Space Mono', monospace`
- **Usage**: Code snippets, dates, technical information
- **Source**: Google Fonts (Space Mono)

#### Custom Brand Font
- **Variable**: `--font-custom`
- **Value**: `'Encorpada Pro', var(--font-display)`
- **Usage**: Special brand elements (if available)
- **Source**: Local font file (`/assets/brand/fonts/encorpada-pro/encorpada-pro-regular.woff2`)

### Font Sizes

| Variable | Value | Usage |
|----------|-------|-------|
| `--font-size-xs` | `0.75rem` (12px) | Small labels, captions |
| `--font-size-sm` | `0.875rem` (14px) | Secondary text, form labels |
| `--font-size-base` | `1rem` (16px) | Body text (default) |
| `--font-size-lg` | `1.125rem` (18px) | Emphasized body text |
| `--font-size-xl` | `1.25rem` (20px) | Tab labels, subheadings |
| `--font-size-2xl` | `1.5rem` (24px) | Card titles, section headings |
| `--font-size-3xl` | `2rem` (32px) | Page headings (h2) |
| `--font-size-4xl` | `2.625rem` (42px) | Main page title (h1) |

### Font Weights

| Variable | Value | Usage |
|----------|-------|-------|
| `--font-weight-light` | `300` | Light text, subtitles |
| `--font-weight-normal` | `400` | Regular body text |
| `--font-weight-medium` | `500` | Medium emphasis |
| `--font-weight-semibold` | `600` | Strong emphasis, labels |
| `--font-weight-bold` | `700` | Bold headings |

### Letter Spacing

| Variable | Value | Usage |
|----------|-------|-------|
| `--letter-spacing-tight` | `0.05em` | Compact text |
| `--letter-spacing-normal` | `0.12em` | Tab labels, headings |
| `--letter-spacing-wide` | `0.14em` | Main title |

---

## Colors

### Base Colors

#### Background Colors
| Variable | Hex Value | Usage |
|----------|-----------|-------|
| `--color-bg-primary` | `#000000` | Main page background |
| `--color-bg-secondary` | `#1a1a1a` | Card backgrounds, tab bar |
| `--color-bg-tertiary` | `#2a2a2a` | Hover states, secondary cards |
| `--color-bg-quaternary` | `#3a3a3a` | Scrollbar thumb, active states |
| `--color-bg-quinary` | `#4a4a4a` | Scrollbar buttons |
| `--color-bg-senary` | `#5a5a5a` | Scrollbar button hover |

#### Text Colors
| Variable | Hex Value | Usage |
|----------|-----------|-------|
| `--color-text-primary` | `#f8fafc` | Primary text (body) |
| `--color-text-secondary` | `#cbd5e1` | Secondary text, descriptions |
| `--color-text-tertiary` | `#94a3b8` | Muted text, placeholders |
| `--color-text-muted` | `#ccc` | Very muted text |
| `--color-text-white` | `#ffffff` | Pure white text |
| `--color-text-heading` | `#ffffff` | Heading text |

### Accent Colors (Primary Blue)

| Variable | Hex Value | Usage |
|----------|-----------|-------|
| `--color-primary` | `#3b82f6` | Primary actions, active states, links |
| `--color-primary-hover` | `#2563eb` | Button hover states |
| `--color-primary-dark` | `#1e40af` | Darker blue variants |
| `--color-primary-light` | `#bfdbfe` | Light blue accents |

### Status Colors

#### Success (Green)
| Variable | Hex Value | Usage |
|----------|-----------|-------|
| `--color-success` | `#10b981` | Success indicators |
| `--color-success-dark` | `#155724` | Success text, borders |
| `--color-success-bg` | `#d4edda` | Success backgrounds |
| `--color-success-border` | `#c3e6cb` | Success borders |

#### Warning (Yellow/Orange)
| Variable | Hex Value | Usage |
|----------|-----------|-------|
| `--color-warning` | `#f59e0b` | Warning indicators |
| `--color-warning-light` | `#fbbf24` | Light warning accents |
| `--color-warning-dark` | `#ffc107` | Darker warning variants |

#### Error (Red)
| Variable | Hex Value | Usage |
|----------|-----------|-------|
| `--color-error` | `#ef4444` | Error indicators, danger states |
| `--color-error-light` | `#f87171` | Light error accents |
| `--color-error-dark` | `#721c24` | Error text, borders |
| `--color-error-bg` | `#f8d7da` | Error backgrounds |
| `--color-error-border` | `#f5c6cb` | Error borders |

### Relationship/Timeline Colors

These colors are used to represent different travel scenarios and relationship states:

| Variable | Hex Value | Usage |
|----------|-----------|-------|
| `--color-together` | `#28a745` | Together travel periods |
| `--color-together-dark` | `#155724` | Together borders/strokes |
| `--color-together-timeline` | `#4CAF50` | Timeline together items |
| `--color-kimber` | `#3b82f6` | Kimber's solo travel |
| `--color-kimber-dark` | `#1e40af` | Kimber borders/strokes |
| `--color-siona` | `#ec4899` | Siona's solo travel |
| `--color-siona-dark` | `#9d174d` | Siona borders/strokes |
| `--color-separately` | `#a855f7` | Separate travel periods |
| `--color-separately-dark` | `#7c3aed` | Separate borders/strokes |
| `--color-scenario` | `#9A6BFF` | Future travel scenarios |
| `--color-scenario-dark` | `#6B31FF` | Scenario borders/strokes |

### Scenario Map Gradient Colors

Used for visualizing future travel scenarios on the map:

| Variable | Hex Value | Usage |
|----------|-----------|-------|
| `--color-scenario-map-1` | `#F2E9FF` | Lightest scenario color |
| `--color-scenario-map-2` | `#C9A7FF` | Light scenario color |
| `--color-scenario-map-3` | `#9A6BFF` | Medium scenario color |
| `--color-scenario-map-4` | `#6B31FF` | Dark scenario color |
| `--color-scenario-map-5` | `#2E007A` | Darkest scenario color |

### Additional UI Colors

| Variable | Hex Value | Usage |
|----------|-----------|-------|
| `--color-blue-light` | `#60a5fa` | Light blue accents |
| `--color-pink-light` | `#f472b6` | Light pink accents |
| `--color-yellow` | `#facc15` | Yellow accents |
| `--color-yellow-light` | `#fef08a` | Light yellow |
| `--color-yellow-lighter` | `#fde68a` | Very light yellow |
| `--color-green-light` | `#4ade80` | Light green accents |
| `--color-red-light` | `#fecaca` | Light red accents |
| `--color-blue-purple` | `#cbd5f5` | Blue-purple tint |
| `--color-gray-medium` | `#9ca3af` | Medium gray |

### Slate Color Scale

A comprehensive gray scale for various UI elements:

| Variable | Hex Value | Usage |
|----------|-----------|-------|
| `--color-slate-50` | `#f8fafc` | Lightest gray (almost white) |
| `--color-slate-100` | `#f1f5f9` | Very light gray |
| `--color-slate-200` | `#e2e8f0` | Light gray |
| `--color-slate-300` | `#cbd5e1` | Medium-light gray |
| `--color-slate-400` | `#94a3b8` | Medium gray |
| `--color-slate-500` | `#64748b` | Medium-dark gray |
| `--color-slate-600` | `#475569` | Dark gray |
| `--color-slate-700` | `#334155` | Darker gray |
| `--color-slate-800` | `#1e293b` | Very dark gray |
| `--color-slate-900` | `#0f172a` | Almost black |
| `--color-slate-950` | `#1f2937` | Darkest gray |

### Avatar Fallback Colors

Used when generating avatar colors for users:

| Variable | Hex Value |
|----------|-----------|
| `--color-avatar-1` | `#FF6B6B` (Coral Red) |
| `--color-avatar-2` | `#4ECDC4` (Turquoise) |
| `--color-avatar-3` | `#45B7D1` (Sky Blue) |
| `--color-avatar-4` | `#96CEB4` (Mint Green) |
| `--color-avatar-5` | `#FFEAA7` (Light Yellow) |
| `--color-avatar-6` | `#DDA0DD` (Plum) |
| `--color-avatar-7` | `#98D8C8` | (Seafoam) |
| `--color-avatar-8` | `#F7DC6F` (Golden Yellow) |

---

## Opacity Overlays

These variables define semi-transparent overlays for various UI effects:

### Base Overlays
| Variable | RGBA Value | Usage |
|----------|------------|-------|
| `--overlay-light` | `rgba(255, 255, 255, 0.05)` | Subtle backgrounds |
| `--overlay-medium` | `rgba(255, 255, 255, 0.1)` | Medium backgrounds |
| `--overlay-strong` | `rgba(255, 255, 255, 0.15)` | Strong backgrounds |
| `--overlay-dark` | `rgba(15, 23, 42, 0.6)` | Dark overlays |
| `--overlay-darker` | `rgba(15, 23, 42, 0.85)` | Very dark overlays |

### Primary Color Overlays
| Variable | RGBA Value | Usage |
|----------|------------|-------|
| `--overlay-primary` | `rgba(59, 130, 246, 0.15)` | Primary color backgrounds |
| `--overlay-primary-strong` | `rgba(59, 130, 246, 0.25)` | Strong primary backgrounds |
| `--overlay-primary-focus` | `rgba(59, 130, 246, 0.6)` | Focus states |
| `--overlay-primary-shadow` | `rgba(59, 130, 246, 0.25)` | Primary shadows |

### Border Overlays
| Variable | RGBA Value | Usage |
|----------|------------|-------|
| `--overlay-border-light` | `rgba(255, 255, 255, 0.1)` | Light borders |
| `--overlay-border-medium` | `rgba(255, 255, 255, 0.15)` | Medium borders |
| `--overlay-border-strong` | `rgba(255, 255, 255, 0.2)` | Strong borders |
| `--overlay-border-slate` | `rgba(148, 163, 184, 0.2)` | Slate borders |
| `--overlay-border-slate-strong` | `rgba(148, 163, 184, 0.3)` | Strong slate borders |
| `--overlay-border-slate-medium` | `rgba(148, 163, 184, 0.4)` | Medium slate borders |

---

## Borders & Shadows

### Border Radius

| Variable | Value | Usage |
|----------|-------|-------|
| `--border-radius-sm` | `5px` | Small elements |
| `--border-radius-md` | `8px` | Buttons, inputs, cards |
| `--border-radius-lg` | `10px` | Larger cards |
| `--border-radius-xl` | `15px` | Panels, containers |

### Border Width

| Variable | Value | Usage |
|----------|-------|-------|
| `--border-width-thin` | `1px` | Standard borders |
| `--border-width-medium` | `2px` | Emphasized borders |
| `--border-width-thick` | `4px` | Strong borders (visa items, timeline) |

### Shadows

| Variable | Value | Usage |
|----------|-------|-------|
| `--shadow-sm` | `0 2px 5px rgba(0, 0, 0, 0.2)` | Small shadows |
| `--shadow-md` | `0 5px 15px rgba(0, 0, 0, 0.1)` | Medium shadows (tabs, cards) |
| `--shadow-lg` | `0 8px 25px rgba(0, 0, 0, 0.3)` | Large shadows |
| `--shadow-focus` | `0 0 0 2px var(--overlay-primary-shadow)` | Focus ring shadows |

---

## Usage Guidelines

### CSS Variables

All design tokens are defined as CSS custom properties in the `:root` selector. To use them in your CSS:

```css
.my-element {
    color: var(--color-text-primary);
    background: var(--color-bg-secondary);
    border-radius: var(--border-radius-md);
    box-shadow: var(--shadow-md);
}
```

### JavaScript Access

To access CSS variables in JavaScript:

```javascript
const root = getComputedStyle(document.documentElement);
const primaryColor = root.getPropertyValue('--color-primary').trim();
```

### Color Selection Guidelines

1. **Primary Actions**: Always use `--color-primary` for buttons and interactive elements
2. **Text Hierarchy**: Use `--color-text-primary` for main text, `--color-text-secondary` for supporting text, and `--color-text-tertiary` for muted information
3. **Status Indicators**: Use semantic color variables (`--color-success`, `--color-warning`, `--color-error`) rather than arbitrary colors
4. **Backgrounds**: Use the background color scale (`--color-bg-primary` through `--color-bg-senary`) for layering and depth
5. **Borders**: Use overlay border variables for subtle separations, or status colors for emphasis

### Typography Guidelines

1. **Headings**: Always use `--font-display` for h1-h6 elements
2. **Body Text**: Use `--font-primary` for all paragraph and body content
3. **Code/Dates**: Use `--font-mono` for technical information, dates, and code
4. **Sizing**: Use the font size scale rather than arbitrary pixel values
5. **Weights**: Prefer semantic weight variables over numeric values

### Consistency

- Always use design tokens instead of hardcoded values
- Maintain color consistency across similar UI elements
- Use the established spacing and sizing scales
- Follow the opacity overlay patterns for layered UI elements

---

## Future Enhancements

Potential additions to the design system:

- **Spacing Scale**: Standardized spacing variables (padding, margin, gap)
- **Breakpoints**: Responsive design breakpoints
- **Animation Durations**: Standardized transition and animation timings
- **Z-Index Scale**: Layering system for stacking contexts
- **Component Tokens**: Component-specific design tokens

---

*Last Updated: 2024*
*Maintained in: `digital-nomad-planner.html` (CSS variables section)*



