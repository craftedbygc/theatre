import React from 'react'
import styled from 'styled-components'

/** Tip-to-tip size of the filled/outline diamond in the shared viewBox. */
const INNER_DIAMOND = 'M4 1L7 4L4 7L1 4Z'
/** Larger outline when live value has diverged from saved state (~9.5px tip-to-tip). */
const OUTER_DIAMOND = 'M4 -0.75L8.75 4L4 8.75L-0.75 4Z'

const Svg = styled.svg`
  display: block;
  flex-shrink: 0;
  overflow: visible;
`

const Stack = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
`

const OuterLayer = styled(Svg)`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
`

/** 8×8 diamond used by static / default value indicators. */
export const StaticDiamondSvg: React.FC<{
  variant: 'filled' | 'outline'
  title?: string
}> = ({variant, title}) => (
  <Svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden={!title}>
    {title ? <title>{title}</title> : null}
    <path
      d={INNER_DIAMOND}
      fill={variant === 'filled' ? 'currentColor' : 'none'}
      stroke={variant === 'outline' ? 'currentColor' : 'none'}
      strokeWidth={variant === 'outline' ? 1 : 0}
    />
  </Svg>
)

/**
 * Sequenced keyframe diamond in the legacy 8×12 slot so it lines up with the
 * prev/next chevrons (content optically centered at y=7).
 *
 * Outer outline is a sibling layer so idle dimming on the inner does not fade it.
 */
export const SequencedDiamondSvg: React.FC<{
  showOuter?: boolean
}> = ({showOuter = false}) => (
  <Stack>
    {showOuter ? (
      <OuterLayer width="8" height="12" viewBox="0 0 8 12" fill="none">
        <path
          d={OUTER_DIAMOND}
          transform="translate(0 3)"
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth={1}
          fill="none"
        />
      </OuterLayer>
    ) : null}
    <Svg
      width="8"
      height="12"
      viewBox="0 0 8 12"
      fill="none"
      data-diamond-inner
    >
      <path d={INNER_DIAMOND} transform="translate(0 3)" fill="currentColor" />
    </Svg>
  </Stack>
)

/** Outer + inner pair for static indicators that have diverged from saved state. */
export const StaticDiamondWithOuterSvg: React.FC<{
  variant: 'filled' | 'outline'
  title?: string
}> = ({variant, title}) => (
  <Stack>
    <OuterLayer width="8" height="8" viewBox="0 0 8 8" fill="none">
      <path
        d={OUTER_DIAMOND}
        stroke="rgba(255, 255, 255, 0.35)"
        strokeWidth={1}
        fill="none"
      />
    </OuterLayer>
    <Svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      fill="none"
      aria-hidden={!title}
    >
      {title ? <title>{title}</title> : null}
      <path
        d={INNER_DIAMOND}
        fill={variant === 'filled' ? 'currentColor' : 'none'}
        stroke={variant === 'outline' ? 'currentColor' : 'none'}
        strokeWidth={variant === 'outline' ? 1 : 0}
      />
    </Svg>
  </Stack>
)

export const ChevronPrevSvg: React.FC = () => (
  <Svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <g transform="translate(6 3)">
      <path d="M4 1L1 4L4 7" stroke="currentColor" />
    </g>
  </Svg>
)

export const ChevronNextSvg: React.FC = () => (
  <Svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <g transform="translate(1 3)">
      <path d="M1 1L4 4L1 7" stroke="currentColor" />
    </g>
  </Svg>
)
