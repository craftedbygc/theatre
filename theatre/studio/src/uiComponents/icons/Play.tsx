import * as React from 'react'

function Play(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M5 3.25v9.5L13 8 5 3.25z" fill="currentColor" />
    </svg>
  )
}

export default Play
