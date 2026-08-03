import type Project from '@unseenco/theatre-core/projects/Project'
import SheetObjectTemplate from '@unseenco/theatre-core/sheetObjects/SheetObjectTemplate'
import type {
  SheetAddress,
  WithoutSheetInstance,
} from '@unseenco/theatre-shared/utils/addresses'
import {Atom} from '@unseenco/theatre-dataverse'
import type {Pointer} from '@unseenco/theatre-dataverse'
import Sheet from './Sheet'
import type {ObjectNativeObject} from './Sheet'
import type {
  SheetObjectActionsConfig,
  SheetObjectPropTypeConfig,
} from './TheatreSheet'
import type {
  ObjectAddressKey,
  SheetId,
  SheetInstanceId,
} from '@unseenco/theatre-shared/utils/ids'
import type {StrictRecord} from '@unseenco/theatre-shared/utils/types'
import type {OutlineNamespaceConfig} from '@unseenco/theatre-shared/utils/outlineNamespaces'
import type {SequenceVariantId} from '@unseenco/theatre-core/sequences/sequenceVariants'
import {
  DEFAULT_SEQUENCE_VARIANT,
  validateSequenceVariantsOrThrow,
} from '@unseenco/theatre-core/sequences/sequenceVariants'
import type {
  TransientPropPath,
  StaticPropPath,
} from '@unseenco/theatre-shared/utils/transientPropPaths'

type SheetTemplateObjectTemplateMap = StrictRecord<
  ObjectAddressKey,
  SheetObjectTemplate
>

export default class SheetTemplate {
  readonly type: 'Theatre_SheetTemplate' = 'Theatre_SheetTemplate'
  readonly address: WithoutSheetInstance<SheetAddress>
  private _instances = new Atom<Record<SheetInstanceId, Sheet>>({})
  readonly instancesP: Pointer<Record<SheetInstanceId, Sheet>> =
    this._instances.pointer

  private _objectTemplates = new Atom<SheetTemplateObjectTemplateMap>({})
  readonly objectTemplatesP = this._objectTemplates.pointer

  private readonly _pendingOutlineNamespaces: StrictRecord<
    string,
    OutlineNamespaceConfig
  > = {}

  private _sequenceVariants: SequenceVariantId[] = [DEFAULT_SEQUENCE_VARIANT]
  private _visibleInOutline = true

  constructor(readonly project: Project, sheetId: SheetId) {
    this.address = {...project.address, sheetId}
  }

  getInstance(instanceId: SheetInstanceId): Sheet {
    let inst = this._instances.get()[instanceId]

    if (!inst) {
      inst = new Sheet(this, instanceId)
      this._instances.setByPointer((p) => p[instanceId], inst)
    }

    return inst
  }

  getObjectTemplate(
    objectKey: ObjectAddressKey,
    nativeObject: ObjectNativeObject,
    config: SheetObjectPropTypeConfig,
    actions: SheetObjectActionsConfig,
    transient?: readonly TransientPropPath[],
    staticPropPaths?: readonly StaticPropPath[],
  ): SheetObjectTemplate {
    let template = this._objectTemplates.get()[objectKey]

    if (!template) {
      template = new SheetObjectTemplate(
        this,
        objectKey,
        nativeObject,
        config,
        actions,
        transient,
        staticPropPaths,
      )
      this._objectTemplates.setByPointer((p) => p[objectKey], template)
    } else {
      if (transient !== undefined) {
        template.setTransientPropPaths(transient, config)
      }
      if (staticPropPaths !== undefined) {
        template.setStaticPropPaths(staticPropPaths, config)
      }
    }

    return template
  }

  setOutlineNamespaceConfig(
    namespacePathKey: string,
    config: OutlineNamespaceConfig,
  ) {
    this._pendingOutlineNamespaces[namespacePathKey] = {
      ...this._pendingOutlineNamespaces[namespacePathKey],
      ...config,
    }
    this.project._commitOutlineNamespaceConfig(
      this.address.sheetId,
      namespacePathKey,
      config,
    )
  }

  getPendingOutlineNamespaces(): StrictRecord<string, OutlineNamespaceConfig> {
    return this._pendingOutlineNamespaces
  }

  getSequenceVariants(): SequenceVariantId[] {
    return this._sequenceVariants
  }

  declareSequenceVariants(variants: SequenceVariantId[]): void {
    this._sequenceVariants = validateSequenceVariantsOrThrow(
      variants,
      'sheet.declareSequenceVariants',
    )
  }

  setVisibleInOutline(visible: boolean): void {
    this._visibleInOutline = visible
  }

  isVisibleInOutline(): boolean {
    return this._visibleInOutline
  }
}
