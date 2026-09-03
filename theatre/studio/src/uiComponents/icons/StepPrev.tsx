import * as React from 'react'

function StepPrev(props: React.SVGProps<SVGSVGElement>) {
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
        d="M9.25 3.25L3.5 8 9.25 12.75V3.25zM11 3.25h1.5v9.5H11V3.25z"
        fill="currentColor"
      />
    </svg>
  )
}

export default StepPrev
