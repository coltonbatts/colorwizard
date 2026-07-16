'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface FloatingInspectorPanelProps {
  title: string
  subtitle: string
  sampledColorHex?: string | null
  onClose: () => void
  layoutMode?: 'wide' | 'medium' | 'narrow'
  children: ReactNode
}

const panelMotion = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 12 },
  transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
} as const

export default function FloatingInspectorPanel({
  title,
  onClose,
  layoutMode = 'wide',
  children,
}: FloatingInspectorPanelProps) {
  return (
    <motion.aside
      {...panelMotion}
      className="workbench-floating-panel flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden"
      data-layout={layoutMode}
    >
      <div className="workbench-inspector-heading flex items-center justify-between gap-4 border-b border-ink-hairline px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-tight text-ink">{title}</h2>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-paper-recessed hover:text-ink"
            aria-label="Close panel"
            title="Return to sample"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
    </motion.aside>
  )
}
