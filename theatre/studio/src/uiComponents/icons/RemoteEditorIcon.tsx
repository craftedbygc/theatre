import * as React from 'react'

function RemoteEditorIcon(props: React.SVGProps<SVGSVGElement>) {
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
        d="M7 3H3.5C3.22386 3 3 3.22386 3 3.5V12.5C3 12.7761 3.22386 13 3.5 13H12.5C12.7761 13 13 12.7761 13 12.5V9"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 3H13V6.5"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 3L7.5 8.5"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default RemoteEditorIcon
