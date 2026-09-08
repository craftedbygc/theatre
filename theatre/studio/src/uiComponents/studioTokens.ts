/**
 * Shared design tokens for Studio UI.
 * Injected as CSS custom properties on `:host` via css.tsx GlobalStyle.
 * Prefer `var(--studio-*)` in styled-components over hard-coded colors.
 */

import {
  darken,
  desaturate,
  lighten,
  mix,
  parseToRgb,
  saturate,
  transparentize,
} from 'polished'
import userReadableTypeOfValue from '@unseenco/theatre-shared/utils/userReadableTypeOfValue'

export const studioFontUi = `system-ui, -apple-system, 'SF Pro Display', sans-serif`
export const studioFontMono = `ui-monospace, 'SF Mono', Menlo, Consolas, monospace`

/**
 * Default source hex for Studio’s accent (selection, outline, keyframes,
 * playhead, focus-range chrome, etc.). Override at runtime with
 * `studio.initialize({accentHex})`.
 *
 * Historical teal was `#1e5866` (rgb(30, 88, 102)).
 */
export const studioAccentHex = '#617a8d'

const ACCENT_HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

let currentStudioAccentHex = studioAccentHex
let cachedStudioAccent: ReturnType<typeof deriveStudioAccent> | undefined

/** Derive the accent palette from a source hex. */
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
    /** Soft hover (curve handles, snap crosshair) — was `#67dfd8`. */
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

export type StudioAccentPalette = {
  [K in keyof ReturnType<typeof deriveStudioAccent>]: string
}

function getStudioAccentPalette(): StudioAccentPalette {
  if (!cachedStudioAccent) {
    cachedStudioAccent = deriveStudioAccent(currentStudioAccentHex)
  }
  return cachedStudioAccent
}

export function getStudioAccentHex() {
  return currentStudioAccentHex
}

/**
 * Set the source hex used to derive Studio’s accent palette.
 * Called from `studio.initialize({accentHex})`.
 */
export function setStudioAccentHex(hex: unknown) {
  if (typeof hex !== 'string' || !ACCENT_HEX_RE.test(hex)) {
    throw new Error(
      `studio.initialize({accentHex}) must be a CSS hex color such as '#617a8d'. ${userReadableTypeOfValue(
        hex,
      )} given.`,
    )
  }

  try {
    parseToRgb(hex)
  } catch {
    throw new Error(
      `studio.initialize({accentHex}) must be a CSS hex color such as '#617a8d'. ${userReadableTypeOfValue(
        hex,
      )} given.`,
    )
  }

  currentStudioAccentHex = hex
  cachedStudioAccent = undefined
}

/**
 * Live accent palette. Property access always reflects the current
 * {@link getStudioAccentHex} so `studio.initialize({accentHex})` can retheme
 * JS-painted chrome (connectors, static-value indicators, etc.).
 */
export const studioAccent: StudioAccentPalette = {
  get base() {
    return getStudioAccentPalette().base
  },
  get hover() {
    return getStudioAccentPalette().hover
  },
  get active() {
    return getStudioAccentPalette().active
  },
  get muted() {
    return getStudioAccentPalette().muted
  },
  get soft() {
    return getStudioAccentPalette().soft
  },
  get softHover() {
    return getStudioAccentPalette().softHover
  },
  get softDark() {
    return getStudioAccentPalette().softDark
  },
  get secondary() {
    return getStudioAccentPalette().secondary
  },
  get playhead() {
    return getStudioAccentPalette().playhead
  },
  get playheadLine() {
    return getStudioAccentPalette().playheadLine
  },
  get sunblock() {
    return getStudioAccentPalette().sunblock
  },
  get sunblockIdle() {
    return getStudioAccentPalette().sunblockIdle
  },
  get focusOutline() {
    return getStudioAccentPalette().focusOutline
  },
  get staticIndicator() {
    return getStudioAccentPalette().staticIndicator
  },
  get softTint() {
    return getStudioAccentPalette().softTint
  },
  get alpha70() {
    return getStudioAccentPalette().alpha70
  },
  get alpha85() {
    return getStudioAccentPalette().alpha85
  },
  get alpha95() {
    return getStudioAccentPalette().alpha95
  },
}

export function getStudioAccentCss(base: string = getStudioAccentHex()) {
  const a = deriveStudioAccent(base)
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
}

/** CSS custom property declarations for `:host` (string fragment). */
export function getStudioTokenCss() {
  return `
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

  ${getStudioAccentCss()}

  --studio-radius: 4px;
  --studio-radius-sm: 3px;
  --studio-row-height: 36px;
  --studio-row-gap: 3px;
  --studio-panel-pad: 10px 12px;
`
}

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
