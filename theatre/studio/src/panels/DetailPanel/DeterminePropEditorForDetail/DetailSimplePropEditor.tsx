import type {
  IBasePropType,
  PropTypeConfig_AllSimples,
} from '@unseenco/theatre-core/propTypes'
import React, {useMemo} from 'react'
import {useEditingToolsForSimplePropInDetailsPanel} from '@unseenco/theatre-studio/propEditors/useEditingToolsForSimpleProp'
import {SingleRowPropEditor} from '@unseenco/theatre-studio/panels/DetailPanel/DeterminePropEditorForDetail/SingleRowPropEditor'
import type {Pointer} from '@unseenco/theatre-dataverse'
import {getPointerParts} from '@unseenco/theatre-dataverse'
import type SheetObject from '@unseenco/theatre-core/sheetObjects/SheetObject'
import type {ISimplePropEditorReactProps} from '@unseenco/theatre-studio/propEditors/simpleEditors/ISimplePropEditorReactProps'
import {whatPropIsHighlighted} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/whatPropIsHighlighted'

export type IDetailSimplePropEditorProps<
  TPropTypeConfig extends IBasePropType<string, any>,
> = {
  propConfig: TPropTypeConfig
  pointerToProp: Pointer<TPropTypeConfig['valueType']>
  obj: SheetObject
  visualIndentation: number
  SimpleEditorComponent: React.VFC<ISimplePropEditorReactProps<TPropTypeConfig>>
}

/**
 * Shown in the Object details panel, changes to this editor are usually reflected at either
 * the playhead position (the `sequence.position`) or if static, the static override value.
 */
function DetailSimplePropEditor<
  TPropTypeConfig extends PropTypeConfig_AllSimples,
>({
  propConfig,
  pointerToProp,
  obj,
  SimpleEditorComponent: EditorComponent,
}: IDetailSimplePropEditorProps<TPropTypeConfig>) {
  const editingTools = useEditingToolsForSimplePropInDetailsPanel(
    pointerToProp,
    obj,
    propConfig,
  )

  const isPropHighlightedD = useMemo(
    () =>
      whatPropIsHighlighted.getIsPropHighlightedD({
        ...obj.address,
        pathToProp: getPointerParts(pointerToProp).path,
      }),
    [pointerToProp],
  )

  const isTransient = obj.template.isTransientPropPath(
    getPointerParts(pointerToProp).path,
  )

  return (
    <SingleRowPropEditor
      {...{
        editingTools: editingTools,
        propConfig,
        pointerToProp,
        isPropHighlightedD,
        isTransient,
      }}
    >
      <EditorComponent
        editingTools={editingTools}
        propConfig={propConfig}
        value={editingTools.value}
      />
    </SingleRowPropEditor>
  )
}

export default React.memo(DetailSimplePropEditor)
