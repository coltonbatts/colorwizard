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
      <div className="flex items-center justify-between gap-4 border-b border-ink-hairline px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-tight text-ink">{title}</h2>
          <span className="mt-1 block text-sm leading-relaxed text-ink-muted" title={subtitle}>
            {subtitle}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {sampledColorHex && (
            <div className="flex items-center gap-1.5" title={`Sampled ${sampledColorHex}`}>
              <span
                className="h-4 w-4 rounded-sm border border-ink-hairline"
                style={{ backgroundColor: sampledColorHex }}
              />
              <span className="font-mono text-sm text-ink-secondary">
                {sampledColorHex.toUpperCase()}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-paper-recessed hover:text-ink"
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
