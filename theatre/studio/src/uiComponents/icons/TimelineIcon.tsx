import * as React from 'react'

function TimelineIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Playhead vertical line */}
      <rect x="4" y="1" width="1" height="14" rx="0.5" fill="currentColor" />
      {/* Timeline track rows */}
      <rect x="6" y="3" width="8" height="1.5" rx="0.75" fill="currentColor" />
      <rect
        x="6"
        y="7.25"
        width="5.5"
        height="1.5"
        rx="0.75"
        fill="currentColor"
      />
      <rect
        x="6"
        y="11.5"
        width="7"
        height="1.5"
        rx="0.75"
        fill="currentColor"
      />
    </svg>
  )
}

export default TimelineIcon
