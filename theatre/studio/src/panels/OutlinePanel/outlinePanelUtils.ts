import type Project from '@theatre/core/projects/Project'
import {useCallback} from 'react'
import getStudio from '@theatre/studio/getStudio'
import {useVal} from '@theatre/react'
import type Sheet from '@theatre/core/sheets/Sheet'
import type SheetObject from '@theatre/core/sheetObjects/SheetObject'
import type {SequenceVariantId} from '@theatre/core/sequences/sequenceVariants'
import {
  formatOutlineNamespacePathKey,
  getOutlineNamespaceItemKey,
} from '@theatre/shared/utils/outlineNamespaces'

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
} from '@theatre/shared/utils/outlineNamespaces'

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
