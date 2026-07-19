import type Project from '@theatre/core/projects/Project'
import type Sheet from '@theatre/core/sheets/Sheet'
import type SheetTemplate from '@theatre/core/sheets/SheetTemplate'
import type {
  SheetObjectActionsConfig,
  SheetObjectPropTypeConfig,
} from '@theatre/core/sheets/TheatreSheet'
import {emptyArray} from '@theatre/shared/utils'
import type {
  PathToProp,
  PathToProp_Encoded,
  SheetObjectAddress,
  WithoutSheetInstance,
} from '@theatre/shared/utils/addresses'
import getDeep from '@theatre/shared/utils/getDeep'
import type {ObjectAddressKey, SequenceTrackId} from '@theatre/shared/utils/ids'
import SimpleCache from '@theatre/shared/utils/SimpleCache'
import type {
  $FixMe,
  $IntentionalAny,
  SerializableMap,
  SerializablePrimitive,
  SerializableValue,
} from '@theatre/shared/utils/types'
import type {Prism, Pointer} from '@theatre/dataverse'
import {Atom, getPointerParts, prism, val} from '@theatre/dataverse'
import set from 'lodash-es/set'
import getPropDefaultsOfSheetObject from './getPropDefaultsOfSheetObject'
import SheetObject from './SheetObject'
import logger from '@theatre/shared/logger'
import {
  getPropConfigByPath,
  isPropConfSequencable,
} from '@theatre/shared/propTypes/utils'
import getOrderingOfPropTypeConfig from './getOrderingOfPropTypeConfig'
import type {SheetState_Historic} from '@theatre/core/projects/store/types/SheetState_Historic'
import type {SheetAhistoricState} from '@theatre/core/projects/store/storeTypes'
import {
  DEFAULT_SEQUENCE_VARIANT,
  getEffectiveStaticOverrideForObject,
  mergeSequenceTrackMaps,
  valUnsequencedPropPathsForObject,
  valTrackIdByPropPathForObject,
} from '@theatre/core/sequences/sequenceVariants'
import type {SequenceVariantId} from '@theatre/core/sequences/sequenceVariants'
import {cloneDeep, unset} from 'lodash-es'

function isObjectEmpty(obj: unknown): boolean {
  return (
    typeof obj === 'object' && obj !== null && Object.keys(obj).length === 0
  )
}

/**
 * Given an object like: `{transform: {type: 'absolute', position: {x: 0}}}`,
 * if both `transform.type` and `transform.position.x` are sequenced, this
 * type would look like:
 *
 * ```ts
 * {
 *   transform: {
 *     type: 'SDFJSDFJ', // track id of transform.type
 *     position: {
 *       x: 'NCXNS' // track id of transform.position.x
 *     }
 *   }
 * }
 * ```
 */
export type IPropPathToTrackIdTree = {
  [propName in string]?: SequenceTrackId | IPropPathToTrackIdTree
}

/**
 * TODO: Add documentation, and share examples of sheet objects.
 *
 * See {@link SheetObject} for more information.
 */
export default class SheetObjectTemplate {
  readonly address: WithoutSheetInstance<SheetObjectAddress>
  readonly type: 'Theatre_SheetObjectTemplate' = 'Theatre_SheetObjectTemplate'
  protected _config: Atom<SheetObjectPropTypeConfig>
  readonly _temp_actions_atom: Atom<SheetObjectActionsConfig>
  readonly _cache = new SimpleCache()
  readonly project: Project
  readonly pointerToSheetState: Pointer<SheetState_Historic | undefined>
  readonly pointerToStaticOverrides: Pointer<
    SerializableMap<SerializablePrimitive> | undefined
  >
  readonly pointerToAhistoricSheetState: Pointer<
    SheetAhistoricState | undefined
  >
  readonly pointerToAhistoricStaticOverrides: Pointer<
    SerializableMap<SerializablePrimitive> | undefined
  >

  get staticConfig() {
    return this._config.get()
  }

  get configPointer() {
    return this._config.pointer
  }

  get _temp_actions() {
    return this._temp_actions_atom.get()
  }

  get _temp_actionsPointer() {
    return this._temp_actions_atom.pointer
  }

  constructor(
    readonly sheetTemplate: SheetTemplate,
    objectKey: ObjectAddressKey,
    nativeObject: unknown,
    config: SheetObjectPropTypeConfig,
    _temp_actions: SheetObjectActionsConfig,
  ) {
    this.address = {...sheetTemplate.address, objectKey}
    this._config = new Atom(config)
    this._temp_actions_atom = new Atom(_temp_actions)
    this.project = sheetTemplate.project

    this.pointerToSheetState =
      this.sheetTemplate.project.pointers.historic.sheetsById[
        this.address.sheetId
      ]

    this.pointerToStaticOverrides =
      this.pointerToSheetState.staticOverrides.byObject[this.address.objectKey]

    this.pointerToAhistoricSheetState =
      this.sheetTemplate.project.pointers.ahistoric.sheetsById[
        this.address.sheetId
      ]

    this.pointerToAhistoricStaticOverrides =
      this.pointerToAhistoricSheetState.staticOverrides.byObject[
        this.address.objectKey
      ]
  }

  createInstance(
    sheet: Sheet,
    nativeObject: unknown,
    config: SheetObjectPropTypeConfig,
  ): SheetObject {
    this._config.set(config)
    return new SheetObject(sheet, this, nativeObject)
  }

  reconfigure(config: SheetObjectPropTypeConfig) {
    this._config.set(config)
  }

  /**
   * The `actions` api is temporary until we implement events.
   */
  _temp_setActions(actions: SheetObjectActionsConfig) {
    this._temp_actions_atom.set(actions)
  }

  /**
   * Returns the default values (all defaults are read from the config)
   */
  getDefaultValues(): Prism<SerializableMap> {
    return this._cache.get('getDefaultValues()', () =>
      prism(() => {
        const config = val(this.configPointer)
        return getPropDefaultsOfSheetObject(config)
      }),
    )
  }

  /**
   * Returns values that are set statically (ie, not sequenced, and not defaults)
   * for the given variant. Non-default variants inherit from the default variant.
   */
  getStaticValues(
    sequenceVariant: SequenceVariantId = DEFAULT_SEQUENCE_VARIANT,
  ): Prism<SerializableMap> {
    return this._cache.get(`getStaticValues:${sequenceVariant}`, () =>
      prism(() => {
        const sheetState = val(this.pointerToSheetState)
        const json =
          getEffectiveStaticOverrideForObject(
            sheetState,
            sequenceVariant,
            this.address.objectKey,
          ) ?? {}

        const config = val(this.configPointer)
        const deserialized = config.deserializeAndSanitize(json) || {}
        return deserialized
      }),
    )
  }

  /**
   * Returns values set via an ahistoric (non-undoable) transaction. These are
   * persisted to storage but never recorded in the undo/redo history.
   */
  getAhistoricStaticValues(): Prism<SerializableMap> {
    return this._cache.get('getAhistoricStaticValues', () =>
      prism(() => {
        const json = val(this.pointerToAhistoricStaticOverrides) ?? {}
        const config = val(this.configPointer)
        const deserialized = config.deserializeAndSanitize(json) || {}
        return deserialized
      }),
    )
  }

  /**
   * Filters through the sequenced tracks and returns those tracks who are valid
   * according to the object's prop types, then sorted in the same order as the config
   *
   * Returns an array.
   */
  getArrayOfValidSequenceTracks(sequenceVariant: SequenceVariantId): Prism<
    Array<{
      pathToProp: PathToProp
      trackId: SequenceTrackId
      trackVariant: SequenceVariantId
    }>
  > {
    return this._cache.get(
      `getArrayOfValidSequenceTracks:${sequenceVariant}`,
      () =>
        prism(
          (): Array<{
            pathToProp: PathToProp
            trackId: SequenceTrackId
            trackVariant: SequenceVariantId
          }> => {
            const pointerToSheetState =
              this.project.pointers.historic.sheetsById[this.address.sheetId]

            // Re-subscribe when variant overrides change (copies/clears per-variant tracks).
            val(pointerToSheetState.variantObjectOverrides)

            const defaultTrackIdByPropPath = valTrackIdByPropPathForObject(
              pointerToSheetState,
              DEFAULT_SEQUENCE_VARIANT,
              this.address.objectKey,
            )

            const variantTrackIdByPropPath =
              sequenceVariant === DEFAULT_SEQUENCE_VARIANT
                ? undefined
                : valTrackIdByPropPathForObject(
                    pointerToSheetState,
                    sequenceVariant,
                    this.address.objectKey,
                  )

            const mergedTrackMap = mergeSequenceTrackMaps(
              defaultTrackIdByPropPath,
              variantTrackIdByPropPath,
              sequenceVariant,
            )

            const unsequencedPropPaths =
              sequenceVariant === DEFAULT_SEQUENCE_VARIANT
                ? undefined
                : valUnsequencedPropPathsForObject(
                    pointerToSheetState,
                    sequenceVariant,
                    this.address.objectKey,
                  )
            const unsequencedPropPathSet = unsequencedPropPaths
              ? new Set(unsequencedPropPaths)
              : undefined

            if (Object.keys(mergedTrackMap).length === 0) {
              return emptyArray as $IntentionalAny
            }

            const arrayOfIds: Array<{
              pathToProp: PathToProp
              trackId: SequenceTrackId
              trackVariant: SequenceVariantId
            }> = []

            const objectConfig = val(this.configPointer)

            for (const [pathToPropInString, effectiveTrack] of Object.entries(
              mergedTrackMap,
            )) {
              if (!effectiveTrack) continue
              if (
                unsequencedPropPathSet?.has(
                  pathToPropInString as PathToProp_Encoded,
                )
              ) {
                continue
              }
              const {trackId, trackVariant} = effectiveTrack
              const pathToProp = parsePathToProp(pathToPropInString)
              if (!pathToProp) continue

              const propConfig = getPropConfigByPath(objectConfig, pathToProp)

              const isSequencable =
                propConfig && isPropConfSequencable(propConfig)

              if (!isSequencable) continue

              arrayOfIds.push({pathToProp, trackId, trackVariant})
            }

            const mapping = getOrderingOfPropTypeConfig(objectConfig)

            arrayOfIds.sort((a, b) => {
              const pathToPropA = a.pathToProp
              const pathToPropB = b.pathToProp

              const indexA = mapping.get(JSON.stringify(pathToPropA))!
              const indexB = mapping.get(JSON.stringify(pathToPropB))!

              if (indexA > indexB) {
                return 1
              }

              return -1
            })

            if (arrayOfIds.length === 0) {
              return emptyArray as $IntentionalAny
            } else {
              return arrayOfIds
            }
          },
        ),
    )
  }

  /**
   * Filters through the sequenced tracks those tracks that are valid
   * according to the object's prop types.
   *
   * Returns a map.
   *
   * Not available in core.
   */
  getMapOfValidSequenceTracks_forStudio(
    sequenceVariant: SequenceVariantId,
  ): Prism<IPropPathToTrackIdTree> {
    return this._cache.get(
      `getMapOfValidSequenceTracks_forStudio:${sequenceVariant}`,
      () =>
        prism(() => {
          const arr = val(this.getArrayOfValidSequenceTracks(sequenceVariant))
          let map = {}

          for (const {pathToProp, trackId} of arr) {
            set(map, pathToProp, trackId)
          }

          return map
        }),
    )
  }

  getSequenceVariantOwningTrack(
    trackId: SequenceTrackId,
    activeVariant: SequenceVariantId,
  ): SequenceVariantId | undefined {
    const tracks = this.getArrayOfValidSequenceTracks(activeVariant).getValue()
    return tracks.find((t) => t.trackId === trackId)?.trackVariant
  }

  /**
   * @returns The static overrides that are not sequenced. Returns undefined if there are no static overrides,
   * or if all those static overrides are sequenced.
   */
  getStaticButNotSequencedOverrides(
    sequenceVariant: SequenceVariantId,
  ): Prism<SerializableMap | undefined> {
    return this._cache.get(
      `getStaticButNotSequencedOverrides:${sequenceVariant}`,
      () =>
        prism(() => {
          const staticOverrides = val(this.getStaticValues(sequenceVariant))
          const arrayOfValidSequenceTracks = val(
            this.getArrayOfValidSequenceTracks(sequenceVariant),
          )

          const staticButNotSequencedOverrides = cloneDeep(staticOverrides)

          for (const {pathToProp} of arrayOfValidSequenceTracks) {
            unset(staticButNotSequencedOverrides, pathToProp)
            // also unset the parent if it's empty, and so on
            let parentPath = pathToProp.slice(0, -1)
            while (parentPath.length > 0) {
              const parentValue = getDeep(
                staticButNotSequencedOverrides,
                parentPath,
              )
              if (!isObjectEmpty(parentValue)) break
              unset(staticButNotSequencedOverrides, parentPath)
              parentPath = parentPath.slice(0, -1)
            }
          }

          if (isObjectEmpty(staticButNotSequencedOverrides)) {
            return undefined
          } else {
            return staticButNotSequencedOverrides
          }
        }),
    )
  }

  getDefaultsAtPointer(
    pointer: Pointer<unknown>,
  ): SerializableValue | undefined {
    const {path} = getPointerParts(pointer)
    const defaults = this.getDefaultValues().getValue()

    const defaultsAtPath = getDeep(defaults, path)
    return defaultsAtPath as $FixMe
  }
}

function parsePathToProp(
  pathToPropInString: string,
): undefined | Array<string | number> {
  try {
    const pathToProp = JSON.parse(pathToPropInString)
    return pathToProp
  } catch (e) {
    logger.warn(
      `property ${JSON.stringify(
        pathToPropInString,
      )} cannot be parsed. Skipping.`,
    )
    return undefined
  }
}
