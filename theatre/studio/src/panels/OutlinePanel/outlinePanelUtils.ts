import type Project from '@theatre/core/projects/Project'
import {useCallback} from 'react'
import getStudio from '@theatre/studio/getStudio'
import {useVal} from '@theatre/react'
import type Sheet from '@theatre/core/sheets/Sheet'
import type SheetObject from '@theatre/core/sheetObjects/SheetObject'
import {validateAndSanitiseSlashedPathOrThrow} from '@theatre/shared/utils/slashedPaths'
import type {SheetId} from '@theatre/shared/utils/ids'

export type NamespacedObjects = Map<
  string,
  {
    object?: SheetObject
    nested?: NamespacedObjects
    path: string[]
  }
>

export function formatOutlineNamespacePathKey(pathSegments: string[]): string {
  return pathSegments.join(' / ')
}

export function parseOutlineNamespacePath(
  namespacePath: string,
  fnName: string,
): string[] {
  return validateAndSanitiseSlashedPathOrThrow(namespacePath, fnName).split(
    /\s*\/\s*/g,
  )
}

export function getOutlineNamespaceItemKey(
  sheetId: SheetId,
  pathSegments: string[],
): string {
  return `namespace:${sheetId}:${pathSegments.join('/')}`
}

export function useCollapseStateInOutlinePanel(
  item: Project | Sheet | {type: 'namespace'; sheet: Sheet; path: string[]},
): {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
} {
  const itemKey =
    item.type === 'namespace'
      ? getOutlineNamespaceItemKey(item.sheet.address.sheetId, item.path)
      : item.type === 'Theatre_Project'
      ? 'project'
      : item.type === 'Theatre_Sheet'
      ? `sheetInstance:${item.address.sheetId}:${item.address.sheetInstanceId}`
      : 'unknown'

  const projectId =
    item.type === 'namespace'
      ? item.sheet.address.projectId
      : item.address.projectId

  const explicitCollapsed = useVal(
    getStudio().atomP.ahistoric.projects.stateByProjectId[projectId]
      .collapsedItemsInOutline[itemKey],
  )

  const defaultCollapsed =
    item.type === 'namespace'
      ? useVal(
          getStudio().atomP.ahistoric.projects.stateByProjectId[projectId]
            .declaredOutlineNamespaces[item.sheet.address.sheetId][
            formatOutlineNamespacePathKey(item.path)
          ].defaultCollapsed,
        ) ?? false
      : false

  const isCollapsed = explicitCollapsed ?? defaultCollapsed

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
