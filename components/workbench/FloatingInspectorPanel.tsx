'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface FloatingInspectorPanelProps {
  title: string
  subtitle: string
  sampledColorHex?: string | null
  onClose: () => void
  children: ReactNode
}

const panelMotion = {
  initial: { opacity: 0, x: 28, scale: 0.985 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 36, scale: 0.985 },
  transition: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
    mass: 0.92,
  },
} as const

export default function FloatingInspectorPanel({
  title,
  subtitle,
  sampledColorHex,
  onClose,
  children,
}: FloatingInspectorPanelProps) {
  return (
    <motion.aside
      {...panelMotion}
      className="workbench-floating-panel flex h-full w-[min(30rem,34vw)] min-w-[22rem] flex-col overflow-hidden"
    >
      <div className="flex items-start justify-between gap-4 border-b border-ink-hairline px-5 py-4">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-ink-faint">
            {subtitle}
          </div>
          <h2 className="mt-2 truncate font-display text-[2rem] leading-none tracking-[-0.04em] text-ink">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {sampledColorHex && (
            <div className="inline-flex items-center gap-2 rounded-full border border-ink-hairline bg-[rgba(255,252,247,0.8)] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.66)]">
              <div
                className="h-3.5 w-3.5 rounded-full border border-black/10"
                style={{ backgroundColor: sampledColorHex }}
              />
              <div className="font-mono text-[11px] font-bold uppercase tracking-[0.04em] text-ink">
                {sampledColorHex}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink-hairline bg-[rgba(255,252,247,0.8)] text-ink-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.66)] transition-[background-color,color,transform] duration-200 hover:bg-paper hover:text-ink"
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
