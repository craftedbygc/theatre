import React, {useCallback} from 'react'
import styled from 'styled-components'

const Container = styled.div`
  display: inline-flex;
  align-items: stretch;
  height: 28px;
  min-width: 92px;
  padding: 2px;
  box-sizing: border-box;
  border-radius: var(--studio-radius-sm, 6px);
  background: transparent;
  position: relative;
  user-select: none;
`

const Thumb = styled.div<{
  $on: boolean
}>`
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: 2px;
  width: calc(50% - 2px);
  border-radius: calc(var(--studio-radius-sm, 6px) - 1px);
  background: var(--studio-surface-active);
  transform: translateX(${(p) => (p.$on ? '100%' : '0%')});
  transition: transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1);
  pointer-events: none;
`

const Option = styled.button<{
  $active: boolean
}>`
  appearance: none;
  border: none;
  background: transparent;
  flex: 1 1 50%;
  position: relative;
  z-index: 1;
  padding: 0 8px;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  color: ${(p) =>
    p.$active ? 'var(--studio-text-focus)' : 'var(--studio-text-muted)'};
  cursor: pointer;
  border-radius: calc(var(--studio-radius-sm, 6px) - 1px);

  &:focus-visible {
    outline: 1px solid var(--studio-focus-ring);
    outline-offset: -1px;
  }
`

export default function BasicToggle({
  value,
  onChange,
  autoFocus,
  className,
}: {
  value: boolean
  onChange: (value: boolean) => void
  autoFocus?: boolean
  className?: string
}) {
  const setOff = useCallback(() => onChange(false), [onChange])
  const setOn = useCallback(() => onChange(true), [onChange])

  return (
    <Container className={className} role="radiogroup" aria-label="Toggle">
      <Thumb $on={value} />
      <Option
        type="button"
        role="radio"
        aria-checked={!value}
        $active={!value}
        onClick={setOff}
        autoFocus={autoFocus && !value}
      >
        Off
      </Option>
      <Option
        type="button"
        role="radio"
        aria-checked={value}
        $active={value}
        onClick={setOn}
        autoFocus={autoFocus && value}
      >
        On
      </Option>
    </Container>
  )
}
