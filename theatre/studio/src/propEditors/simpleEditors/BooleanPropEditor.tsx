import type {PropTypeConfig_Boolean} from '@unseenco/theatre-core/propTypes'
import React, {useCallback, useLayoutEffect} from 'react'
import BasicToggle from '@unseenco/theatre-studio/uiComponents/form/BasicToggle'
import type {ISimplePropEditorReactProps} from './ISimplePropEditorReactProps'

function BooleanPropEditor({
  propConfig,
  editingTools,
  value,
  autoFocus,
  hostClickRef,
}: ISimplePropEditorReactProps<PropTypeConfig_Boolean>) {
  const onChange = useCallback(
    (next: boolean) => {
      editingTools.permanentlySetValue(next)
    },
    [propConfig, editingTools],
  )

  useLayoutEffect(() => {
    if (!hostClickRef) return
    hostClickRef.current = () => {
      onChange(!value)
    }
    return () => {
      hostClickRef.current = null
    }
  }, [hostClickRef, onChange, value])

  return <BasicToggle value={value} onChange={onChange} autoFocus={autoFocus} />
}

export default BooleanPropEditor
