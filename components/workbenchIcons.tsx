'use client'

import type { ReactNode, SVGProps } from 'react'

type WorkbenchIconProps = SVGProps<SVGSVGElement> & {
  children?: ReactNode
}

function WorkbenchIcon({ children, ...props }: WorkbenchIconProps) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

export function SampleWorkbenchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <WorkbenchIcon {...props} strokeWidth={2}>
      <path d="M4 8V6a2 2 0 0 1 2-2h2" />
      <path d="M4 16v2a2 2 0 0 0 2 2h2" />
      <path d="M16 4h2a2 2 0 0 1 2 2v2" />
      <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
      <path d="M9 12h6" />
      <path d="M12 9v6" />
    </WorkbenchIcon>
  )
}

export function ThreadsWorkbenchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <WorkbenchIcon {...props} strokeWidth={2}>
      <path d="M18.5 5.5 7 17" />
      <circle cx="19.5" cy="4.5" r="1.5" />
      <path d="M19.5 4.5c1.2-1 2.3.9.7 2.6-2.7 2.8-5.5 2.2-7.3 4.9-1.6 2.5-.8 5.2-3.3 7-1.8 1.3-4 .8-5.1-.8" />
    </WorkbenchIcon>
  )
}

export function MixWorkbenchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <WorkbenchIcon {...props} strokeWidth={2}>
      <path d="M12 3a9 9 0 1 0 9 9 3 3 0 0 0-3-3h-2.2a1.8 1.8 0 0 1-1.5-2.8A6.8 6.8 0 0 0 12 3Z" />
      <circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="17.2" cy="12.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
    </WorkbenchIcon>
  )
}

export function LibraryWorkbenchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <WorkbenchIcon {...props} strokeWidth={2}>
      <path d="M6 4h12v16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M6 9h12" />
      <path d="M9 4v16" />
    </WorkbenchIcon>
  )
}

export function ReferenceWorkbenchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <WorkbenchIcon {...props} strokeWidth={2}>
      <path d="M4 6h16v12H4z" />
      <path d="M4 14l4-4a2 2 0 0 1 2.8 0L14 17" />
      <circle cx="10" cy="10" r="1.5" />
      <path d="M18 12l-4.5-4.5a2 2 0 0 0-2.8 0L10 8.2" />
      <path d="M18 12l-3 3" />
    </WorkbenchIcon>
  )
}

export function StructureWorkbenchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <WorkbenchIcon {...props} strokeWidth={2}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 10h16" />
      <path d="M4 16h16" />
      <path d="M10 4v16" />
      <path d="M16 4v16" />
    </WorkbenchIcon>
  )
}

export function SurfaceWorkbenchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <WorkbenchIcon {...props} strokeWidth={2}>
      <path d="M5 5h14v14H5z" />
      <path d="M8 8h8" />
      <path d="M8 12h5" />
      <path d="M8 16h4" />
    </WorkbenchIcon>
  )
}

export function DeckWorkbenchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <WorkbenchIcon {...props} strokeWidth={2}>
      <rect x="4" y="5" width="14" height="13" rx="2.5" />
      <rect x="7" y="3" width="14" height="13" rx="2.5" />
      <path d="M10 8h8" />
      <path d="M10 12h5" />
    </WorkbenchIcon>
  )
}
