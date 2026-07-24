'use client'

import { motion } from 'framer-motion'

export interface CanvasHUDProps {
  /** Whether value overlay is enabled */
  valueOverlayEnabled?: boolean
  /** Whether split view is enabled */
  splitViewEnabled?: boolean
  /** Whether grid is enabled */
  gridEnabled?: boolean
  /** Current zoom level */
  zoomLevel?: number
  /** Live sampled color hex */
  liveColorHex?: string | null
  /** Live paint mix result hex */
  livePaintMixHex?: string | null
  /** Delta E of live paint mix */
  livePaintMixError?: number | null
  /** Whether measurement mode is enabled */
  measureEnabled?: boolean
  /** Current workspace label */
  workspaceModeLabel?: string
  /** Whether fine gesture (pan/zoom) is currently active */
  isGesturing?: boolean
}

export default function CanvasHUD({
  valueOverlayEnabled = false,
  splitViewEnabled = false,
  gridEnabled = false,
  zoomLevel = 1,
  liveColorHex = null,
  livePaintMixHex = null,
  livePaintMixError = null,
  measureEnabled = false,
  workspaceModeLabel = 'Sample',
  isGesturing = false,
}: CanvasHUDProps) {
  const formattedModeLabel = workspaceModeLabel
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

  const activeModes = [
    { label: 'Value', active: valueOverlayEnabled, tone: 'signal' },
    { label: 'Split', active: splitViewEnabled, tone: 'subsignal' },
    { label: 'Grid', active: gridEnabled, tone: 'subsignal' },
    { label: 'Measure', active: measureEnabled, tone: 'signal' },
  ].filter((mode) => mode.active)

  return (
    <div className="absolute top-4 left-4 z-20 pointer-events-none max-w-[20rem]">
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: isGesturing ? 0.35 : 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-ink-hairline bg-paper-elevated/95 p-3 shadow-md backdrop-blur-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-serif text-xs font-semibold text-ink">
              {formattedModeLabel}
            </span>
            <span
              className="font-mono text-[11px] font-medium text-ink-muted tabular-nums"
              title="Zoom level"
            >
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>

          {activeModes.length > 0 && (
            <div className="flex items-center gap-1">
              {activeModes.map((mode) => (
                <span
                  key={mode.label}
                  className={`rounded-md border border-ink-hairline px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em] ${
                    mode.tone === 'signal'
                      ? 'bg-signal-muted text-signal border-signal/20'
                      : 'bg-paper-recessed text-ink'
                  }`}
                >
                  {mode.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {liveColorHex && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2.5 flex items-center justify-between border-t border-ink-hairline pt-2"
          >
            <div className="flex items-center gap-2">
              <motion.div
                layoutId="live-color-swatch"
                className="h-5 w-5 rounded-md border border-ink-hairline shadow-sm"
                style={{ backgroundColor: liveColorHex }}
              />
              <span className="font-mono text-xs font-bold text-ink tabular-nums">
                {liveColorHex.toUpperCase()}
              </span>
            </div>

            {livePaintMixHex && (
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-secondary">
                <motion.div
                  layoutId="paint-mix-swatch"
                  className="h-4 w-4 rounded-md border border-ink-hairline"
                  style={{ backgroundColor: livePaintMixHex }}
                />
                <span className="tabular-nums">
                  dE {livePaintMixError !== null ? livePaintMixError.toFixed(1) : '-'}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

