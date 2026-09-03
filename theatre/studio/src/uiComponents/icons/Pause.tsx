import * as React from 'react'

function Pause(props: React.SVGProps<SVGSVGElement>) {
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
        d="M4.5 3h2.25v10H4.5V3zm4.75 0H11.5v10H9.25V3z"
        fill="currentColor"
      />
    </svg>
  )
}

export default Pause
