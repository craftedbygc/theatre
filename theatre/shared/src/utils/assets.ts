import type Project from '@unseenco/theatre-core/projects/Project'
import {val} from '@unseenco/theatre-dataverse'
import forEachPropDeep from './forEachDeep'
import removePathFromObject from './removePathFromObject'
import type {$IntentionalAny, SerializableMap} from './types'
import {cloneDeep} from 'lodash-es'

function collectAssetIdsFromValues(values: unknown[], type?: string): string[] {
  return values
    .filter((value) => {
      return (
        (value as Asset | undefined)?.type &&
        (type
          ? (value as Asset | undefined)?.type == type
          : typeof (value as Asset | undefined)?.type === 'string')
      )
    })
    .map((value) => (value as Asset).id)
    .filter(
      (id, index, self) =>
        id !== null && id !== '' && self.indexOf(id) === index,
    ) as string[]
}

/**
 * Removes image asset values from ahistoric static overrides. Image props with
 * `persist: false` (and legacy transient image props) are stored in ahistoric
 * but must not survive refreshes or participate in asset retention.
 */
export function stripImageAssetsFromAhistoricStaticOverrides(
  ahistoricStaticOverridesByObject: Record<string, SerializableMap | undefined>,
): void {
  for (const objectKey of Object.keys(ahistoricStaticOverridesByObject)) {
    const overrides = ahistoricStaticOverridesByObject[objectKey]
    if (!overrides) continue

    const cloned = cloneDeep(overrides)
    forEachPropDeep(
      cloned,
      (value, path) => {
        if ((value as Asset | undefined)?.type === 'image') {
          removePathFromObject(cloned, path)
        }
      },
      [],
    )

    if (Object.keys(cloned).length === 0) {
      delete ahistoricStaticOverridesByObject[objectKey]
    } else {
      ahistoricStaticOverridesByObject[objectKey] = cloned
    }
  }
}

export function getAllPossibleAssetIDs(project: Project, type?: string) {
  const sheets = Object.values(val(project.pointers.historic.sheetsById) ?? {})
  const ahistoricSheets = Object.values(
    val(project.pointers.ahistoric.sheetsById) ?? {},
  )

  const staticValues = sheets
    .flatMap((sheet) => Object.values(sheet?.staticOverrides.byObject ?? {}))
    .concat(
      sheets.flatMap((sheet) =>
        Object.values(sheet?.staticOverridesByVariant ?? {}).flatMap(
          (variantOverrides) => Object.values(variantOverrides?.byObject ?? {}),
        ),
      ),
    )
    .concat(
      ahistoricSheets.flatMap((sheet) =>
        Object.values(sheet?.staticOverrides.byObject ?? {}),
      ),
    )
    .flatMap((overrides) => Object.values(overrides ?? {}))

  const keyframeValues = sheets
    .flatMap((sheet) => Object.values(sheet?.sequence?.tracksByObject ?? {}))
    .flatMap((tracks) => Object.values(tracks?.trackData ?? {}))
    .flatMap((track) => track?.keyframes)
    .map((keyframe) => keyframe?.value)

  const allValues = [...keyframeValues]
  staticValues.forEach((value) => {
    forEachPropDeep(
      value,
      (v) => {
        allValues.push(v as $IntentionalAny)
      },
      [],
    )
  })

  return collectAssetIdsFromValues(allValues, type)
}

export type Asset = {type: 'image'; id: string | undefined}
export type File = {type: 'file'; id: string | undefined}

/**
 * True when an asset id is already a loadable URL (absolute or path-like),
 * rather than a Theatre-managed filename such as `texture.png`.
 *
 * Used by `getAssetUrl` so pre-existing Three.js texture URLs (and similar)
 * can be used as image prop defaults without going through `baseUrl`.
 */
export function isDirectAssetUrl(assetId: string): boolean {
  if (/^(?:https?:\/\/|blob:|data:)/i.test(assetId)) return true
  // Relative / absolute paths — Theatre-managed ids are bare filenames.
  return assetId.includes('/') || assetId.includes('\\')
}
