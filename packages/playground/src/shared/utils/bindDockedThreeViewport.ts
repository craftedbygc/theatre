import studio from '@unseenco/theatre-studio'
import type {IDockedViewport} from '@unseenco/theatre-studio'
import type {PerspectiveCamera, WebGLRenderer} from 'three'

type CameraLike = Pick<PerspectiveCamera, 'aspect' | 'updateProjectionMatrix'>

type CanvasLayoutMode = 'docked' | 'fullWindow'

export function bindDockedThreeViewport(opts: {
  canvas: HTMLElement
  renderer: WebGLRenderer
  cameras: CameraLike | CameraLike[]
}): () => void {
  const {canvas, renderer} = opts
  const cameras = Array.isArray(opts.cameras) ? opts.cameras : [opts.cameras]

  let lastWidth = 0
  let lastHeight = 0
  let layoutMode: CanvasLayoutMode | null = null

  const applySize = (width: number, height: number) => {
    if (width <= 0 || height <= 0) return
    if (width === lastWidth && height === lastHeight) return
    lastWidth = width
    lastHeight = height
    renderer.setSize(width, height, false)
    for (const camera of cameras) {
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
  }

  const setCanvasLayout = (mode: CanvasLayoutMode) => {
    if (layoutMode === mode) return
    layoutMode = mode

    if (mode === 'docked') {
      Object.assign(canvas.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        display: 'block',
      })
      return
    }

    Object.assign(canvas.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      display: 'block',
    })
  }

  const applyViewport = ({width, height}: IDockedViewport) => {
    setCanvasLayout('docked')
    applySize(width, height)
  }

  const applyFullWindow = () => {
    setCanvasLayout('fullWindow')
    applySize(window.innerWidth, window.innerHeight)
  }

  const unsubResize = studio.ui.onDockedResize((viewport) => {
    if (viewport === null) {
      applyFullWindow()
    } else {
      applyViewport(viewport)
    }
  })
  const unsubToggle = studio.ui.onDockedToggle((docked) => {
    if (!docked) {
      applyFullWindow()
    }
  })

  const onWindowResize = () => {
    if (studio.ui.isDocked && studio.ui.dockedViewport !== null) return
    applyFullWindow()
  }

  window.addEventListener('resize', onWindowResize)

  return () => {
    unsubResize()
    unsubToggle()
    window.removeEventListener('resize', onWindowResize)
  }
}
