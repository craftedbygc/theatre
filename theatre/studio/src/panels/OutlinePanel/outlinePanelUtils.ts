import type Project from '@unseenco/theatre-core/projects/Project'
import {useCallback} from 'react'
import getStudio from '@unseenco/theatre-studio/getStudio'
import {useVal} from '@unseenco/theatre-react'
import {val} from '@unseenco/theatre-dataverse'
import type Sheet from '@unseenco/theatre-core/sheets/Sheet'
import type {ProjectId} from '@unseenco/theatre-shared/utils/ids'
import type SheetObject from '@unseenco/theatre-core/sheetObjects/SheetObject'
import type {SequenceVariantId} from '@unseenco/theatre-core/sequences/sequenceVariants'
import {
  formatOutlineNamespacePathKey,
  getOutlineNamespaceItemKey,
} from '@unseenco/theatre-shared/utils/outlineNamespaces'

export type NamespacedObjects = Map<
  string,
  {
    object?: SheetObject
    nested?: NamespacedObjects
    path: string[]
  }
>

export {
  formatOutlineNamespacePathKey,
  getOutlineNamespaceItemKey,
  parseOutlineNamespacePath,
} from '@unseenco/theatre-shared/utils/outlineNamespaces'

/** Internal project used by Studio extensions via `studio.getStudioProject()`. */
export const STUDIO_PROJECT_ID = 'Studio' as ProjectId

export function shouldShowSequenceVariantsInOutline(sheet: Sheet): boolean {
  return sheet.address.projectId !== STUDIO_PROJECT_ID
}

export function isSheetVisibleInOutline(sheet: Sheet): boolean {
  // Read via pointer so outline UI re-renders when visibility changes.
  return val(sheet.template.visibleInOutlineP)
}

export function isSheetObjectVisibleInOutline(object: SheetObject): boolean {
  return object.template.isVisibleInOutline()
}

export function useCollapseStateInOutlinePanel(
  item:
    | Project
    | Sheet
    | {
        type: 'namespace'
        sheet: Sheet
        path: string[]
      }
    | {
        type: 'variant'
        sheet: Sheet
        variant: SequenceVariantId
      },
): {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
} {
  const itemKey =
    item.type === 'namespace'
      ? getOutlineNamespaceItemKey(item.sheet.address.sheetId, item.path)
      : item.type === 'variant'
      ? `variant:${item.sheet.address.sheetId}:${item.variant}`
      : item.type === 'Theatre_Project'
      ? 'project'
      : item.type === 'Theatre_Sheet'
      ? `sheet:${item.address.sheetId}`
      : 'unknown'

  const projectId =
    item.type === 'namespace' || item.type === 'variant'
      ? item.sheet.address.projectId
      : item.address.projectId

  const explicitCollapsed = useVal(
    getStudio().atomP.ahistoric.projects.stateByProjectId[projectId]
      .collapsedItemsInOutline[itemKey],
  )

  const outlineNamespaceConfig =
    item.type === 'namespace'
      ? useVal(
          getStudio().atomP.ahistoric.coreByProject[projectId].sheetsById[
            item.sheet.address.sheetId
          ].outlineNamespaces[formatOutlineNamespacePathKey(item.path)],
        )
      : undefined

  const isCollapsed =
    explicitCollapsed ??
    outlineNamespaceConfig?.collapsed ??
    outlineNamespaceConfig?.defaultCollapsed ??
    false

  const setCollapsed = useCallback(
    (isCollapsed: boolean) => {
      getStudio().transaction(({stateEditors}) => {
        stateEditors.studio.ahistoric.projects.stateByProjectId.collapsedItemsInOutline.set(
          {projectId, isCollapsed, itemKey: itemKey},
        )
      })
    },
    [itemKey, projectId],
  )

  return {collapsed: isCollapsed, setCollapsed}
}

export function ensureNamespacePath(
  mutObjects: NamespacedObjects,
  path: string[],
): void {
  const [next, ...rest] = path
  let existing = mutObjects.get(next)
  if (!existing) {
    existing = {
      nested: undefined,
      object: undefined,
      path: [...path],
    }
    mutObjects.set(next, existing)
  }

  if (rest.length === 0) {
    if (!existing.nested) {
      existing.nested = new Map()
    }
    return
  }

  if (!existing.nested) {
    existing.nested = new Map()
  }

  ensureNamespacePath(existing.nested, rest)
}
