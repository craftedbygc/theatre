import {
  ensureNamespacePath,
  formatOutlineNamespacePathKey,
  getOutlineNamespaceItemKey,
  parseOutlineNamespacePath,
  type NamespacedObjects,
} from './outlinePanelUtils'
import type {SheetId} from '@theatre/shared/utils/ids'

describe('outlinePanelUtils', () => {
  test('parseOutlineNamespacePath normalizes slashes', () => {
    expect(
      parseOutlineNamespacePath('Folder/Subfolder', 'test'),
    ).toEqual(['Folder', 'Subfolder'])
    expect(
      parseOutlineNamespacePath('Folder / Subfolder', 'test'),
    ).toEqual(['Folder', 'Subfolder'])
  })

  test('formatOutlineNamespacePathKey uses Theatre path format', () => {
    expect(formatOutlineNamespacePathKey(['Folder', 'Subfolder'])).toBe(
      'Folder / Subfolder',
    )
  })

  test('getOutlineNamespaceItemKey matches outline collapse keys', () => {
    expect(
      getOutlineNamespaceItemKey('Main Sheet' as SheetId, [
        'Folder',
        'Subfolder',
      ]),
    ).toBe('namespace:Main Sheet:Folder/Subfolder')
  })

  test('ensureNamespacePath creates empty declared folders', () => {
    const root: NamespacedObjects = new Map()

    ensureNamespacePath(root, ['Props'])

    expect(root.has('Props')).toBe(true)
    expect(root.get('Props')?.nested).toEqual(new Map())
    expect(root.get('Props')?.object).toBeUndefined()
  })

  test('ensureNamespacePath creates nested declared folders', () => {
    const root: NamespacedObjects = new Map()

    ensureNamespacePath(root, ['Props', 'Furniture'])

    expect(root.has('Props')).toBe(true)
    expect(root.get('Props')?.nested?.has('Furniture')).toBe(true)
    expect(root.get('Props')?.nested?.get('Furniture')?.nested).toEqual(
      new Map(),
    )
  })
})
