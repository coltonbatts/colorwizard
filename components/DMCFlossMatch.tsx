'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getThreadMatchContext } from '@/lib/dmcFloss'
import type { ThreadMatchResult } from '@/lib/dmcFloss'
import type {
  ImageValueContext,
  ValueWarning,
} from '@/lib/dmc/types'
import { formatCatalogDeltaE00 } from '@/lib/colorSemantics'
import { loadDmcCatalog } from '@/lib/dmc/catalog'
import type { DMCThread } from '@/lib/dmc/types'
import DMCSkein from './DMCSkein'

type Tab = 'match' | 'card'

interface DMCFlossMatchProps {
  rgb: { r: number; g: number; b: number }
  imageValue?: ImageValueContext | null
  valueBuffer?: unknown | null // Kept for API compatibility
  valueScaleClip?: number // Kept for API compatibility
  onColorSelect: (rgb: { r: number; g: number; b: number }) => void
}

const VISIBLE_MATCH_COUNT = 3

const HUE_BUCKET_LABELS: Record<string, string> = {
  red: 'Reds',
  'red-orange': 'Red-Oranges',
  orange: 'Oranges',
  yellow: 'Yellows',
  'yellow-green': 'Yellow-Greens',
  green: 'Greens',
  cyan: 'Cyans',
  blue: 'Blues',
  violet: 'Violets',
  magenta: 'Magentas',
  neutral: 'Neutrals',
}

const HUE_BUCKET_ORDER = [
  'red',
  'red-orange',
  'orange',
  'yellow',
  'yellow-green',
  'green',
  'cyan',
  'blue',
  'violet',
  'magenta',
  'neutral',
]

function formatThreadValueBand(oklabL: number): string {
  if (oklabL >= 0.88) return 'Very light'
  if (oklabL >= 0.74) return 'Light'
  if (oklabL >= 0.58) return 'Mid'
  if (oklabL >= 0.42) return 'Dark'
  if (oklabL >= 0.28) return 'Very dark'
  return 'Deep dark'
}

function ValueWarningsList({ warnings }: { warnings: ValueWarning[] }) {
  if (warnings.length === 0) return null
  return (
    <ul className="mt-2 space-y-1">
      {warnings.map((warning) => (
        <li
          key={warning.code}
          className={`rounded-lg border px-2.5 py-1.5 text-[10px] leading-snug ${
            warning.severity === 'caution'
              ? 'border-amber-200 bg-amber-50/50 text-amber-900 dark:border-amber-950 dark:bg-amber-950/20 dark:text-amber-300'
              : 'border-gray-200 bg-gray-50/50 text-gray-700 dark:border-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
          }`}
        >
          {warning.message}
        </li>
      ))}
    </ul>
  )
}

export default function DMCFlossMatch({
  rgb,
  imageValue,
  onColorSelect,
}: DMCFlossMatchProps) {
  const [activeTab, setActiveTab] = useState<Tab>('match')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [context, setContext] = useState<ThreadMatchResult | null>(null)

  // Full catalog loaded for Color Card
  const [catalog, setCatalog] = useState<{ threads: DMCThread[] }>({ threads: [] })

  // Scroll target for matched color in card
  const activeCardCellRef = useRef<HTMLDivElement>(null)

  // Load catalog data
  useEffect(() => {
    loadDmcCatalog().then((res) => {
      setCatalog(res)
    })
  }, [])

  // Scroll to active color on Card tab load or match change
  useEffect(() => {
    if (activeTab === 'card' && activeCardCellRef.current) {
      setTimeout(() => {
        activeCardCellRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }, 150)
    }
  }, [activeTab, context?.primary?.number])

  // Perform thread matching when RGB changes
  useEffect(() => {
    let cancelled = false
    if (!rgb) {
      setContext(null)
      return
    }

    getThreadMatchContext(rgb, { alternativeCount: 2, imageValue, topMatchCount: VISIBLE_MATCH_COUNT })
      .then((result) => {
        if (!cancelled) {
          setContext(result)
        }
      })
      .catch((error) => {
        console.error('DMC Matching Error:', error)
        if (!cancelled) setContext(null)
      })

    return () => {
      cancelled = true
    }
  }, [rgb, imageValue])

  const handleCopyCode = useCallback((e: React.MouseEvent | React.KeyboardEvent, code: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 1800)
  }, [])

  // Group catalog by hue bucket for the Color Card
  const groupedCatalog = useMemo(() => {
    const groups: Record<string, DMCThread[]> = {}
    for (const thread of catalog.threads) {
      const bucket = thread.hueBucket || 'neutral'
      if (!groups[bucket]) groups[bucket] = []
      groups[bucket].push(thread)
    }

    // Sort each bucket by lightness L (descending: light to dark)
    for (const key in groups) {
      groups[key].sort((a, b) => b.oklab.L - a.oklab.L)
    }

    return groups
  }, [catalog.threads])

  if (!context) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-gray-400">
        Loading matches...
      </div>
    )
  }

  const {
    primary,
    familyLadder,
    topMatches,
    valueWarnings,
  } = context

  const showLadder = familyLadder.length > 1

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm transition-all duration-300">
      {/* Editorial Header */}
      <header className="border-b border-gray-150 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 px-4 py-3">
        <h2 className="text-sm font-serif italic font-bold text-gray-950 dark:text-gray-100">
          D·M·C Floss Matches
        </h2>
      </header>

      {/* Heritage Subtabs */}
      <div className="flex border-b border-gray-150 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-950">
        {(['match', 'card'] as Tab[]).map((tab) => {
          const isActive = activeTab === tab
          const label = tab === 'match' ? '🔍 Matches' : '🗺️ Color Card'

          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all text-center ${
                isActive
                  ? 'border-pink-600 text-pink-600 bg-white dark:bg-gray-900/50 font-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50/50'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Tab Panels */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'match' && (
            <motion.div
              key="match"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* SWATCH VS CLOSEST MATCH ROW */}
              <div className="flex items-center justify-around gap-4 p-4 bg-gray-50/40 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-xl">
                {/* Sampled Swatch */}
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className="w-16 h-16 rounded-xl border border-black/10 dark:border-white/10 shadow-sm shrink-0 relative overflow-hidden"
                    style={{ backgroundColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent pointer-events-none" />
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1.5">
                    Sampleed
                  </span>
                  <span className="font-mono text-[9px] text-gray-400 mt-0.5 uppercase">
                    {`#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`}
                  </span>
                </div>

                <div className="text-gray-300 dark:text-gray-700 text-sm font-black select-none">➔</div>

                {/* Best Match Swatch */}
                <div className="flex flex-col items-center shrink-0">
                  <DMCSkein
                    hex={primary.hex}
                    number={primary.number}
                    name={primary.name}
                    size="lg"
                    selected={true}
                    onClick={() => onColorSelect(primary.rgb)}
                  />
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1.5">
                    Best Match
                  </span>
                </div>
              </div>

              {/* Value Warning labels */}
              <ValueWarningsList warnings={valueWarnings} />

              {/* TOP CLOSE MATCHES LIST (Vertical to avoid sidebar layout cramping) */}
              <div className="space-y-2.5">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Top 3 Matches
                </h3>
                <div className="space-y-1.5">
                  {topMatches.slice(0, 3).map((match, idx) => {
                    const isBest = idx === 0
                    return (
                      <div
                        key={match.id}
                        onClick={() => onColorSelect(match.rgb)}
                        className={`flex items-center gap-3 border rounded-xl p-2 bg-white dark:bg-gray-950 transition-all cursor-pointer ${
                          isBest
                            ? 'border-pink-200 dark:border-pink-900 bg-pink-50/10 dark:bg-pink-950/5 ring-1 ring-pink-100 dark:ring-pink-900/20'
                            : 'border-gray-200 dark:border-gray-800 hover:border-gray-350 hover:bg-gray-50/50'
                        }`}
                      >
                        {/* Compact Color Block */}
                        <div
                          className="w-9 h-9 rounded-lg border border-black/10 dark:border-white/5 shrink-0 relative overflow-hidden"
                          style={{ backgroundColor: match.hex }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent pointer-events-none" />
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1 leading-tight">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-mono text-sm font-black text-gray-900 dark:text-gray-100">
                              {match.number}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">
                              ΔE: {formatCatalogDeltaE00(match.deltaE00)}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-700 dark:text-gray-300 truncate mt-0.5">
                            {match.name}
                          </p>
                          <span className="text-[9px] text-gray-400 block mt-0.5">
                            {formatThreadValueBand(match.oklab.L)}
                          </span>
                        </div>

                        {/* Copy button */}
                        <button
                          type="button"
                          onClick={(e) => handleCopyCode(e, match.number)}
                          className="p-1.5 border border-gray-250/70 dark:border-gray-800 rounded-lg text-gray-400 hover:text-pink-600 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors shrink-0"
                          title="Copy DMC color number"
                        >
                          {copiedCode === match.number ? (
                            <span className="text-[10px] text-emerald-600 font-bold px-1">✓</span>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="10" height="10" rx="2" />
                              <rect x="5" y="5" width="10" height="10" rx="2" />
                            </svg>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* FAMILY GRADIENT LADDER */}
              {showLadder && (
                <div className="space-y-2 pt-1 border-t border-gray-150 dark:border-gray-800">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {primary.familyLabel} Family Range
                  </h3>
                  <div className="flex h-3.5 overflow-hidden rounded-md border border-gray-200 dark:border-gray-850">
                    {familyLadder.map((thread) => {
                      const isPrimary = thread.id === primary.id
                      return (
                        <button
                          key={thread.id}
                          type="button"
                          onClick={() => onColorSelect(thread.rgb)}
                          className={`min-w-0 flex-1 transition-opacity relative hover:opacity-90 ${
                            isPrimary ? 'ring-2 ring-inset ring-amber-500 scale-105 z-10' : ''
                          }`}
                          style={{ backgroundColor: thread.hex }}
                          title={`${thread.number} · ${formatThreadValueBand(thread.oklab.L)}`}
                        />
                      )
                    })}
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
                    {familyLadder.map((thread) => {
                      const isPrimary = thread.id === primary.id
                      return (
                        <button
                          key={thread.id}
                          type="button"
                          onClick={() => onColorSelect(thread.rgb)}
                          className={`flex items-center gap-1.5 shrink-0 border rounded-lg px-2 py-1 text-[10px] leading-none ${
                            isPrimary
                              ? 'border-pink-500 bg-pink-50/15 dark:bg-pink-950/10 font-bold'
                              : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:bg-gray-50'
                          }`}
                        >
                          <div className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: thread.hex }} />
                          <span className="font-mono text-gray-900 dark:text-gray-100">{thread.number}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'card' && (
            <motion.div
              key="card"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.15 }}
              className="space-y-3"
            >
              <div className="leading-tight">
                <h3 className="text-xs font-bold text-gray-950 dark:text-gray-100">DMC Thread Catalog Map</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Organized by color columns, light to dark. Sampled color glows in gold.
                </p>
              </div>

              {/* CARD COLUMN VIEWPORT */}
              <div className="flex gap-3 overflow-x-auto pb-3 pt-1 max-h-[380px] select-none border-t border-gray-150 dark:border-gray-900">
                {HUE_BUCKET_ORDER.map((bucketKey) => {
                  const threads = groupedCatalog[bucketKey] || []
                  return (
                    <div
                      key={bucketKey}
                      className="flex-shrink-0 w-22 bg-gray-50/50 dark:bg-gray-900/10 border border-gray-200 dark:border-gray-800 rounded-xl p-2 flex flex-col gap-1.5 max-h-[350px]"
                    >
                      <h4 className="text-[9px] font-bold text-center uppercase tracking-widest text-gray-400 border-b border-gray-200 dark:border-gray-800 pb-1">
                        {HUE_BUCKET_LABELS[bucketKey]}
                      </h4>
                      <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
                        {threads.map((thread) => {
                          const isMatched = thread.number === primary.number

                          return (
                            <div
                              key={thread.id}
                              ref={isMatched ? activeCardCellRef : null}
                              onClick={() => onColorSelect(thread.rgb)}
                              className={`group relative p-1 rounded-lg text-center cursor-pointer transition-all ${
                                isMatched
                                  ? 'bg-amber-100/50 dark:bg-amber-950/20 border border-amber-500 shadow-md scale-[1.02] z-10 font-bold'
                                  : 'bg-white dark:bg-gray-950 border border-gray-150 dark:border-gray-900 hover:border-gray-400 dark:hover:border-gray-700'
                              }`}
                              style={{
                                borderLeftColor: isMatched ? undefined : thread.hex,
                                borderLeftWidth: isMatched ? undefined : '3px',
                              }}
                              title={`${thread.number}: ${thread.name}`}
                            >
                              <span className="font-mono text-[9px] font-black text-gray-900 dark:text-gray-100 block text-left">
                                {thread.number}
                              </span>
                              <span className="text-[7px] text-gray-400 truncate block text-left">
                                {thread.name}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
