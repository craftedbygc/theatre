import {MeshPhysicalMaterial, MeshStandardMaterial} from 'three'
import {buildMaterialProps} from './buildMaterialProps'

function numberRange(config: unknown): [number, number] | undefined {
  if (!config || typeof config !== 'object') return undefined
  const range = (config as {range?: [number, number]}).range
  return range
}

describe('buildMaterialProps number ranges', () => {
  it('uses a 0–1 range for unit-interval material scalars', () => {
    const {config} = buildMaterialProps(
      new MeshPhysicalMaterial({
        metalness: 0.4,
        roughness: 0.6,
        opacity: 0.8,
        clearcoat: 0.2,
        transmission: 0.5,
      }),
    )

    const material = config?.material as Record<string, unknown>

    expect(numberRange(material.metalness)).toEqual([0, 1])
    expect(numberRange(material.roughness)).toEqual([0, 1])
    expect(numberRange(material.opacity)).toEqual([0, 1])
    expect(numberRange(material.alphaTest)).toEqual([0, 1])
    expect(numberRange(material.aoMapIntensity)).toEqual([0, 1])
    expect(numberRange(material.clearcoat)).toEqual([0, 1])
    expect(numberRange(material.clearcoatRoughness)).toEqual([0, 1])
    expect(numberRange(material.iridescence)).toEqual([0, 1])
    expect(numberRange(material.sheen)).toEqual([0, 1])
    expect(numberRange(material.sheenRoughness)).toEqual([0, 1])
    expect(numberRange(material.specularIntensity)).toEqual([0, 1])
    expect(numberRange(material.transmission)).toEqual([0, 1])
  })

  it('keeps an unbounded range for intensities, IOR, and physical distances', () => {
    const {config} = buildMaterialProps(
      new MeshPhysicalMaterial({
        emissiveIntensity: 1.5,
        envMapIntensity: 2,
        ior: 1.5,
        thickness: 0.4,
      }),
    )

    const material = config?.material as Record<string, unknown>

    expect(numberRange(material.emissiveIntensity)).toEqual([0, Infinity])
    expect(numberRange(material.envMapIntensity)).toEqual([0, Infinity])
    expect(numberRange(material.ior)).toEqual([0, Infinity])
    expect(numberRange(material.iridescenceIOR)).toEqual([0, Infinity])
    expect(numberRange(material.thickness)).toEqual([0, Infinity])
    expect(numberRange(material.bumpScale)).toEqual([0, Infinity])
    expect(numberRange(material.displacementScale)).toEqual([0, Infinity])
  })

  it('applies the same unit-interval ranges on MeshStandardMaterial', () => {
    const {config} = buildMaterialProps(new MeshStandardMaterial())
    const material = config?.material as Record<string, unknown>

    expect(numberRange(material.metalness)).toEqual([0, 1])
    expect(numberRange(material.roughness)).toEqual([0, 1])
    expect(numberRange(material.opacity)).toEqual([0, 1])
    expect(numberRange(material.emissiveIntensity)).toEqual([0, Infinity])
  })
})
