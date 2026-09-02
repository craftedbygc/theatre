import * as React from 'react'

type DockLayoutProps = {
  docked?: boolean
}

function DockLayout({docked = false}: DockLayoutProps) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {docked ? (
        <>
          <rect
            x="2.5"
            y="7.5"
            width="7.5"
            height="5"
            rx="1"
            stroke="currentColor"
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
          <rect
            x="5.5"
            y="2.5"
            width="8"
            height="5.5"
            rx="1"
            stroke="currentColor"
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <rect
            x="2.5"
            y="2.5"
            width="11"
            height="11"
            rx="1"
            stroke="currentColor"
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
          <rect
            x="4"
            y="10"
            width="8"
            height="2.5"
            rx="0.5"
            fill="currentColor"
          />
        </>
      )}
    </svg>
  )
}

export default DockLayout
