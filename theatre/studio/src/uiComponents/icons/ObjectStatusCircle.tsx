import * as React from 'react'

/**
 * Small status circle used by outline object items.
 * Outline = matches saved state; filled = diverged from saved state.
 */
function ObjectStatusCircle(
  props: React.SVGProps<SVGSVGElement> & {
    filled?: boolean
  },
) {
  const {filled = false, ...svgProps} = props
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...svgProps}
    >
      <circle
        cx={8}
        cy={8}
        r={filled ? 3.5 : 3.25}
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.5}
      />
    </svg>
  )
}

export default ObjectStatusCircle
