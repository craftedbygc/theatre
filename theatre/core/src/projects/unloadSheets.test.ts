/*
 * @jest-environment jsdom
 */
import {setupTestSheet} from '@unseenco/theatre-shared/testUtils'
import {getProject} from '@unseenco/theatre-core'
import {getCoreTicker} from '@unseenco/theatre-core/coreTicker'
import * as t from '@unseenco/theatre-core/propTypes'
import type {ObjectAddressKey} from '@unseenco/theatre-shared/utils/ids'
import globals from '@unseenco/theatre-shared/globals'
import type {ProjectState_Historic} from '@unseenco/theatre-core/projects/store/storeTypes'

let projectN = 0

async function setupProjectWithTwoSheets() {
  const projectState: ProjectState_Historic = {
    definitionVersion: globals.currentProjectStateDefinitionVersion,
    sheetsById: {},
    revisionHistory: [],
  }
  const project = getProject('Unload Test ' + projectN++, {
    state: projectState,
  })
  const ticker = getCoreTicker()
  ticker.tick()
  await project.ready

  const sheetA = project.sheet('Sheet A')
  const sheetB = project.sheet('Sheet B')
  const objA = sheetA.object('obj A', {x: 0})
  const objB = sheetB.object('obj B', {y: 0})

  return {project, sheetA, sheetB, objA, objB, ticker}
}

describe('list and unload sheets/objects', () => {
  test('getSheets and getObjects list currently loaded instances', async () => {
    const {project, sheetA, sheetB, objA} = await setupProjectWithTwoSheets()

    const sheets = project.getSheets()
    expect(sheets).toHaveLength(2)
    expect(sheets.map((s) => s.address.sheetId).sort()).toEqual([
      'Sheet A',
      'Sheet B',
    ])

    const objects = sheetA.getObjects()
    expect(objects).toHaveLength(1)
    expect(objects[0]).toBe(objA)

    sheetA.object('obj A2', {z: 0})
    expect(sheetA.getObjects()).toHaveLength(2)

    expect(sheetB.getObjects()).toHaveLength(1)
  })

  test('detachObject removes from getObjects but keeps state on recreate', async () => {
    const {studio, objPublicAPI, sheetPublicAPI, project} =
      await setupFromTestSheet()

    studio.transaction(({set}) => {
      set(objPublicAPI.props.position.x, 42)
    })
    expect(objPublicAPI.value.position.x).toBe(42)

    expect(sheetPublicAPI.getObjects()).toHaveLength(1)
    sheetPublicAPI.detachObject('obj')
    expect(sheetPublicAPI.getObjects()).toHaveLength(0)
    expect(project.getSheets()).toHaveLength(1)

    const recreated = sheetPublicAPI.object('obj', {
      position: {x: 0, y: 0, z: 0},
      color: t.rgba(),
      deeply: {nested: {checkbox: true}},
    })
    expect(recreated.value.position.x).toBe(42)
    expect(sheetPublicAPI.getObjects()).toHaveLength(1)
  })

  test('sheet.unload detaches objects and removes sheet from getSheets', async () => {
    const {project, sheetA, sheetB} = await setupProjectWithTwoSheets()

    sheetA.unload()
    expect(project.getSheets()).toHaveLength(1)
    expect(project.getSheets()[0]).toBe(sheetB)
    expect(sheetA.getObjects()).toHaveLength(0)
  })

  test('project.unloadSheet unloads a specific sheet; unloadSheets clears all', async () => {
    const {project, sheetA, sheetB} = await setupProjectWithTwoSheets()

    project.unloadSheet('Sheet A')
    expect(project.getSheets()).toHaveLength(1)
    expect(project.getSheets()[0]!.address.sheetId).toBe('Sheet B')

    // sheetA public API still works for getObjects (empty); recreating via project.sheet works
    const recreatedA = project.sheet('Sheet A')
    expect(project.getSheets()).toHaveLength(2)
    expect(recreatedA).not.toBe(sheetA)

    project.unloadSheets()
    expect(project.getSheets()).toHaveLength(0)
    // sheetB was unloaded too
    expect(sheetB.getObjects()).toHaveLength(0)
  })

  test('unload preserves static overrides after recreate', async () => {
    const {studio, objPublicAPI, sheetPublicAPI, project} =
      await setupFromTestSheet()

    studio.transaction(({set}) => {
      set(objPublicAPI.props.position.x, 99)
      set(objPublicAPI.props.position.y, 7)
    })

    project.unloadSheet('Sheet')
    expect(project.getSheets()).toHaveLength(0)

    const sheet = project.sheet('Sheet')
    const obj = sheet.object('obj', {
      position: {x: 0, y: 0, z: 0},
      color: t.rgba(),
      deeply: {nested: {checkbox: true}},
    })

    expect(obj.value.position.x).toBe(99)
    expect(obj.value.position.y).toBe(7)
    expect(sheet.getObjects()).toHaveLength(1)
    expect(sheetPublicAPI.getObjects()).toHaveLength(0)
  })

  test('unloadSheet with instanceId only unloads that instance', async () => {
    const projectState: ProjectState_Historic = {
      definitionVersion: globals.currentProjectStateDefinitionVersion,
      sheetsById: {},
      revisionHistory: [],
    }
    const project = getProject('Unload Instance Test ' + projectN++, {
      state: projectState,
    })
    getCoreTicker().tick()
    await project.ready

    const a = project.sheet('Scene', 'one')
    const b = project.sheet('Scene', 'two')
    a.object('obj', {x: 0})
    b.object('obj', {x: 0})

    expect(project.getSheets()).toHaveLength(2)

    project.unloadSheet('Scene', 'one')
    const remaining = project.getSheets()
    expect(remaining).toHaveLength(1)
    expect(remaining[0]!.address.sheetInstanceId).toBe('two')
    expect(remaining[0]).toBe(b)
  })

  test('project.unloadSheet warns when sheet is not loaded', async () => {
    const {project} = await setupProjectWithTwoSheets()
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    project.unloadSheet('Missing Sheet')
    expect(warn).toHaveBeenCalled()
    expect(project.getSheets()).toHaveLength(2)

    warn.mockRestore()
  })
})

async function setupFromTestSheet() {
  const result = await setupTestSheet({
    staticOverrides: {
      byObject: {
        ['obj' as ObjectAddressKey]: {},
      },
    },
  })
  return {
    ...result,
    sheetPublicAPI: result.sheet.publicApi,
    project: result.project,
  }
}
