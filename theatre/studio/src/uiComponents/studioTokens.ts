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

  --studio-panel-bg: #282b2f;

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
  --studio-popover-bg: #282b2f;
  /* Opaque chip fill ≈ panel-bg + --studio-surface (8% white) */
  --studio-chip-bg: #393c40;
  --studio-chip-bg-hover: #3e4248;

  --studio-radius: 4px;
  --studio-radius-sm: 3px;
  --studio-row-height: 36px;
  --studio-row-gap: 3px;
  --studio-panel-pad: 10px 12px;
`

/** Shared chip / control surface for styled-components */
export const studioChipSurfaceCss = `
  background: var(--studio-surface);
  border-radius: var(--studio-radius);
  border: 1px solid transparent;
  transition: background 150ms ease, border-color 150ms ease;

  &:hover {
    background: var(--studio-surface-hover);
    border-color: var(--studio-border-hover);
  }
`
