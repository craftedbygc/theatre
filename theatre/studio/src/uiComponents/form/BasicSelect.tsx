import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import ReactDOM from 'react-dom'
import styled from 'styled-components'
import {CgSelect} from 'react-icons/all'
import {PortalContext} from 'reakit'

const Container = styled.div`
  width: 100%;
  position: relative;
  height: 100%;
  min-height: 28px;
  display: flex;
  align-items: center;
`

const Trigger = styled.button`
  appearance: none;
  background: transparent;
  border: none;
  box-sizing: border-box;
  color: var(--studio-text-value);
  padding: 0 28px 0 10px;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  outline: none;
  text-align: right;
  width: 100%;
  height: 100%;
  min-height: 28px;
  border-radius: var(--studio-radius, 8px);
  cursor: pointer;
  position: relative;

  &:hover,
  &[data-open='true'] {
    background: transparent;
  }

  &:focus-visible {
    background-image: linear-gradient(
      var(--studio-focus-ring),
      var(--studio-focus-ring)
    );
    background-size: calc(100% - 38px) 1px;
    background-position: left 10px bottom 0;
    background-repeat: no-repeat;
  }
`

const IconContainer = styled.div`
  position: absolute;
  right: 8px;
  top: 0;
  bottom: 0;
  width: 1em;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--studio-text-muted);
  pointer-events: none;
`

const Menu = styled.div`
  position: fixed;
  z-index: 10000;
  min-width: 120px;
  max-height: 240px;
  overflow: auto;
  padding: 4px;
  box-sizing: border-box;
  border-radius: var(--studio-radius, 8px);
  background: var(--studio-dropdown-bg);
  border: 1px solid var(--studio-border);
  box-shadow: var(--studio-shadow-dropdown);
  backdrop-filter: blur(12px);
`

const OptionButton = styled.button<{
  $active: boolean
  $highlighted: boolean
}>`
  appearance: none;
  border: none;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 32px;
  padding: 0 10px;
  box-sizing: border-box;
  border-radius: var(--studio-radius-sm, 6px);
  background: ${(p) =>
    p.$highlighted || p.$active
      ? 'var(--studio-surface-active)'
      : 'transparent'};
  color: ${(p) =>
    p.$active ? 'var(--studio-text-focus)' : 'var(--studio-text-value)'};
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: var(--studio-surface-hover);
  }
`

const MENU_ATTR = 'data-basic-select-menu'

function isInsideSelectUi(
  event: MouseEvent,
  trigger: Element | null,
): boolean {
  const path = event.composedPath()
  if (trigger && path.includes(trigger)) return true
  return path.some(
    (node) =>
      node instanceof Element && node.hasAttribute(MENU_ATTR),
  )
}

function BasicSelect<TLiteralOptions extends string>({
  value,
  onChange,
  options,
  className,
  autoFocus,
}: {
  value: TLiteralOptions
  onChange: (val: TLiteralOptions) => void
  options: Record<TLiteralOptions, string>
  className?: string
  autoFocus?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({top: 0, left: 0, width: 0})
  const keys = useMemo(
    () => Object.keys(options) as TLiteralOptions[],
    [options],
  )
  const [highlightIndex, setHighlightIndex] = useState(() =>
    Math.max(0, keys.indexOf(value)),
  )

  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  // Ignore the click that follows a menu selection (it can land on the trigger).
  const suppressTriggerClickRef = useRef(false)
  const portalLayer = useContext(PortalContext)

  const syncMenuPosition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 140),
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    syncMenuPosition()
    const onReposition = () => syncMenuPosition()
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, syncMenuPosition])

  useEffect(() => {
    if (!open) return
    setHighlightIndex(Math.max(0, keys.indexOf(value)))
  }, [open, keys, value])

  // Close on outside pointerdown. Use data-attribute matching so we do not
  // depend on a menu element ref that may still be null on the first paint.
  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: MouseEvent) => {
      if (!isInsideSelectUi(e, triggerRef.current)) {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [open])

  const selectValue = useCallback(
    (next: TLiteralOptions) => {
      suppressTriggerClickRef.current = true
      onChange(next)
      setOpen(false)
      // Focus after the closing click has settled so we do not re-toggle open.
      requestAnimationFrame(() => {
        triggerRef.current?.focus()
        // Clear after the synthetic click window.
        window.setTimeout(() => {
          suppressTriggerClickRef.current = false
        }, 0)
      })
    },
    [onChange],
  )

  const onTriggerClick = (e: React.MouseEvent) => {
    if (suppressTriggerClickRef.current) {
      e.preventDefault()
      e.stopPropagation()
      suppressTriggerClickRef.current = false
      return
    }
    setOpen((v) => !v)
  }

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.key === 'Enter' ||
      e.key === ' ' ||
      e.key === 'ArrowDown' ||
      e.key === 'ArrowUp'
    ) {
      e.preventDefault()
      setOpen(true)
    }
  }

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => (i + 1) % keys.length)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => (i - 1 + keys.length) % keys.length)
      return
    }
    if (e.key === 'Home') {
      e.preventDefault()
      setHighlightIndex(0)
      return
    }
    if (e.key === 'End') {
      e.preventDefault()
      setHighlightIndex(keys.length - 1)
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const key = keys[highlightIndex]
      if (key != null) selectValue(key)
      return
    }

    // Typeahead: jump to first option whose label starts with the typed char
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const ch = e.key.toLowerCase()
      const idx = keys.findIndex((k) =>
        options[k].toLowerCase().startsWith(ch),
      )
      if (idx >= 0) setHighlightIndex(idx)
    }
  }

  const onOptionPointerDown = (
    e: React.PointerEvent,
    key: TLiteralOptions,
  ) => {
    // Handle in pointerdown (capture-friendly) so the value commits before any
    // close/toggle logic from the falling click can run.
    e.preventDefault()
    e.stopPropagation()
    selectValue(key)
  }

  const menu =
    open && portalLayer
      ? ReactDOM.createPortal(
          <Menu
            ref={menuRef}
            {...{[MENU_ATTR]: ''}}
            role="listbox"
            tabIndex={-1}
            style={{
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
            }}
            onKeyDown={onMenuKeyDown}
          >
            {keys.map((key, i) => (
              <OptionButton
                key={key}
                type="button"
                role="option"
                aria-selected={value === key}
                data-basic-select-option={key}
                $active={value === key}
                $highlighted={highlightIndex === i}
                onMouseEnter={() => setHighlightIndex(i)}
                onPointerDown={(e) => onOptionPointerDown(e, key)}
              >
                {options[key]}
              </OptionButton>
            ))}
          </Menu>,
          portalLayer,
        )
      : null

  useEffect(() => {
    if (open && menuRef.current) {
      menuRef.current.focus()
    }
  }, [open])

  return (
    <Container className={className}>
      <Trigger
        ref={triggerRef}
        type="button"
        data-open={open}
        aria-haspopup="listbox"
        aria-expanded={open}
        autoFocus={autoFocus}
        onClick={onTriggerClick}
        onKeyDown={onTriggerKeyDown}
      >
        {options[value]}
      </Trigger>
      <IconContainer>
        <CgSelect />
      </IconContainer>
      {menu}
    </Container>
  )
}

export default BasicSelect
