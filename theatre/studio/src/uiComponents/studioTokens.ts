/**
 * Shared design tokens for Studio UI (Dialkit-inspired).
 * Injected as CSS custom properties on `:host` via css.tsx GlobalStyle.
 * Prefer `var(--studio-*)` in styled-components over hard-coded colors.
 */

export const studioFontUi = `system-ui, -apple-system, 'SF Pro Display', sans-serif`
export const studioFontMono = `ui-monospace, 'SF Mono', Menlo, Consolas, monospace`

/** CSS custom property declarations for `:host` (string fragment). */
export const studioTokenCss = `
  --studio-font-ui: ${studioFontUi};
  --studio-font-mono: ${studioFontMono};

  --studio-surface: rgba(255, 255, 255, 0.08);
  --studio-surface-hover: rgba(255, 255, 255, 0.11);
  --studio-surface-active: rgba(255, 255, 255, 0.16);
  --studio-surface-subtle: rgba(255, 255, 255, 0.06);
  --studio-surface-fill: rgba(255, 255, 255, 0.22);

  --studio-text-root: rgba(255, 255, 255, 0.95);
  --studio-text-section: rgba(255, 255, 255, 0.88);
  --studio-text-label: rgba(255, 255, 255, 0.62);
  --studio-text-value: rgba(255, 255, 255, 0.92);
  --studio-text-muted: rgba(255, 255, 255, 0.45);
  --studio-text-focus: rgba(255, 255, 255, 0.98);

  --studio-border: rgba(255, 255, 255, 0.08);
  --studio-border-hover: rgba(255, 255, 255, 0.14);
  --studio-focus-ring: rgba(255, 255, 255, 0.55);

  --studio-dropdown-bg: #2a2a2a;
  --studio-glass-bg: rgba(33, 33, 33, 0.92);
  --studio-shadow-dropdown: 0 8px 24px rgba(0, 0, 0, 0.45);

  --studio-radius: 8px;
  --studio-radius-sm: 6px;
  --studio-row-height: 36px;
  --studio-row-gap: 6px;
  --studio-panel-pad: 10px 12px;
`

/** Shared chip / control surface for styled-components */
export const studioChipSurfaceCss = `
  background: var(--studio-surface);
  border-radius: var(--studio-radius);
  box-shadow: inset 0 0 0 1px var(--studio-border);
  transition: background 150ms ease, box-shadow 150ms ease;

  &:hover {
    background: var(--studio-surface-hover);
    box-shadow: inset 0 0 0 1px var(--studio-border-hover);
  }
`
