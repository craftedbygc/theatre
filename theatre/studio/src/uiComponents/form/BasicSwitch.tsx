import React, {useCallback} from 'react'
import styled from 'styled-components'

const Container = styled.form`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  justify-content: stretch;
  height: 28px;
  width: 100%;
  padding: 2px;
  box-sizing: border-box;
  border-radius: var(--studio-radius-sm, 6px);
  background: rgba(0, 0, 0, 0.25);
  position: relative;
  gap: 0;
`

const Label = styled.label`
  padding: 0 0.6em;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  color: var(--studio-text-muted);
  box-sizing: border-box;
  border-radius: calc(var(--studio-radius-sm, 6px) - 2px);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  z-index: 1;
  transition: color 120ms ease, background 120ms ease;

  ${Container}:hover > & {
    color: var(--studio-text-label);
  }

  &&:hover {
    background: var(--studio-surface-hover);
  }

  &&[data-checked='true'] {
    color: var(--studio-text-focus);
    background: var(--studio-surface-active);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }
`

const Input = styled.input`
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 0;
  height: 0;
`

function BasicSwitch<TLiteralOptions extends string>({
  value,
  onChange,
  options,
  autoFocus,
}: {
  value: TLiteralOptions
  onChange: (val: TLiteralOptions) => void
  options: Record<TLiteralOptions, string>
  autoFocus?: boolean
}) {
  const _onChange = useCallback(
    (el: React.ChangeEvent<HTMLInputElement>) => {
      onChange(String(el.target.value) as TLiteralOptions)
    },
    [onChange],
  )
  return (
    <Container role="radiogroup">
      {Object.keys(options).map((key, i) => (
        <Label key={'label-' + i} data-checked={value === key}>
          {options[key as TLiteralOptions]}
          <Input
            type="radio"
            checked={value === key}
            value={key}
            onChange={_onChange}
            name="switchbox"
            autoFocus={autoFocus}
          />
        </Label>
      ))}
    </Container>
  )
}

export default BasicSwitch
