import * as React from 'react'

function JumpToStart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M3.5 3.25h1.5v9.5H3.5V3.25zm9 0L6.75 8 12.5 12.75V3.25z"
        fill="currentColor"
      />
    </svg>
  )
}

export default JumpToStart
