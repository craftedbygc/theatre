import {lighten, saturate} from 'polished'
import React from 'react'
import styled from 'styled-components'
import {mergeRefs} from 'react-merge-refs'
import {DOT_SIZE_PX} from '@unseenco/theatre-studio/panels/SequenceEditorPanel/DopeSheet/Right/BasicKeyframedTrack/KeyframeEditor/SingleKeyframeDot'
import useTooltip from '@unseenco/theatre-studio/uiComponents/Popover/useTooltip'
import MinimalTooltip from '@unseenco/theatre-studio/uiComponents/Popover/MinimalTooltip'

const CONNECTOR_HEIGHT = DOT_SIZE_PX / 2 + 1
const CONNECTOR_HEIGHT_WITH_LABEL = DOT_SIZE_PX + 2
const CONNECTOR_WIDTH_UNSCALED = 1000

export type IConnectorThemeValues = {
  isPopoverOpen: boolean
  isSelected: boolean
  hasTweenLabel: boolean
}

export const CONNECTOR_THEME = {
  normalColor: `#365b59`, // (greenish-blueish)ish
  selectedColor: `#8A7842`,
  barColor: (values: IConnectorThemeValues) => {
    const base = values.isSelected
      ? CONNECTOR_THEME.selectedColor
      : CONNECTOR_THEME.normalColor
    return values.isPopoverOpen ? saturate(0.2, lighten(0.2, base)) : base
  },
  hoverColor: (values: IConnectorThemeValues) => {
    const base = values.isSelected
      ? CONNECTOR_THEME.selectedColor
      : CONNECTOR_THEME.normalColor
    return values.isPopoverOpen
      ? saturate(0.2, lighten(0.2, base))
      : saturate(0.1, lighten(0.1, base))
  },
}

const Container = styled.div<IConnectorThemeValues>`
  position: absolute;
  background: ${CONNECTOR_THEME.barColor};
  height: ${(props) =>
    props.hasTweenLabel ? CONNECTOR_HEIGHT_WITH_LABEL : CONNECTOR_HEIGHT}px;
  width: ${CONNECTOR_WIDTH_UNSCALED}px;

  left: 0;
  top: ${(props) =>
    props.hasTweenLabel
      ? -(CONNECTOR_HEIGHT_WITH_LABEL / 2)
      : -(CONNECTOR_HEIGHT / 2)}px;
  transform-origin: top left;
  z-index: 0;
  cursor: ew-resize;

  &:after {
    display: block;
    position: absolute;
    content: ' ';
    top: -4px;
    bottom: -4px;
    left: 0;
    right: 0;
  }

  &:hover {
    background: ${CONNECTOR_THEME.hoverColor};
  }
`

const Label = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  width: ${CONNECTOR_WIDTH_UNSCALED}px;
  height: 100%;
  transform: scaleX(calc(1 / var(--connectorScaleX)));
  transform-origin: top left;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  box-sizing: border-box;
  pointer-events: none;
  color: rgba(255, 255, 255, 0.85);
  font-size: 10px;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

type IConnectorLineProps = React.PropsWithChildren<{
  isPopoverOpen: boolean
  openPopover?: (event: React.MouseEvent) => void
  isSelected: boolean
  connectorLengthInUnitSpace: number
  tweenLabel?: string
}>

export const ConnectorLine = React.forwardRef<
  HTMLDivElement,
  IConnectorLineProps
>((props, ref) => {
  const hasTweenLabel = !!props.tweenLabel
  const connectorScale =
    props.connectorLengthInUnitSpace / CONNECTOR_WIDTH_UNSCALED

  const themeValues: IConnectorThemeValues = {
    isPopoverOpen: props.isPopoverOpen,
    isSelected: props.isSelected,
    hasTweenLabel,
  }

  const [tooltipNode, tooltipTargetRef] = useTooltip(
    {enabled: hasTweenLabel, enterDelay: 300},
    () => <MinimalTooltip>{props.tweenLabel}</MinimalTooltip>,
  )

  return (
    <>
      <Container
        {...themeValues}
        ref={mergeRefs([ref, tooltipTargetRef])}
        style={{
          // Previously we used scale3d, which had weird fuzzy rendering look in both FF & Chrome
          transform: `scaleX(calc(var(--unitSpaceToScaledSpaceMultiplier) * ${connectorScale}))`,
          // @ts-expect-error CSS custom property
          '--connectorScaleX': `calc(var(--unitSpaceToScaledSpaceMultiplier) * ${connectorScale})`,
        }}
        onClick={(e) => {
          props.openPopover?.(e)
        }}
      >
        {hasTweenLabel ? <Label>{props.tweenLabel}</Label> : undefined}
        {props.children}
      </Container>
      {tooltipNode}
    </>
  )
})
