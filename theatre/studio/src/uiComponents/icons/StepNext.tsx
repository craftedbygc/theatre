import * as React from 'react'

function StepNext(props: React.SVGProps<SVGSVGElement>) {
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
        d="M3.5 3.25h1.5v9.5H3.5V3.25zM6.75 3.25L12.5 8 6.75 12.75V3.25z"
        fill="currentColor"
      />
    </svg>
  )
}

export default StepNext
