import {
  ensureNamespacePath,
  formatOutlineNamespacePathKey,
  getOutlineNamespaceItemKey,
  parseOutlineNamespacePath,
  shouldShowSequenceVariantsInOutline,
  STUDIO_PROJECT_ID,
} from './outlinePanelUtils'
import type {NamespacedObjects} from './outlinePanelUtils'
import type {SheetId} from '@unseenco/theatre-shared/utils/ids'

describe('outlinePanelUtils', () => {
  test('parseOutlineNamespacePath normalizes slashes', () => {
    expect(parseOutlineNamespacePath('Folder/Subfolder', 'test')).toEqual([
      'Folder',
      'Subfolder',
    ])
    expect(parseOutlineNamespacePath('Folder / Subfolder', 'test')).toEqual([
      'Folder',
      'Subfolder',
    ])
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

  test('shouldShowSequenceVariantsInOutline hides variants for Studio project sheets', () => {
    const studioSheet = {
      address: {projectId: STUDIO_PROJECT_ID, sheetId: 'Extension: foo'},
    } as Parameters<typeof shouldShowSequenceVariantsInOutline>[0]
    const mainSheet = {
      address: {projectId: 'My Project', sheetId: 'Scene'},
    } as Parameters<typeof shouldShowSequenceVariantsInOutline>[0]

    expect(shouldShowSequenceVariantsInOutline(studioSheet)).toBe(false)
    expect(shouldShowSequenceVariantsInOutline(mainSheet)).toBe(true)
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
