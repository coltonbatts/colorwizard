'use client'

import { useSessionStore } from '@/lib/store/useSessionStore'

export default function HighlightControls() {
  const activeHighlightColor = useSessionStore(state => state.activeHighlightColor)
  const setActiveHighlightColor = useSessionStore(state => state.setActiveHighlightColor)
  const highlightTolerance = useSessionStore(state => state.highlightTolerance)
  const setHighlightTolerance = useSessionStore(state => state.setHighlightTolerance)
  const highlightMode = useSessionStore(state => state.highlightMode)
  const setHighlightMode = useSessionStore(state => state.setHighlightMode)

  if (!activeHighlightColor) return null

  return (
    <div className="glass-panel-elevated flex w-full max-w-[22rem] flex-col gap-3 rounded-[20px] p-3 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="h-9 w-9 shrink-0 rounded-xl border border-black/10 shadow-inner"
            style={{
              backgroundColor: `rgb(${activeHighlightColor.r}, ${activeHighlightColor.g}, ${activeHighlightColor.b})`,
            }}
          />
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">
              Highlight
            </div>
            <div className="truncate font-mono text-sm font-bold text-ink">
              tolerance {highlightTolerance}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveHighlightColor(null)}
          className="inline-flex h-9 items-center justify-center rounded-full border border-ink-hairline bg-paper px-3 text-[10px] font-black uppercase tracking-[0.14em] text-ink-secondary transition-colors hover:bg-paper-recessed hover:text-signal"
        >
          Clear
        </button>
      </div>

      <div className="flex items-center gap-1 rounded-full border border-ink-hairline bg-paper px-1 py-1">
        <button
          type="button"
          onClick={() => setHighlightMode('solid')}
          className={`flex-1 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-colors ${
            highlightMode === 'solid'
              ? 'bg-signal text-white'
              : 'text-ink-secondary hover:bg-paper-recessed hover:text-ink'
          }`}
        >
          Solid
        </button>
        <button
          type="button"
          onClick={() => setHighlightMode('heatmap')}
          className={`flex-1 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-colors ${
            highlightMode === 'heatmap'
              ? 'bg-subsignal text-white'
              : 'text-ink-secondary hover:bg-paper-recessed hover:text-ink'
          }`}
        >
          Heatmap
        </button>
      </div>

      <div className="rounded-2xl border border-ink-hairline bg-paper px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">
            Match Window
          </span>
          <span className="font-mono text-sm font-bold text-ink">{highlightTolerance}</span>
        </div>
        <input
          type="range"
          min="1"
          max="60"
          value={highlightTolerance}
          onChange={(e) => setHighlightTolerance(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-paper-recessed accent-[var(--signal)]"
        />
      </div>
    </div>
  )
}
