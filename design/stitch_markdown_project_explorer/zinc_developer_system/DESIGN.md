---
name: Zinc Developer System
colors:
  surface: '#141313'
  surface-dim: '#141313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353434'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#c0c1ff'
  on-secondary: '#1000a9'
  secondary-container: '#3131c0'
  on-secondary-container: '#b0b2ff'
  tertiary: '#ffffff'
  on-tertiary: '#32302d'
  tertiary-container: '#e7e1dd'
  on-tertiary-container: '#676460'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#e7e1dd'
  tertiary-fixed-dim: '#cbc6c1'
  on-tertiary-fixed: '#1d1b19'
  on-tertiary-fixed-variant: '#494643'
  background: '#141313'
  on-background: '#e5e2e1'
  surface-variant: '#353434'
typography:
  h1:
    fontFamily: Inter
    fontSize: 1.875rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  body:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.5rem
  ui-label:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.05em
  code-block:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.6rem
  code-inline:
    fontFamily: JetBrains Mono
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: 1rem
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  sidebar-width: 280px
  gutter: 1rem
---

## Brand & Style

This design system is engineered for high-performance developer environments where clarity, focus, and content density are paramount. The brand personality is understated and professional, leaning into a "utilitarian-premium" aesthetic. It prioritizes the user's work—code and documentation—by utilizing a monochromatic base that reduces visual noise.

The style is a blend of **Minimalism** and **Modern Corporate** aesthetics. It eschews decorative flourishes in favor of structural precision. Visual interest is generated through perfect alignment, intentional typography, and a "mechanical" feel that resonates with technical users. The emotional response should be one of calm control and reliability.

## Colors

The palette is rooted in the Zinc scale to provide a sophisticated, neutral backdrop that minimizes eye strain during long sessions. 

- **Core Surfaces:** The base background uses Zinc-950/900 for deep contrast. Elevated surfaces like sidebars and cards use Zinc-800 or Zinc-900 with a subtle border.
- **Accents:** Indigo-500/400 is used sparingly for primary actions, focus rings, and active states. This provides a clear "interactive" signal without overwhelming the dark theme.
- **Status:** Standard semantic colors (red for errors, amber for warnings) should be desaturated to match the overall muted profile of the system.

## Typography

The system utilizes **Inter** for all UI elements to ensure maximum legibility at small sizes. For technical content, **JetBrains Mono** provides the necessary rhythmic spacing required for reading complex code.

- **Scale:** The typographic scale is compact. Body text is set at 14px (0.875rem) to allow for high information density.
- **Hierarchy:** Contrast is established through font weight and color (Zinc-50 for headings, Zinc-400 for secondary labels) rather than significant jumps in size.
- **Monospace:** Inline code elements use a subtle background fill (Zinc-800) to distinguish them from standard prose within documentation.

## Layout & Spacing

The layout philosophy follows a **Fixed-Fluid hybrid model**. Sidebars and navigation rails occupy fixed widths to provide a stable anchor for the user, while the main editor or content area is fluid to maximize the workspace.

- **Rhythm:** An 8px grid system governs all spacing.
- **Density:** The design system favors "Compact" padding (8px–12px) for list items and inputs to ensure developers can see as much data as possible without scrolling.
- **Gutters:** 16px (1rem) gutters are used between major layout blocks to provide clear separation without wasting space.

## Elevation & Depth

Depth is communicated through **Tonal Layering** and **Low-Contrast Outlines** rather than traditional shadows. This maintains a flat, modern architectural feel.

- **Level 0 (Background):** Zinc-950/900. The primary canvas.
- **Level 1 (Surfaces):** Zinc-900 with a 1px border of Zinc-800. Used for sidebars and main panels.
- **Level 2 (Modals/Popovers):** Zinc-800 with a 1px border of Zinc-700. These are the only elements allowed to have a very soft, subtle ambient shadow (Black, 25% opacity, 10px blur) to assist with focus.
- **Separators:** Use a 1px solid stroke of Zinc-800 for horizontal or vertical rules.

## Shapes

The design system uses a **Soft (4px)** corner radius for most UI components. This provides a hint of approachability while maintaining a precise, technical look. 

- **Standard Elements:** Buttons, inputs, and checkboxes use a 4px (0.25rem) radius.
- **Large Containers:** Cards or primary content areas use an 8px (0.5rem) radius to define major structural boundaries.
- **Tags/Badges:** May use a fully rounded (pill) shape to differentiate them from interactive buttons.

## Components

### Buttons
- **Primary:** Solid Indigo-600 background with Zinc-50 text. No gradient.
- **Secondary:** Zinc-800 background with a 1px Zinc-700 border.
- **Ghost:** No background or border; appears on hover with Zinc-800 background.

### Input Fields
- **Default State:** Zinc-900 background, 1px Zinc-700 border, Zinc-400 placeholder text.
- **Focus State:** 1px Indigo-500 border with a subtle 2px Indigo-500/20 outer glow (ring).

### Chips & Tags
- Used for metadata or file types. Small text (12px), Zinc-800 background, and 1px Zinc-700 border.

### Navigation Lists
- Active items use a Zinc-800 background and a vertical 2px Indigo-500 indicator on the left edge. Text color shifts from Zinc-400 (inactive) to Zinc-50 (active).

### Code Blocks
- Darker than the main surface (Zinc-950). Syntax highlighting should follow a "Nord" or "GitHub Dark" dimmed palette to remain cohesive with the Zinc base.