/*
 * @jest-environment jsdom
 */
import {BoxGeometry, Mesh, MeshPhongMaterial} from 'three'
import {autoAddMaterial, autoAddObject} from './index'
import {setupTestSheet} from '@unseenco/theatre-shared/testUtils'

async function setupSheet() {
  const {sheet} = await setupTestSheet({
    staticOverrides: {byObject: {}},
    sequence: {
      type: 'PositionalSequence',
      subUnitsPerUnit: 30,
      length: 10,
      tracksByObject: {},
    },
  })
  return sheet.publicApi
}

describe('autoAddObject shared material split', () => {
  test('second mesh with same material splits into Shared Materials folder', async () => {
    const sheet = await setupSheet()
    const material = new MeshPhongMaterial({color: 0xff0000})
    material.name = 'Grass'
    const geo = new BoxGeometry(1, 1, 1)
    const meshA = new Mesh(geo, material)
    meshA.name = 'Mesh A'
    const meshB = new Mesh(geo, material)
    meshB.name = 'Mesh B'

    const objA = autoAddObject(meshA, sheet)
    expect(objA.value).toHaveProperty('material')
    expect(objA.getShowPropsOf()).toHaveLength(0)

    const objB = autoAddObject(meshB, sheet)
    expect(objA.value).not.toHaveProperty('material')
    expect(objB.value).not.toHaveProperty('material')

    const shared = sheet
      .getObjects()
      .find((o) => o.address.objectKey === 'Shared Materials / Grass')
    expect(shared).toBeTruthy()
    expect(objA.getShowPropsOf()).toContain(shared)
    expect(objB.getShowPropsOf()).toContain(shared)
  })

  test('third mesh joins existing shared material', async () => {
    const sheet = await setupSheet()
    const material = new MeshPhongMaterial({color: 0x00ff00})
    material.name = 'Metal'
    const geo = new BoxGeometry(1, 1, 1)

    const meshA = new Mesh(geo, material)
    meshA.name = 'A'
    const meshB = new Mesh(geo, material)
    meshB.name = 'B'
    const meshC = new Mesh(geo, material)
    meshC.name = 'C'

    autoAddObject(meshA, sheet)
    autoAddObject(meshB, sheet)
    const objC = autoAddObject(meshC, sheet)

    const shared = sheet
      .getObjects()
      .find((o) => o.address.objectKey === 'Shared Materials / Metal')
    expect(shared).toBeTruthy()
    expect(objC.getShowPropsOf()).toContain(shared)
    expect(
      sheet
        .getObjects()
        .filter((o) => o.address.objectKey === 'Shared Materials / Metal'),
    ).toHaveLength(1)
  })

  test('prior autoAddMaterial prevents embed on first mesh', async () => {
    const sheet = await setupSheet()
    const material = new MeshPhongMaterial({color: 0x0000ff})
    material.name = 'Prior'
    const materialObj = autoAddMaterial(material, sheet, {
      objectKey: 'My Prior Material',
    })

    const mesh = new Mesh(new BoxGeometry(), material)
    mesh.name = 'Mesh'
    const obj = autoAddObject(mesh, sheet)

    expect(obj.value).not.toHaveProperty('material')
    expect(obj.getShowPropsOf()).toContain(materialObj)
    expect(materialObj.address.objectKey).toBe('My Prior Material')
  })

  test('unnamed material warns and uses UUID fallback key', async () => {
    const sheet = await setupSheet()
    const material = new MeshPhongMaterial({color: 0xffffff})
    material.name = ''
    const geo = new BoxGeometry()
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    const meshA = new Mesh(geo, material)
    meshA.name = 'A'
    const meshB = new Mesh(geo, material)
    meshB.name = 'B'

    autoAddObject(meshA, sheet)
    autoAddObject(meshB, sheet)

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('has no name'))
    const shared = sheet
      .getObjects()
      .find((o) =>
        o.address.objectKey.startsWith(
          `Shared Materials / Material (${material.uuid.slice(0, 8)}`,
        ),
      )
    expect(shared).toBeTruthy()
    warn.mockRestore()
  })
})
