import * as React from 'react'

function DockLayout(props: React.SVGProps<SVGSVGElement>) {
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
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.5 2.5a.5.5 0 01.5-.5h12a.5.5 0 01.5.5v11a.5.5 0 01-.5.5H2a.5.5 0 01-.5-.5v-11zm1 1v1.5h10V3.5H2.5zm0 2.5v5.5h2.5V6H2.5zm3.5 0v5.5h4.5V6H6zm6 0v5.5H13.5V6H12z"
        fill="currentColor"
      />
    </svg>
  )
}

export default DockLayout
