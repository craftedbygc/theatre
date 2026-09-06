import styled from 'styled-components'
import type {MutableRefObject} from 'react'
import {useEffect} from 'react'
import React, {useMemo, useRef} from 'react'
import {mergeRefs} from 'react-merge-refs'
import useRefAndState from '@unseenco/theatre-studio/utils/useRefAndState'
import useOnClickOutside from '@unseenco/theatre-studio/uiComponents/useOnClickOutside'

const Input = styled.input.attrs({type: 'text'})<{
  $fitContent?: boolean
  $charCount?: number
}>`
  background: transparent;
  border: none;
  color: var(--studio-text-value);
  padding: ${(p) => (p.$fitContent ? '0' : '0 10px')};
  font: inherit;
  font-size: 13px;
  font-weight: ${(p) => (p.$fitContent ? 500 : 'inherit')};
  font-family: ${(p) =>
    p.$fitContent ? 'var(--studio-font-mono)' : 'inherit'};
  outline: none;
  cursor: text;
  text-align: right;
  width: ${(p) =>
    p.$fitContent ? `calc(${Math.max(p.$charCount ?? 4, 4)} * 1ch)` : '100%'};
  min-width: ${(p) => (p.$fitContent ? '4ch' : '0')};
  /* Full chip height for normal fields; value-sized for fitContent (hex). */
  height: ${(p) => (p.$fitContent ? 'auto' : '100%')};
  min-height: ${(p) => (p.$fitContent ? '0' : '100%')};
  line-height: ${(p) => (p.$fitContent ? 1.2 : 'inherit')};
  border-radius: 0;
  box-sizing: border-box;
  flex: ${(p) => (p.$fitContent ? '0 0 auto' : '1 1 auto')};
  align-self: ${(p) => (p.$fitContent ? 'center' : 'stretch')};
  /* fitContent (hex): underline via border-bottom like number inputs.
     Full-width text: underline via background-image so we don't lose 1px of height. */
  border-bottom: ${(p) =>
    p.$fitContent ? '1px solid transparent' : 'none'};
  background-repeat: no-repeat;
  background-position: left 10px bottom 0;
  background-size: calc(100% - 20px) 0;

  &:hover {
    background-color: transparent;
  }

  /* Straight 1px underline under the text (no rounded ends). */
  &:focus {
    cursor: text;
    background-color: transparent;
    ${(p) =>
      p.$fitContent
        ? `border-bottom-color: var(--studio-focus-ring);`
        : `
      background-image: linear-gradient(
        var(--studio-focus-ring),
        var(--studio-focus-ring)
      );
      background-size: calc(100% - 20px) 1px;
      background-position: left 10px bottom 0;
    `}
  }

  &.invalid {
    ${(p) =>
      p.$fitContent
        ? `border-bottom-color: #e25555;`
        : `
      background-image: linear-gradient(#e25555, #e25555);
      background-size: calc(100% - 20px) 1px;
      background-position: left 10px bottom 0;
    `}
  }
`

type IState_NoFocus = {
  mode: 'noFocus'
}

type IState_EditingViaKeyboard = {
  mode: 'editingViaKeyboard'
  currentEditedValueInString: string
  valueBeforeEditing: string
}

type IState = IState_NoFocus | IState_EditingViaKeyboard

const alwaysValid = (v: string) => true

const BasicStringInput: React.FC<{
  value: string
  temporarilySetValue: (v: string) => void
  discardTemporaryValue: () => void
  permanentlySetValue: (v: string) => void
  className?: string
  isValid?: (v: string) => boolean
  inputRef?: MutableRefObject<HTMLInputElement | null>
  /**
   * Called when the user hits Enter. One of the *SetValue() callbacks will be called
   * before this, so use this for UI purposes such as closing a popover.
   */
  onBlur?: () => void
  autoFocus?: boolean
  /**
   * When true, the field sizes to its text (ch units) and the focus underline
   * spans only that width — used for the color hex editor.
   */
  fitContent?: boolean
}> = (props) => {
  const [stateRef] = useRefAndState<IState>({mode: 'noFocus'})
  const isValid = props.isValid ?? alwaysValid

  const propsRef = useRef(props)
  propsRef.current = props

  const inputRef = useRef<HTMLInputElement | null>(null)

  useOnClickOutside(
    inputRef.current,
    () => {
      inputRef.current!.blur()
    },
    stateRef.current.mode === 'editingViaKeyboard',
  )

  const callbacks = useMemo(() => {
    const inputChange = (e: React.ChangeEvent) => {
      const target = e.target as HTMLInputElement
      const {value} = target
      const curState = stateRef.current as IState_EditingViaKeyboard

      stateRef.current = {...curState, currentEditedValueInString: value}

      if (!isValid(value)) return

      propsRef.current.temporarilySetValue(value)
    }

    const onBlur = () => {
      if (stateRef.current.mode === 'editingViaKeyboard') {
        commitKeyboardInput()
        stateRef.current = {mode: 'noFocus'}
      }
      propsRef.current.onBlur?.()
    }

    const commitKeyboardInput = () => {
      const curState = stateRef.current as IState_EditingViaKeyboard
      const value = curState.currentEditedValueInString

      if (!isValid(value)) {
        propsRef.current.discardTemporaryValue()
      } else {
        if (curState.valueBeforeEditing === value) {
          propsRef.current.discardTemporaryValue()
        } else {
          propsRef.current.permanentlySetValue(value)
        }
      }
    }

    const onInputKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        propsRef.current.discardTemporaryValue()
        stateRef.current = {mode: 'noFocus'}
        inputRef.current!.blur()
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        commitKeyboardInput()
        inputRef.current!.blur()
      }
    }

    const onClick = (e: React.MouseEvent) => {
      if (stateRef.current.mode === 'noFocus') {
        const c = inputRef.current!
        c.focus()
        e.preventDefault()
        e.stopPropagation()
      } else {
        e.stopPropagation()
      }
    }

    const onFocus = () => {
      if (stateRef.current.mode === 'noFocus') {
        transitionToEditingViaKeyboardMode()
      } else if (stateRef.current.mode === 'editingViaKeyboard') {
      }
    }

    const transitionToEditingViaKeyboardMode = () => {
      const curValue = propsRef.current.value
      stateRef.current = {
        mode: 'editingViaKeyboard',
        currentEditedValueInString: String(curValue),
        valueBeforeEditing: curValue,
      }

      setTimeout(() => {
        inputRef.current!.focus()
      })
    }

    return {
      inputChange,
      onBlur,
      onInputKeyDown,
      onClick,
      onFocus,
    }
  }, [])

  // Call onBlur on unmount. Because technically it _is_ a blur, but also, otherwise edits wouldn't be committed.
  useEffect(() => {
    return () => {
      callbacks.onBlur()
    }
  }, [])

  let value =
    stateRef.current.mode !== 'editingViaKeyboard'
      ? format(props.value)
      : stateRef.current.currentEditedValueInString

  const _refs = [inputRef]
  if (props.inputRef) _refs.push(props.inputRef)

  const theInput = (
    <Input
      key="input"
      type="text"
      className={`${props.className ?? ''} ${!isValid(value) ? 'invalid' : ''}`}
      $fitContent={!!props.fitContent}
      $charCount={String(value).length + (props.fitContent ? 1 : 0)}
      onChange={callbacks.inputChange}
      value={value}
      onBlur={callbacks.onBlur}
      onKeyDown={callbacks.onInputKeyDown}
      onClick={callbacks.onClick}
      onFocus={callbacks.onFocus}
      ref={mergeRefs(_refs)}
      onMouseDown={(e: React.MouseEvent) => {
        e.stopPropagation()
      }}
      onDoubleClick={(e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      autoFocus={props.autoFocus}
    />
  )

  return theInput
}

function format(v: string): string {
  return v
}

export default BasicStringInput
