import {validateAndSanitiseSlashedPathOrThrow} from '@unseenco/theatre-shared/utils/slashedPaths'
import type {SheetId} from '@unseenco/theatre-shared/utils/ids'

export type OutlineNamespaceConfig = {
  defaultCollapsed?: boolean
  collapsed?: boolean
}

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
