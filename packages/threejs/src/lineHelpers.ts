import {
  BufferGeometry,
  CatmullRomCurve3,
  Line,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
} from 'three'
import type {Object3D, Scene} from 'three'
import {EXTENSION_ID} from './constants'

const DEVTOOLS_LINE_FLAG = `${EXTENSION_ID}:lineHelper`
const CURVE_SAMPLE_COUNT = 64
const HELPER_LINE_COLOR = 0x44ddff

type LineSource =
  | {type: 'curve'; curve: CatmullRomCurve3; object: Object3D}
  | {type: 'line'; line: Line | LineSegments | LineLoop}

type HelperEntry = {
  source: LineSource
  helper: Line | LineSegments | LineLoop
}

function isDevtoolsLine(object: Object3D): boolean {
  return object.userData[DEVTOOLS_LINE_FLAG] === true
}

function collectCatmullRomCurves(
  object: Object3D,
  sources: LineSource[],
): void {
  for (const value of Object.values(object.userData)) {
    if (value instanceof CatmullRomCurve3) {
      sources.push({type: 'curve', curve: value, object})
    }
  }
}

function collectLineSources(scene: Scene): LineSource[] {
  const sources: LineSource[] = []

  scene.traverse((object) => {
    if (isDevtoolsLine(object)) return
    if (object.type === 'CameraHelper') return

    if (
      object instanceof Line ||
      object instanceof LineSegments ||
      object instanceof LineLoop
    ) {
      sources.push({type: 'line', line: object})
      return
    }

    collectCatmullRomCurves(object, sources)
  })

  return sources
}

function createHelperMaterial(): LineBasicMaterial {
  return new LineBasicMaterial({color: HELPER_LINE_COLOR, toneMapped: false})
}

function createHelperFromCurve(
  curve: CatmullRomCurve3,
  parent: Object3D,
): Line {
  const geometry = new BufferGeometry().setFromPoints(
    curve.getPoints(CURVE_SAMPLE_COUNT),
  )
  const helper = new Line(geometry, createHelperMaterial())
  helper.userData[DEVTOOLS_LINE_FLAG] = true
  helper.visible = false
  parent.add(helper)
  return helper
}

function createHelperFromLine(
  source: Line | LineSegments | LineLoop,
  scene: Scene,
): Line | LineSegments | LineLoop {
  const geometry = source.geometry.clone()
  const HelperLineClass =
    source instanceof LineLoop
      ? LineLoop
      : source instanceof LineSegments
      ? LineSegments
      : Line
  const helper = new HelperLineClass(geometry, createHelperMaterial())
  helper.userData[DEVTOOLS_LINE_FLAG] = true
  helper.visible = false

  const parent = source.parent ?? scene
  parent.add(helper)
  helper.position.copy(source.position)
  helper.quaternion.copy(source.quaternion)
  helper.scale.copy(source.scale)

  return helper
}

function disposeHelper(helper: Line | LineSegments | LineLoop): void {
  helper.parent?.remove(helper)
  helper.geometry.dispose()
  if (Array.isArray(helper.material)) {
    for (const material of helper.material) {
      material.dispose()
    }
  } else {
    helper.material.dispose()
  }
}

export class SceneLineHelperManager {
  private entries: HelperEntry[] = []

  constructor(private readonly scene: Scene) {}

  rebuild(): void {
    this.disposeHelpers()
    const sources = collectLineSources(this.scene)

    this.entries = sources.map((source) => {
      if (source.type === 'curve') {
        return {
          source,
          helper: createHelperFromCurve(source.curve, source.object),
        }
      }

      return {
        source,
        helper: createHelperFromLine(source.line, this.scene),
      }
    })
  }

  setVisible(visible: boolean): void {
    for (const {helper} of this.entries) {
      helper.visible = visible
    }
  }

  dispose(): void {
    this.disposeHelpers()
  }

  private disposeHelpers(): void {
    for (const {helper} of this.entries) {
      disposeHelper(helper)
    }
    this.entries = []
  }
}
