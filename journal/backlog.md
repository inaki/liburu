# Backlog

## shadcn/ui checkbox audit

- Investigate shadcn/ui primitives under the current Tailwind setup without preflight.
- The checkbox issue did **not** come from `src/styles.css` global SVG conflicts.
- Audit findings:
  - no global `svg { ... }` selector exists
  - no leftover app-wide checkbox CSS exists, aside from Markdown task-list styling
  - `.icon` global styles only affect elements explicitly using the `.icon` class
  - the shadcn checkbox indicator does not use `.icon`, so those rules should not bleed into it
  - built CSS includes the relevant Tailwind utilities like `text-white`, `appearance-none`, and the checkbox state variants
- Likely root cause:
  - shadcn/ui is being used without Tailwind preflight, so some primitives need explicit reset classes
  - remaining checkbox color oddities may be due to the primitive/icon rendering path in the Tauri webview rather than stylesheet conflicts
- Follow-up:
  - inspect the rendered checkbox in devtools inside the webview
  - verify computed color on:
    - Radix checkbox root
    - indicator
    - inner SVG and path
  - audit other shadcn primitives for preflight-sensitive behavior
