# Tailwind Migration Plan

## Goal

Migrate the app toward Tailwind + shadcn/ui incrementally while preserving the current visual identity:

- light-first zinc-like workspace shell
- indigo accent
- compact desktop information density
- custom Markdown reading surface
- custom layout atmosphere and panel language

This is **not** a redesign plan. It is an implementation migration plan.

## Current state

- Tailwind is installed and working.
- shadcn-style local primitives already exist in `src/components/ui`.
- The app still relies heavily on `src/styles.css`.
- The visual system is already defined with CSS variables in `:root`.
- Tailwind is being used **without preflight**, which means some shadcn/Radix primitives need explicit reset classes.

## Migration principles

1. Preserve the existing design tokens.
2. Migrate surface-by-surface, not file-by-file.
3. Do not rewrite all app styles at once.
4. Keep Markdown content styling mostly custom.
5. Treat `src/components/ui` as the compatibility layer between shadcn patterns and this app's token system.

## Phase 1: Stabilize tokens

Objective:
- keep the current app look while making Tailwind/shadcn usage predictable

Tasks:
- continue using the existing CSS variables in `:root` as the source of truth
- avoid swapping to stock shadcn palette defaults
- ensure every shared primitive references app tokens like:
  - `--indigo`
  - `--text`
  - `--text-muted`
  - `--outline`
  - `--surface-low`
  - `--surface-lowest`
- document the no-preflight constraint for future primitive work

Expected result:
- Tailwind utilities and shadcn components render using the app’s existing visual language

## Phase 2: Harden the shared primitive layer

Objective:
- make `src/components/ui` safe to reuse across the app before migrating larger surfaces

Tasks:
- audit and standardize:
  - `button`
  - `checkbox`
  - `dialog`
  - `input`
  - `textarea`
  - `select`
  - `scroll-area`
  - `tooltip`
- add missing base primitives:
  - `label`
  - `switch`
  - `separator`
- ensure button-based primitives include reset-conscious classes because Tailwind preflight is not active
- keep primitives local and token-aware rather than copying stock shadcn styling blindly

Expected result:
- overlays and settings-style controls can migrate safely without visual drift

## Phase 3: Migrate overlays

Objective:
- move the most self-contained UI surfaces first

Targets:
- settings dialog
- note dialog
- clone repository dialog
- any remaining confirmation overlays

Why:
- low layout risk
- easy before/after comparison
- fast consistency gains

## Phase 4: Migrate form controls and small reusable blocks

Objective:
- stop relying on native/random control styling

Targets:
- search inputs
- selects
- toggles
- toolbar item selectors
- brand logo picker
- compact action groups

## Phase 5: Extract app shell components

Objective:
- reduce `App.tsx` and migrate major layout blocks intentionally

Recommended extractions:
- `Rail`
- `SecondarySidebar`
- `Topbar`
- `PreviewToolbar`
- `DocumentPanel`
- `SettingsDialog`
- `SpaceExplorer`
- `WorkspaceHome`
- `WorkspaceSearch`

## Phase 6: Migrate major surfaces

Recommended order:
1. Settings dialog
2. Note and clone dialogs
3. Topbar
4. Preview toolbar
5. Rail
6. Secondary sidebar
7. Workspace home
8. Workspace search
9. Metadata / TOC document side panel

## Phase 7: Reduce global CSS

Keep in `src/styles.css`:
- root theme variables
- app background patterns
- Markdown content styles
- a few truly global compatibility rules

Move out of `src/styles.css`:
- component styling
- layout block styling
- button/input/select styles
- dialog internals

## Risks

- no-preflight means some stock shadcn examples need adaptation
- one large stylesheet makes it easy to leave dead CSS behind
- `App.tsx` is still large, so style migration and component extraction should happen together

## Immediate work for this repo

### Phase 1
- preserve the existing token system
- do not replace the current CSS variable palette

### Phase 2
- finish the shared primitive layer
- keep shadcn/Radix behavior robust in the current environment

### Then
- migrate the note dialog and clone dialog next

## Success criteria

- the app still looks like the same product
- `src/components/ui` becomes the default place for control behavior
- `src/styles.css` starts shrinking over time
- larger surfaces can migrate without unplanned redesign side effects
