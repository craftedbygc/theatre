import React, {useLayoutEffect, useRef} from 'react'
import type {PropTypeConfig_String} from '@unseenco/theatre-core/propTypes'
import BasicStringInput from '@unseenco/theatre-studio/uiComponents/form/BasicStringInput'
import type {ISimplePropEditorReactProps} from './ISimplePropEditorReactProps'

function StringPropEditor({
  editingTools,
  value,
  autoFocus,
  hostClickRef,
}: ISimplePropEditorReactProps<PropTypeConfig_String>) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useLayoutEffect(() => {
    if (!hostClickRef) return
    hostClickRef.current = () => {
      inputRef.current?.focus()
    }
    return () => {
      hostClickRef.current = null
    }
  }, [hostClickRef])

  return (
    <BasicStringInput
      value={value}
      temporarilySetValue={editingTools.temporarilySetValue}
      discardTemporaryValue={editingTools.discardTemporaryValue}
      permanentlySetValue={editingTools.permanentlySetValue}
      autoFocus={autoFocus}
      inputRef={inputRef}
    />
  )
}

export default StringPropEditor
