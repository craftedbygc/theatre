import * as React from 'react'

function Close(props: React.SVGProps<SVGSVGElement>) {
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
        d="M4.146 4.146a.5.5 0 01.708 0L8 7.293l3.146-3.147a.5.5 0 01.708.708L8.707 8l3.147 3.146a.5.5 0 01-.708.708L8 8.707l-3.146 3.147a.5.5 0 01-.708-.708L7.293 8 4.146 4.854a.5.5 0 010-.708z"
        fill="currentColor"
      />
    </svg>
  )
}

export default Close
