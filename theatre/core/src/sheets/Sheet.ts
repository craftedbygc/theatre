import type Project from '@unseenco/theatre-core/projects/Project'
import Sequence from '@unseenco/theatre-core/sequences/Sequence'
import type SheetObject from '@unseenco/theatre-core/sheetObjects/SheetObject'
import type {
  SheetObjectActionsConfig,
  SheetObjectPropTypeConfig,
} from '@unseenco/theatre-core/sheets/TheatreSheet'
import TheatreSheet from '@unseenco/theatre-core/sheets/TheatreSheet'
import type {SheetAddress} from '@unseenco/theatre-shared/utils/addresses'
import {Atom, prism, val} from '@unseenco/theatre-dataverse'
import type {Prism} from '@unseenco/theatre-dataverse'
import type SheetTemplate from './SheetTemplate'
import type {
  ObjectAddressKey,
  SheetInstanceId,
} from '@unseenco/theatre-shared/utils/ids'
import type {
  TransientPropPath,
  StaticPropPath,
} from '@unseenco/theatre-shared/utils/transientPropPaths'
import type {StrictRecord} from '@unseenco/theatre-shared/utils/types'
import type {ILogger} from '@unseenco/theatre-shared/logger'
import {isInteger} from 'lodash-es'
import type {SequenceVariantId} from '@unseenco/theatre-core/sequences/sequenceVariants'
import {
  DEFAULT_SEQUENCE_VARIANT,
  getSequenceStateFromSheet,
  validateSequenceVariantIdOrThrow,
} from '@unseenco/theatre-core/sequences/sequenceVariants'

type SheetObjectMap = StrictRecord<ObjectAddressKey, SheetObject>

/**
 * Future: `nativeObject` Idea is to potentially allow the user to provide their own
 * object in to the object call as a way to keep a handle to an underlying object via
 * the {@link ISheetObject}.
 *
 * For example, a THREEjs object or an HTMLElement is passed in.
 */
export type ObjectNativeObject = unknown

export default class Sheet {
  private readonly _objects: Atom<SheetObjectMap> = new Atom<SheetObjectMap>({})
  private readonly _sequences: Record<string, Sequence> = {}
  private readonly _activeSequenceVariant = new Atom<SequenceVariantId>(
    DEFAULT_SEQUENCE_VARIANT,
  )
  /**
   * When Studio is open, it sets this to control which variant is used for
   * value resolution (preview). User code can still update `_activeSequenceVariant`
   * via `setActiveSequenceVariant()` without affecting the Studio preview.
   */
  private readonly _studioPreviewVariantOverride = new Atom<
    SequenceVariantId | undefined
  >(undefined)
  readonly activeSequenceVariantP = this._activeSequenceVariant.pointer
  readonly effectiveActiveSequenceVariantD: Prism<SequenceVariantId>
  readonly address: SheetAddress
  readonly publicApi: TheatreSheet
  readonly project: Project
  readonly objectsP = this._objects.pointer
  type: 'Theatre_Sheet' = 'Theatre_Sheet'
  readonly _logger: ILogger

  constructor(
    readonly template: SheetTemplate,
    public readonly instanceId: SheetInstanceId,
  ) {
    this._logger = template.project._logger.named('Sheet', instanceId)
    this._logger._trace('creating sheet')
    this.project = template.project
    this.address = {
      ...template.address,
      sheetInstanceId: this.instanceId,
    }

    this.publicApi = new TheatreSheet(this)

    this.effectiveActiveSequenceVariantD = prism(() => {
      const studioOverride = val(this._studioPreviewVariantOverride.pointer)
      if (studioOverride !== undefined) {
        return studioOverride
      }
      return val(this._activeSequenceVariant.pointer)
    })
  }

  /**
   * @remarks At some point, we have to reconcile the concept of "an object"
   * with that of "an element."
   */
  createObject(
    objectKey: ObjectAddressKey,
    nativeObject: ObjectNativeObject,
    config: SheetObjectPropTypeConfig,
    actions: SheetObjectActionsConfig = {},
    visibleInOutline?: boolean,
    transient?: readonly TransientPropPath[],
    staticPropPaths?: readonly StaticPropPath[],
  ): SheetObject {
    const objTemplate = this.template.getObjectTemplate(
      objectKey,
      nativeObject,
      config,
      actions,
      transient,
      staticPropPaths,
    )

    if (visibleInOutline !== undefined) {
      objTemplate.setVisibleInOutline(visibleInOutline)
    }

    const object = objTemplate.createInstance(this, nativeObject, config)

    this._objects.setByPointer((p) => p[objectKey], object)
    this.project._remoteSync.registerObject(object)

    return object
  }

  getObject(key: ObjectAddressKey): SheetObject | undefined {
    return this._objects.get()[key]
  }

  getObjects(): SheetObject[] {
    return Object.values(this._objects.get()).filter(
      (obj): obj is SheetObject => !!obj,
    )
  }

  deleteObject(objectKey: ObjectAddressKey) {
    const obj = this._objects.get()[objectKey]
    this._objects.reduce((state) => {
      const newState = {...state}
      delete newState[objectKey]
      return newState
    })
    if (obj) {
      this.project._remoteSync.unregisterObject(obj)
    }
  }

  /**
   * Runtime-only teardown: pause sequences, detach all objects, and remove
   * this sheet instance from the project. Persisted state is kept.
   */
  unload() {
    for (const sequence of Object.values(this._sequences)) {
      sequence.pause()
    }
    for (const objectKey of Object.keys(
      this._objects.get(),
    ) as ObjectAddressKey[]) {
      this.deleteObject(objectKey)
    }
    this.project._unloadSheetInstance(this)
  }

  getSequence(variant?: SequenceVariantId): Sequence {
    const variantId = variant ?? val(this._activeSequenceVariant.pointer)
    if (!this._sequences[variantId]) {
      const lengthD = prism(() => {
        const sheetState = val(
          this.project.pointers.historic.sheetsById[this.address.sheetId],
        )
        const unsanitized = getSequenceStateFromSheet(
          sheetState,
          variantId,
        )?.length
        return sanitizeSequenceLength(unsanitized)
      })

      const subUnitsPerUnitD = prism(() => {
        const sheetState = val(
          this.project.pointers.historic.sheetsById[this.address.sheetId],
        )
        const unsanitized = getSequenceStateFromSheet(
          sheetState,
          variantId,
        )?.subUnitsPerUnit
        return sanitizeSequenceSubUnitsPerUnit(unsanitized)
      })

      this._sequences[variantId] = new Sequence(
        this.template.project,
        this,
        lengthD,
        subUnitsPerUnitD,
        variantId,
      )
    }
    return this._sequences[variantId]!
  }

  getActiveSequenceVariant(): SequenceVariantId {
    return this._activeSequenceVariant.get()
  }

  setActiveSequenceVariant(variant: SequenceVariantId): void {
    const variantId = validateSequenceVariantIdOrThrow(
      variant,
      'sheet.setActiveSequenceVariant',
    )
    const registeredVariants = this.template.getSequenceVariants()
    if (!registeredVariants.includes(variantId)) {
      throw new Error(
        `Variant "${variantId}" is not registered on this sheet. ` +
          `Registered variants: ${registeredVariants.join(', ')}. ` +
          `Register variants via sheet.declareSequenceVariants([...]).`,
      )
    }
    this._activeSequenceVariant.set(variantId)
  }

  setStudioPreviewVariantOverride(
    variant: SequenceVariantId | undefined,
  ): void {
    if (variant === undefined) {
      this._studioPreviewVariantOverride.set(undefined)
      return
    }

    const variantId = validateSequenceVariantIdOrThrow(
      variant,
      'sheet.setStudioPreviewVariantOverride',
    )
    const registeredVariants = this.template.getSequenceVariants()
    if (!registeredVariants.includes(variantId)) {
      throw new Error(
        `Variant "${variantId}" is not registered on this sheet. ` +
          `Registered variants: ${registeredVariants.join(', ')}. ` +
          `Register variants via sheet.declareSequenceVariants([...]).`,
      )
    }
    this._studioPreviewVariantOverride.set(variantId)
  }
}

const sanitizeSequenceLength = (len: number | undefined): number =>
  typeof len === 'number' && isFinite(len) && len > 0 ? len : 10

const sanitizeSequenceSubUnitsPerUnit = (subs: number | undefined): number =>
  typeof subs === 'number' && isInteger(subs) && subs >= 1 && subs <= 1000
    ? subs
    : 30
