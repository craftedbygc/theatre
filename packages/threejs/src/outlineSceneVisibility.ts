import type {ISheet, ISheetObject} from '@unseenco/theatre-core'
import type {Object3D, Scene} from 'three'
import {
  getSheetObjectForObject3D,
  onObjectRegistryChange,
} from './objectRegistry'
import type {StudioLike} from './persistence'

function collectSheetsInScene(scene: Scene): Map<string, ISheet> {
  const sheets = new Map<string, ISheet>()
  scene.traverse((object: Object3D) => {
    const sheetObject = getSheetObjectForObject3D(object)
    if (sheetObject) {
      const sheet = sheetObject.sheet
      sheets.set(sheetKey(sheet), sheet)
    }
  })
  return sheets
}

function sheetKey(sheet: ISheet): string {
  const {projectId, sheetId} = sheet.address
  return `${projectId}:${sheetId}`
}

function isSheet(item: ISheetObject | ISheet): item is ISheet {
  return item.type === 'Theatre_Sheet_PublicAPI'
}

/**
 * When multiple Three.js scenes are registered, hide Theatre sheets whose
 * auto-added objects live only in inactive scenes from the Studio outline.
 */
export function setupOutlineSceneVisibility(options: {
  studio: StudioLike
  getScenes: () => Scene[]
  getActiveScene: () => Scene
}): {refresh: () => void; dispose: () => void} {
  const {studio, getScenes, getActiveScene} = options
  const managedSheets = new Map<string, ISheet>()
  const lastVisibility = new Map<string, boolean>()

  const setSheetVisible = (sheet: ISheet, visible: boolean) => {
    const key = sheetKey(sheet)
    if (lastVisibility.get(key) === visible) return
    lastVisibility.set(key, visible)
    sheet.project.sheet(sheet.address.sheetId, sheet.address.sheetInstanceId, {
      visible,
    })
  }

  const refresh = () => {
    const scenes = getScenes()
    if (scenes.length <= 1) return

    const activeScene = getActiveScene()
    const sheetsByScene = scenes.map((scene) => collectSheetsInScene(scene))
    const allManagedSheets = new Map<string, ISheet>()

    for (const sheets of sheetsByScene) {
      for (const [key, sheet] of sheets) {
        allManagedSheets.set(key, sheet)
      }
    }

    const activeIndex = scenes.indexOf(activeScene)
    const activeSheets =
      activeIndex >= 0 ? sheetsByScene[activeIndex] : new Map<string, ISheet>()

    for (const [key, sheet] of allManagedSheets) {
      setSheetVisible(sheet, activeSheets.has(key))
      managedSheets.set(key, sheet)
    }

    // Drop sheets that are no longer present in any scene graph.
    for (const key of [...managedSheets.keys()]) {
      if (!allManagedSheets.has(key)) {
        const sheet = managedSheets.get(key)
        if (sheet) setSheetVisible(sheet, true)
        managedSheets.delete(key)
        lastVisibility.delete(key)
      }
    }

    const nextSelection = studio.selection.filter((item) => {
      const sheet = isSheet(item) ? item : item.sheet
      const key = sheetKey(sheet)
      // Leave sheets we don't manage (no registered 3D objects) alone.
      if (!allManagedSheets.has(key)) return true
      return activeSheets.has(key)
    })

    if (nextSelection.length !== studio.selection.length) {
      if (nextSelection.length > 0) {
        studio.setSelection(nextSelection)
      } else {
        const fallback = activeSheets.values().next().value as
          | ISheet
          | undefined
        studio.setSelection(fallback ? [fallback] : [])
      }
    }
  }

  const unsubscribeRegistry = onObjectRegistryChange(refresh)
  refresh()

  return {
    refresh,
    dispose() {
      unsubscribeRegistry()
      for (const sheet of managedSheets.values()) {
        setSheetVisible(sheet, true)
      }
      managedSheets.clear()
      lastVisibility.clear()
    },
  }
}
