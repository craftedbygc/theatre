/*
 * @jest-environment jsdom
 */
import {setupTestSheet} from '@unseenco/theatre-shared/testUtils'
import {privateAPI} from '@unseenco/theatre-core/privateAPIs'

describe('showPropsOf', () => {
  test('sheet.object options seed the template atom', async () => {
    const {sheetPublicAPI} = await setupFromSheet()

    const appearance = sheetPublicAPI.object('Appearance', {opacity: 1})
    const box = sheetPublicAPI.object(
      'Box',
      {x: 0},
      {showPropsOf: [appearance]},
    )

    expect(privateAPI(box).template.showPropsOf).toEqual([
      privateAPI(appearance),
    ])
  })

  test('object.showPropsOf replaces and clears the list', async () => {
    const {sheetPublicAPI} = await setupFromSheet()

    const appearance = sheetPublicAPI.object('Appearance', {opacity: 1})
    const other = sheetPublicAPI.object('Other', {tint: 0})
    const box = sheetPublicAPI.object('Box', {x: 0})

    box.showPropsOf([appearance])
    expect(privateAPI(box).template.showPropsOf).toEqual([
      privateAPI(appearance),
    ])

    box.showPropsOf([appearance, other])
    expect(privateAPI(box).template.showPropsOf).toEqual([
      privateAPI(appearance),
      privateAPI(other),
    ])

    box.showPropsOf([])
    expect(privateAPI(box).template.showPropsOf).toEqual([])
  })

  test('rejects the host object and objects from another sheet', async () => {
    const {sheetPublicAPI, project} = await setupFromSheet()

    const box = sheetPublicAPI.object('Box', {x: 0})
    const otherSheet = project.sheet('Other Sheet')
    const foreign = otherSheet.object('Foreign', {y: 0})

    expect(() => box.showPropsOf([box])).toThrow(/cannot include the host/)
    expect(() => box.showPropsOf([foreign])).toThrow(/same sheet instance/)
  })
})

async function setupFromSheet() {
  const {sheet, project, studio} = await setupTestSheet({
    staticOverrides: {byObject: {}},
    sequence: {
      type: 'PositionalSequence',
      subUnitsPerUnit: 30,
      length: 10,
      tracksByObject: {},
    },
  })

  return {
    sheetPublicAPI: sheet.publicApi,
    project,
    studio,
  }
}
