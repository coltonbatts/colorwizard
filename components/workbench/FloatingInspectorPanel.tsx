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
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15, ease: 'easeOut' },
} as const

export default function FloatingInspectorPanel({
  title,
  subtitle,
  sampledColorHex,
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
      <div className="flex items-center justify-between gap-3 border-b border-ink-hairline px-4 py-3">
        <div className="flex min-w-0 items-baseline gap-3">
          <h2 className="truncate text-sm font-medium text-ink">{title}</h2>
          <span className="hidden truncate text-[11px] text-ink-muted lg:inline" title={subtitle}>
            {subtitle}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {sampledColorHex && (
            <div className="flex items-center gap-1.5" title={`Sampled ${sampledColorHex}`}>
              <span
                className="h-3.5 w-3.5 rounded-sm border border-ink-hairline"
                style={{ backgroundColor: sampledColorHex }}
              />
              <span className="font-mono text-[11px] text-ink-secondary">
                {sampledColorHex.toUpperCase()}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-paper-recessed hover:text-ink"
            aria-label="Close panel"
            title="Return to sample"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
