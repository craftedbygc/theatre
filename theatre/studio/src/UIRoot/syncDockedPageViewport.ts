export type DockedPageViewportRect = {
  top: number
  left: number
  width: number
  height: number
}

const STYLE_ID = 'theatrejs-docked-viewport'
const HTML_CLASS = 'theatrejs-docked-mode'

const STYLE_CONTENT = `
html.${HTML_CLASS} {
  --theatre-dock-top: 0px;
  --theatre-dock-left: 0px;
  --theatre-dock-width: 0px;
  --theatre-dock-height: 0px;
}

html.${HTML_CLASS} body {
  position: fixed !important;
  top: var(--theatre-dock-top) !important;
  left: var(--theatre-dock-left) !important;
  width: var(--theatre-dock-width) !important;
  height: var(--theatre-dock-height) !important;
  right: auto !important;
  bottom: auto !important;
}
`

function ensureStyleElement(): HTMLStyleElement {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ID
    el.textContent = STYLE_CONTENT
    document.head.appendChild(el)
  }
  return el
}

export function applyDockedPageViewport(rect: DockedPageViewportRect) {
  ensureStyleElement()
  document.documentElement.classList.add(HTML_CLASS)
  document.documentElement.style.setProperty(
    '--theatre-dock-top',
    `${rect.top}px`,
  )
  document.documentElement.style.setProperty(
    '--theatre-dock-left',
    `${rect.left}px`,
  )
  document.documentElement.style.setProperty(
    '--theatre-dock-width',
    `${rect.width}px`,
  )
  document.documentElement.style.setProperty(
    '--theatre-dock-height',
    `${rect.height}px`,
  )
}

export function clearDockedPageViewport() {
  document.documentElement.classList.remove(HTML_CLASS)
  document.documentElement.style.removeProperty('--theatre-dock-top')
  document.documentElement.style.removeProperty('--theatre-dock-left')
  document.documentElement.style.removeProperty('--theatre-dock-width')
  document.documentElement.style.removeProperty('--theatre-dock-height')

  const el = document.getElementById(STYLE_ID)
  if (el) {
    el.remove()
  }
}
