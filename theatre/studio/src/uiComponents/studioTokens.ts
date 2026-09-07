/**
 * Shared design tokens for Studio UI (Dialkit-inspired).
 * Injected as CSS custom properties on `:host` via css.tsx GlobalStyle.
 * Prefer `var(--studio-*)` in styled-components over hard-coded colors.
 */

import {
  darken,
  desaturate,
  lighten,
  mix,
  saturate,
  transparentize,
} from 'polished'

export const studioFontUi = `system-ui, -apple-system, 'SF Pro Display', sans-serif`
export const studioFontMono = `ui-monospace, 'SF Mono', Menlo, Consolas, monospace`

/**
 * Single source of truth for Studio’s accent (selection, outline, keyframes,
 * playhead, focus-range chrome, etc.). Change this hex to retheme them all.
 *
 * Historical teal was `#1e5866` (rgb(30, 88, 102)). Previewing light green.
 */
export const studioAccentHex = '#6BCF7A'

/** Derive the accent palette from {@link studioAccentHex}. */
export function deriveStudioAccent(base: string = studioAccentHex) {
  return {
    /** Selected buttons / outline items — was `#1e5866`. */
    base,
    /** Selected hover — was `#246a7a`. */
    hover: lighten(0.08, base),
    /** Selected active — was `#2a7a8c`. */
    active: lighten(0.12, base),
    /** Descendant-selected outline — was `#1d353b`. */
    muted: mix(0.4, '#0a0c0d', desaturate(0.2, base)),
    /** Keyframe dots, markers, info badges — was `#40AAA4`. */
    soft: lighten(0.18, saturate(0.12, base)),
    /** Soft hover (curve handles) — was `#67dfd8`. */
    softHover: lighten(0.28, saturate(0.18, base)),
    /** Dope-sheet connector fill — was `#365b59`. */
    softDark: mix(0.25, '#0a0c0d', lighten(0.1, desaturate(0.05, base))),
    /** Aggregate keyframe secondary stroke — was `#45747C`. */
    secondary: lighten(0.1, desaturate(0.08, base)),
    /** Playhead thumb — was `#00e0ff`. */
    playhead: lighten(0.35, saturate(0.4, base)),
    /** Playhead rod — was `#27e0fd`. */
    playheadLine: lighten(0.32, saturate(0.32, base)),
    /** Playhead attached to focus range — was `#005662`. */
    sunblock: darken(0.14, saturate(0.2, base)),
    /** Playhead sunblock idle — was `#1f2b2b`. */
    sunblockIdle: mix(0.55, '#121212', base),
    /** Curve editor focus outline — was `#0A4540`. */
    focusOutline: darken(0.2, saturate(0.15, base)),
    /** Static-value indicator — was `#339cb5`. */
    staticIndicator: lighten(0.2, saturate(0.18, base)),
    /** Diamond when inline editor open — was `#CBEBEA`. */
    softTint: mix(0.78, '#ffffff', lighten(0.12, base)),
    /** Playback control selected opacities — was `rgba(30, 88, 102, …)`. */
    alpha70: transparentize(0.3, base),
    alpha85: transparentize(0.15, base),
    alpha95: transparentize(0.05, base),
  } as const
}

export const studioAccent = deriveStudioAccent()

const accentCss = (() => {
  const a = studioAccent
  return `
  --studio-accent: ${a.base};
  --studio-accent-hover: ${a.hover};
  --studio-accent-active: ${a.active};
  --studio-accent-muted: ${a.muted};
  --studio-accent-soft: ${a.soft};
  --studio-accent-soft-hover: ${a.softHover};
  --studio-accent-soft-dark: ${a.softDark};
  --studio-accent-secondary: ${a.secondary};
  --studio-accent-playhead: ${a.playhead};
  --studio-accent-playhead-line: ${a.playheadLine};
  --studio-accent-sunblock: ${a.sunblock};
  --studio-accent-sunblock-idle: ${a.sunblockIdle};
  --studio-accent-focus-outline: ${a.focusOutline};
  --studio-accent-static: ${a.staticIndicator};
  --studio-accent-soft-tint: ${a.softTint};
  --studio-accent-70: ${a.alpha70};
  --studio-accent-85: ${a.alpha85};
  --studio-accent-95: ${a.alpha95};
`
})()

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

  ${accentCss}

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
  /* Outline keeps hover chrome from eating into the fixed row height. */
  outline: 1px solid transparent;
  outline-offset: -1px;
  transition: background 150ms ease, outline-color 150ms ease;

  &:hover {
    background: var(--studio-surface-hover);
    outline-color: var(--studio-border-hover);
  }
`
