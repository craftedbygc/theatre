import type {PropTypeConfig_Boolean} from '@unseenco/theatre-core/propTypes'
import React, {useCallback} from 'react'
import BasicToggle from '@unseenco/theatre-studio/uiComponents/form/BasicToggle'
import type {ISimplePropEditorReactProps} from './ISimplePropEditorReactProps'

function BooleanPropEditor({
  propConfig,
  editingTools,
  value,
  autoFocus,
}: ISimplePropEditorReactProps<PropTypeConfig_Boolean>) {
  const onChange = useCallback(
    (next: boolean) => {
      editingTools.permanentlySetValue(next)
    },
    [propConfig, editingTools],
  )

  return <BasicToggle value={value} onChange={onChange} autoFocus={autoFocus} />
}

export default BooleanPropEditor
