import type {ISheetObject} from '@unseenco/theatre-core'
import type {Material} from 'three'
import type {MaterialApplier} from './buildMaterialProps'

/**
 * Shared across the runtime and `/extension` bundles via `globalThis`.
 */
const REGISTRY_KEY = '__unseenco_theatre_threejs_materialRegistry__'

export type MaterialBinding = {
  applyMaterial?: MaterialApplier
}

export type MaterialRegistryEntry = {
  /** Material sheet object when shared; host mesh sheet object when embedded. */
  sheetObject: ISheetObject
  mode: 'embedded' | 'shared'
  /** Mesh that still embeds material props (embedded mode only). */
  hostSheetObject?: ISheetObject
  /** Mutable binding so split can clear the host material applier. */
  binding?: MaterialBinding
  /** Transform-only config used when stripping material from the host. */
  transformOnlyConfig?: Record<string, unknown>
}

type MaterialRegistryMaps = {
  byMaterial: WeakMap<object, MaterialRegistryEntry>
}

function getMaps(): MaterialRegistryMaps {
  const store = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: MaterialRegistryMaps
  }
  let maps = store[REGISTRY_KEY]
  if (!maps) {
    maps = {
      byMaterial: new WeakMap(),
    }
    store[REGISTRY_KEY] = maps
  }
  return maps
}

/** Registry key: Material instance, or Material[] by array reference. */
export function getMaterialRegistryKey(
  material: Material | Material[],
): object {
  return material
}

export function getMaterialEntry(
  material: Material | Material[],
): MaterialRegistryEntry | undefined {
  return getMaps().byMaterial.get(getMaterialRegistryKey(material))
}

export function setMaterialEntry(
  material: Material | Material[],
  entry: MaterialRegistryEntry,
): void {
  getMaps().byMaterial.set(getMaterialRegistryKey(material), entry)
}

export function clearMaterialEntry(material: Material | Material[]): void {
  getMaps().byMaterial.delete(getMaterialRegistryKey(material))
}

export const SHARED_MATERIALS_NAMESPACE = 'Shared Materials'

export function resolveSharedMaterialObjectKey(
  material: Material | Material[],
): string {
  const name = resolveMaterialDisplayName(material)
  if (name) {
    return `${SHARED_MATERIALS_NAMESPACE} / ${name}`
  }

  const uuid = Array.isArray(material)
    ? material[0]?.uuid?.slice(0, 8) ?? 'unknown'
    : material.uuid.slice(0, 8)

  console.warn(
    `[theatre-threejs] A material used by multiple objects has no name. ` +
      `Name the material (material.name = '...') so Theatre can persist stable state for it. ` +
      `Using temporary key "${SHARED_MATERIALS_NAMESPACE} / Material (${uuid})" for this session.`,
  )

  return `${SHARED_MATERIALS_NAMESPACE} / Material (${uuid})`
}

function resolveMaterialDisplayName(
  material: Material | Material[],
): string | undefined {
  if (Array.isArray(material)) {
    const named = material.find((entry) => entry.name.trim())
    return named?.name.trim()
  }
  const name = material.name.trim()
  return name || undefined
}

export function mergeShowPropsOf(
  host: ISheetObject,
  source: ISheetObject,
): void {
  const current = host.getShowPropsOf()
  if (current.includes(source)) return
  host.showPropsOf([...current, source])
}
