import {clamp, isInteger} from 'lodash-es'
import type {MutableRefObject} from 'react'
import {useEffect} from 'react'
import {useState} from 'react'
import React, {useMemo, useRef} from 'react'
import styled from 'styled-components'
import {mergeRefs} from 'react-merge-refs'
import useRefAndState from '@unseenco/theatre-studio/utils/useRefAndState'
import useOnClickOutside from '@unseenco/theatre-studio/uiComponents/useOnClickOutside'
import useDrag from '@unseenco/theatre-studio/uiComponents/useDrag'
import {
  DEFAULT_NUMBER_PRECISION,
  roundNumberToPrecision,
} from '@unseenco/theatre-shared/propTypes/numberPrecision'

const Container = styled.div<{
  $embedded: boolean
  $hasRange: boolean
}>`
  height: 100%;
  width: 100%;
  min-height: var(--studio-row-height, 36px);
  position: relative;
  z-index: 0;
  box-sizing: border-box;
  display: flex;
  align-items: stretch;
  border-radius: var(--studio-radius, 4px);
  overflow: hidden;
  background: ${(p) =>
    p.$embedded
      ? 'transparent'
      : p.$hasRange
      ? 'var(--studio-surface)'
      : 'transparent'};
  box-shadow: none;
  transition: background 150ms ease, box-shadow 150ms ease;

  &:hover,
  &.dragging,
  &.editingViaKeyboard {
    background: ${(p) =>
      p.$embedded
        ? 'transparent'
        : p.$hasRange
        ? 'var(--studio-surface-hover)'
        : 'transparent'};
    box-shadow: ${(p) =>
      p.$embedded || !p.$hasRange
        ? 'none'
        : 'inset 0 0 0 1px var(--studio-border-hover)'};
  }
`

const FillIndicator = styled.div`
  position: absolute;
  inset: 0 auto 0 0;
  width: calc(var(--percentage) * 100%);
  background: var(--studio-surface-fill);
  z-index: 0;
  pointer-events: none;
  border-radius: var(--studio-radius, 4px) 0 0 var(--studio-radius, 4px);
`

const Hashmarks = styled.div<{
  $visible: boolean
}>`
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  opacity: ${(p) => (p.$visible ? 0.7 : 0)};
  transition: opacity 120ms ease;
  background-image: repeating-linear-gradient(
    to right,
    transparent,
    transparent calc(10% - 1px),
    rgba(255, 255, 255, 0.42) calc(10% - 1px),
    rgba(255, 255, 255, 0.42) 10%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    transparent 38%,
    #000 46%,
    #000 54%,
    transparent 62%,
    transparent 100%
  );
`

const Handle = styled.div<{
  $visible: boolean
}>`
  position: absolute;
  top: 50%;
  left: calc(var(--percentage) * 100%);
  width: 3px;
  height: 18px;
  margin-top: -9px;
  margin-left: -1.5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  z-index: 2;
  pointer-events: none;
  opacity: ${(p) => (p.$visible ? 1 : 0)};
  transition: opacity 120ms ease;
`

/** Full-chip drag hit target (sits under the value when editing). */
const DragSurface = styled.div`
  position: absolute;
  inset: 0;
  z-index: 4;
  touch-action: none;
  cursor: ew-resize;
`

const Content = styled.div`
  position: relative;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  min-height: inherit;
  padding: 0 10px;
  box-sizing: border-box;
  pointer-events: none;
`

const LabelText = styled.div`
  flex: 0 1 auto;
  max-width: 48%;
  font-size: 13px;
  font-weight: 500;
  color: var(--studio-text-label);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
`

const ValueSlot = styled.div`
  margin-left: auto;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  height: 100%;
  /* Always receive hits so only the value (not the whole chip) enters edit. */
  pointer-events: auto;
  cursor: text;
`

const Input = styled.input<{
  $isEditing: boolean
  $invalid: boolean
}>`
  background: transparent;
  border: none;
  border-bottom: 1px solid
    ${(p) =>
      p.$invalid
        ? '#e25555'
        : p.$isEditing
        ? 'var(--studio-focus-ring)'
        : 'transparent'};
  border-radius: 0;
  color: var(--studio-text-value);
  padding: 0;
  font-family: var(--studio-font-mono);
  font-size: 13px;
  font-weight: 500;
  outline: none;
  cursor: text;
  text-align: right;
  width: calc(var(--value-ch, 4) * 1ch);
  min-width: 3ch;
  height: auto;
  line-height: 1.2;
  touch-action: none;
  box-sizing: content-box;

  &:focus {
    cursor: text;
  }
`

type IState_NoFocus = {
  mode: 'noFocus'
}

type IState_EditingViaKeyboard = {
  mode: 'editingViaKeyboard'
  currentEditedValueInString: string
  valueBeforeEditing: number
}

type IState_Dragging = {
  mode: 'dragging'
}

type IState = IState_NoFocus | IState_EditingViaKeyboard | IState_Dragging

const alwaysValid = (v: number) => true

export type BasicNumberInputNudgeFn = (params: {
  deltaX: number
  deltaFraction: number
  magnitude: number
}) => number

const BasicNumberInput: React.FC<{
  value: number
  temporarilySetValue: (v: number) => void
  discardTemporaryValue: () => void
  permanentlySetValue: (v: number) => void
  className?: string
  range?: [min: number, max: number]
  isValid?: (v: number) => boolean
  inputRef?: MutableRefObject<HTMLInputElement | null>
  /**
   * Called when the user hits Enter. One of the *SetValue() callbacks will be called
   * before this, so use this for UI purposes such as closing a popover.
   */
  onBlur?: () => void
  nudge: BasicNumberInputNudgeFn
  autoFocus?: boolean
  precision?: number
  /** Optional label rendered inside the track (details pane Dialkit layout). */
  label?: string
  /**
   * When true, skip own chip surface (parent chip already paints it).
   * Details-pane number rows pass this so brightness matches other controls.
   */
  embedded?: boolean
}> = (propsA) => {
  const [stateRef] = useRefAndState<IState>({mode: 'noFocus'})
  const [isHot, setIsHot] = useState(false)
  const isValid = propsA.isValid ?? alwaysValid
  const precision = propsA.precision ?? DEFAULT_NUMBER_PRECISION
  const embedded = !!propsA.embedded || !!propsA.label

  const propsRef = useRef(propsA)
  propsRef.current = propsA

  const getPrecision = () =>
    propsRef.current.precision ?? DEFAULT_NUMBER_PRECISION

  const inputRef = useRef<HTMLInputElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  // While dragging on touch, React must not push new `value` props into the input —
  // that re-sync cancels the active pointer gesture. We freeze the prop and update
  // the DOM directly instead.
  const frozenInputValueRef = useRef<string | null>(null)

  useOnClickOutside(
    inputRef.current,
    () => {
      inputRef.current!.blur()
    },
    stateRef.current.mode === 'editingViaKeyboard',
  )

  const bodyCursorBeforeDrag = useRef<string | null>(null)

  const callbacks = useMemo(() => {
    const inputChange = (e: React.ChangeEvent) => {
      const target = e.target as HTMLInputElement
      const {value} = target
      const curState = stateRef.current as IState_EditingViaKeyboard

      stateRef.current = {...curState, currentEditedValueInString: value}

      const valInFloat = parseFloat(value)
      if (!isFinite(valInFloat) || !isValid(valInFloat)) return

      propsRef.current.temporarilySetValue(
        roundNumberToPrecision(valInFloat, getPrecision()),
      )
    }

    const onBlur = () => {
      if (stateRef.current.mode === 'editingViaKeyboard') {
        commitKeyboardInput()
        stateRef.current = {mode: 'noFocus'}
      }
      if (propsA.onBlur) propsA.onBlur()
    }

    const commitKeyboardInput = () => {
      const curState = stateRef.current as IState_EditingViaKeyboard
      const value = roundNumberToPrecision(
        parseFloat(curState.currentEditedValueInString),
        getPrecision(),
      )

      if (!isFinite(value) || !isValid(value)) {
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
        inputRef.current!.setSelectionRange(0, 100)
      })
    }

    let trackWidth: number

    const transitionToDraggingMode = (event: MouseEvent) => {
      const curValue = propsRef.current.value
      trackWidth =
        containerRef.current?.getBoundingClientRect().width ||
        inputRef.current?.getBoundingClientRect().width ||
        1

      frozenInputValueRef.current = format(curValue, getPrecision())
      inputRef.current?.blur()
      if (inputRef.current) {
        inputRef.current.readOnly = true
      }

      stateRef.current = {
        mode: 'dragging',
      }

      let valueBeforeDragging = curValue
      let valueDuringDragging = curValue
      const hasRange = !!propsRef.current.range

      const valueFromClientX = (clientX: number) => {
        const range = propsRef.current.range!
        const el = containerRef.current
        if (!el) return propsRef.current.value
        const rect = el.getBoundingClientRect()
        const ratio =
          rect.width <= 0
            ? 0
            : clamp((clientX - rect.left) / rect.width, 0, 1)
        return roundNumberToPrecision(
          range[0] + ratio * (range[1] - range[0]),
          getPrecision(),
        )
      }

      if (hasRange) {
        valueDuringDragging = valueFromClientX(event.clientX)
        valueBeforeDragging = valueDuringDragging
        frozenInputValueRef.current = format(
          valueDuringDragging,
          getPrecision(),
        )
        if (inputRef.current) {
          inputRef.current.value = frozenInputValueRef.current
        }
        propsRef.current.temporarilySetValue(valueDuringDragging)
      }

      bodyCursorBeforeDrag.current = document.body.style.cursor

      const updateDragDisplay = (nextValue: number) => {
        const formatted = format(nextValue, getPrecision())
        frozenInputValueRef.current = formatted
        if (inputRef.current) {
          inputRef.current.value = formatted
        }
      }

      return {
        onDrag(_dx: number, _dy: number, e: MouseEvent, mx: number) {
          if (hasRange) {
            valueDuringDragging = valueFromClientX(e.clientX)
          } else {
            // Use `mx` so reversing direction after overshooting recovers quickly.
            const deltaX = e.altKey ? mx / 10 : mx
            const newValue =
              valueDuringDragging +
              propsA.nudge({
                deltaX,
                deltaFraction: deltaX / trackWidth,
                magnitude: 1,
              })
            valueDuringDragging = roundNumberToPrecision(
              newValue,
              getPrecision(),
            )
          }

          updateDragDisplay(valueDuringDragging)
          propsRef.current.temporarilySetValue(valueDuringDragging)
        },
        onDragEnd(happened: boolean) {
          frozenInputValueRef.current = null
          if (inputRef.current) {
            inputRef.current.readOnly = false
          }

          if (!happened) {
            if (hasRange) {
              propsRef.current.permanentlySetValue(valueDuringDragging)
            } else {
              propsRef.current.discardTemporaryValue()
            }
            stateRef.current = {mode: 'noFocus'}
          } else {
            if (valueBeforeDragging === valueDuringDragging) {
              propsRef.current.discardTemporaryValue()
            } else {
              propsRef.current.permanentlySetValue(valueDuringDragging)
            }
            stateRef.current = {mode: 'noFocus'}
          }
        },
        onClick() {
          // Ranged chips: click-anywhere only scrubs / sets value — edit is
          // reserved for clicks on the value itself (ValueSlot above the drag surface).
          if (propsRef.current.range) return
          inputRef.current!.focus()
          inputRef.current!.setSelectionRange(0, 100)
        },
      }
    }

    return {
      inputChange,
      onBlur,
      transitionToDraggingMode,
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
    frozenInputValueRef.current != null
      ? frozenInputValueRef.current
      : stateRef.current.mode !== 'editingViaKeyboard'
      ? format(propsA.value, precision)
      : stateRef.current.currentEditedValueInString

  if (typeof value === 'number' && isNaN(value)) {
    value = 'NaN'
  }

  const valueStr = String(value)
  const valueCh = Math.max(3, valueStr.length)

  const _refs = [inputRef]
  if (propsA.inputRef) _refs.push(propsA.inputRef)

  const isEditing = stateRef.current.mode === 'editingViaKeyboard'
  const valueIsValid =
    !isEditing ||
    (() => {
      const n = parseFloat(valueStr)
      return isFinite(n) && isValid(n)
    })()

  const theInput = (
    <Input
      key="input"
      type="text"
      $isEditing={isEditing}
      $invalid={isEditing && !valueIsValid}
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
      onPointerDown={(e: React.PointerEvent) => {
        // Stop the drag surface under us from claiming this gesture so a
        // click on the value can focus/edit (especially for ranged chips).
        e.stopPropagation()
      }}
      onDoubleClick={(e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      autoFocus={propsA.autoFocus}
      style={{['--value-ch' as string]: valueCh} as React.CSSProperties}
    />
  )

  const {range} = propsA
  const isDraggingValue = frozenInputValueRef.current != null
  const num = isDraggingValue ? propsA.value : parseFloat(value)

  const percentage = range
    ? clamp((num - range[0]) / ((range[1] - range[0]) || 1), 0, 1)
    : 0

  const showChrome =
    isHot ||
    stateRef.current.mode === 'dragging' ||
    stateRef.current.mode === 'editingViaKeyboard'

  const [dragNode, setDragNode] = useState<HTMLDivElement | null>(null)
  useDrag(dragNode, {
    debugName: 'form/BasicNumberInput',
    onDragStart: callbacks.transitionToDraggingMode,
    lockCSSCursorTo: 'ew-resize',
    shouldPointerLock: !range,
    disabled: stateRef.current.mode === 'editingViaKeyboard',
  })

  return (
    <Container
      ref={containerRef}
      className={(propsA.className ?? '') + ' ' + stateRef.current.mode}
      $embedded={embedded}
      $hasRange={!!range}
      onMouseEnter={() => setIsHot(true)}
      onMouseLeave={() => setIsHot(false)}
      style={
        range
          ? ({['--percentage' as string]: percentage} as React.CSSProperties)
          : undefined
      }
    >
      {range ? <FillIndicator /> : null}
      {range ? <Hashmarks $visible={showChrome} /> : null}
      {range ? <Handle $visible={showChrome} /> : null}
      {!isEditing ? <DragSurface ref={setDragNode} /> : null}
      <Content>
        {propsA.label ? <LabelText>{propsA.label}</LabelText> : null}
        <ValueSlot>{theInput}</ValueSlot>
      </Content>
    </Container>
  )
}

function format(v: number, precision: number): string {
  return isNaN(v)
    ? 'NaN'
    : isInteger(v)
    ? v.toFixed(0)
    : roundNumberToPrecision(v, precision).toString()
}

export default BasicNumberInput
