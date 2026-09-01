import React, {useRef} from 'react'
import styled from 'styled-components'
import {pointerEventsAutoInNormalMode} from '@unseenco/theatre-studio/css'
import type {
  ToolConfigFlyoutMenu,
  ToolconfigFlyoutMenuItem,
} from '@unseenco/theatre-studio/TheatreStudio'
import ToolbarIconButton from '@unseenco/theatre-studio/uiComponents/toolbar/ToolbarIconButton'
import BaseMenu from '@unseenco/theatre-studio/uiComponents/simpleContextMenu/ContextMenu/BaseMenu'
import usePopover from '@unseenco/theatre-studio/uiComponents/Popover/usePopover'
import type {$IntentionalAny} from '@unseenco/theatre-shared/utils/types'

const FlyoutTriggerButton = styled(ToolbarIconButton)`
  ${pointerEventsAutoInNormalMode};
  min-width: 32px;
  width: auto;
  padding: 0 8px;
  font-size: 11px;

  & > svg {
    width: 1em;
    height: 1em;
    pointer-events: none;
  }
`

const ExtensionFlyoutMenu: React.FC<{
  config: ToolConfigFlyoutMenu
}> = ({config}) => {
  const triggerRef = useRef<null | HTMLElement>(null)

  const popover = usePopover(
    () => {
      const triggerBounds = triggerRef.current!.getBoundingClientRect()
      return {
        debugName: 'ExtensionFlyoutMenu:' + config.label,

        constraints: {
          maxX: triggerBounds.right,
          maxY: 8,
          minX: triggerBounds.left,
          minY: 8,
        },
        verticalGap: 2,
      }
    },
    () => {
      return (
        <BaseMenu
          items={config.items.map(
            (option: ToolconfigFlyoutMenuItem, index: number) => ({
              label: option.label,
              callback: () => {
                // this is a user-defined function, so we need to wrap it in a try/catch
                try {
                  option.onClick?.()
                } catch (e) {
                  console.error(e)
                }
              },
            }),
          )}
          onRequestClose={() => {
            popover.close('clicked')
          }}
        />
      )
    },
  )

  return (
    <>
      {popover.node}
      <FlyoutTriggerButton
        ref={triggerRef as $IntentionalAny}
        data-testid={config['data-testid']}
        title={config.title}
        onClick={(e) => {
          popover.open(e, triggerRef.current!)
        }}
      >
        {config.label}
      </FlyoutTriggerButton>
    </>
  )
}

export default ExtensionFlyoutMenu
