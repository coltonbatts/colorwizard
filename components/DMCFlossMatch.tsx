'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getThreadMatchContext } from '@/lib/dmcFloss'
import type { ThreadMatchResult } from '@/lib/dmcFloss'
import type {
  ImageValueContext,
  RenderingSetRole,
  ScoredDMCThread,
  ValueWarning,
} from '@/lib/dmc/types'
import { formatCatalogDeltaE00, PICKED_COLOR_DISCLAIMER, VALUE_ANALYSIS_NOTE } from '@/lib/colorSemantics'
import { computeValueScale, getStepIndex, stepToGray } from '@/lib/valueScale'
import type { ValueBuffer } from '@/hooks/useImageAnalyzer'
import { useDmcStore } from '@/lib/store/useDmcStore'
import { loadDmcCatalog } from '@/lib/dmc/catalog'
import type { DMCThread } from '@/lib/dmc/types'
import DMCSkein from './DMCSkein'

type Tab = 'match' | 'stash' | 'shopping' | 'card'
type ValueMapMode = 'original' | '3' | '5'

interface DMCFlossMatchProps {
  rgb: { r: number; g: number; b: number }
  imageValue?: ImageValueContext | null
  valueBuffer?: ValueBuffer | null
  valueScaleClip?: number
  onColorSelect: (rgb: { r: number; g: number; b: number }) => void
}

const VISIBLE_MATCH_COUNT = 5

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
  neutral: 'Neutrals & Grays',
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

const RENDERING_ROLE_LABELS: Record<RenderingSetRole, string> = {
  highlight: 'Highlight',
  base: 'Local / base',
  shadow: 'Shadow',
  'anchor-dark': 'Anchor dark',
}

function formatThreadValueBand(oklabL: number): string {
  if (oklabL >= 0.88) return 'Very light'
  if (oklabL >= 0.74) return 'Light'
  if (oklabL >= 0.58) return 'Mid'
  if (oklabL >= 0.42) return 'Dark'
  if (oklabL >= 0.28) return 'Very dark'
  return 'Deep dark'
}

function formatFamilyPosition(rank: number, total: number): string {
  if (total <= 1) return 'Only shade in this family'
  return `Shade ${rank + 1} of ${total} in family`
}

function formatLadderHint(
  thread: ScoredDMCThread,
  ladder: ScoredDMCThread[],
): string | null {
  const index = ladder.findIndex((entry) => entry.id === thread.id)
  if (index === -1 || ladder.length <= 1) return null

  const parts: string[] = []
  if (index > 0) {
    parts.push(`lighter than ${ladder[index - 1].number}`)
  }
  if (index < ladder.length - 1) {
    parts.push(`darker than ${ladder[index + 1].number}`)
  }

  return parts.join(' · ')
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
      {children}
    </h3>
  )
}

function ValueWarningsList({ warnings }: { warnings: ValueWarning[] }) {
  if (warnings.length === 0) return null
  return (
    <ul className="mt-3 space-y-2">
      {warnings.map((warning) => (
        <li
          key={warning.code}
          className={`rounded-xl border px-3 py-2 text-xs leading-snug ${
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

function SampleValueHero({ context }: { context: ThreadMatchResult }) {
  const { sampleValue, primary, familyLadder } = context
  const hint = formatLadderHint(primary, familyLadder)
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-lg font-black leading-tight text-gray-900 dark:text-gray-100">{sampleValue.bandLabel}</p>
        <p className="shrink-0 font-mono text-xs font-bold tabular-nums text-gray-500">
          {sampleValue.normalizedPosition}
        </p>
      </div>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  )
}

export default function DMCFlossMatch({
  rgb,
  imageValue,
  valueBuffer,
  valueScaleClip = 0,
  onColorSelect,
}: DMCFlossMatchProps) {
  const [activeTab, setActiveTab] = useState<Tab>('match')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [context, setContext] = useState<ThreadMatchResult | null>(null)
  const [showAlternatives, setShowAlternatives] = useState(false)

  // Full catalog loaded for Stash / Shopping / Color Card
  const [catalog, setCatalog] = useState<{ threads: DMCThread[] }>({ threads: [] })
  const [stashInput, setStashInput] = useState('')
  const [shopInput, setShopInput] = useState('')
  const [isStashDropdownOpen, setIsStashDropdownOpen] = useState(false)
  const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false)

  // Scroll target for matched color in card
  const activeCardCellRef = useRef<HTMLDivElement>(null)

  const {
    stash,
    shoppingList,
    addToStash,
    addToShoppingList,
    removeFromShoppingList,
    purchaseAllFromList,
    clearShoppingList,
  } = useDmcStore()

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

    getThreadMatchContext(rgb, { alternativeCount: 4, imageValue, topMatchCount: VISIBLE_MATCH_COUNT })
      .then((result) => {
        if (!cancelled) {
          setContext(result)
          setShowAlternatives(false)
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

  // Auto-suggestions for input stash
  const stashSuggestions = useMemo(() => {
    const query = stashInput.trim().toLowerCase()
    if (!query) return []
    return catalog.threads
      .filter(
        (thread) =>
          (thread.number.toLowerCase().includes(query) ||
            thread.name.toLowerCase().includes(query)) &&
          !stash.includes(thread.number)
      )
      .slice(0, 5)
  }, [stashInput, catalog.threads, stash])

  // Auto-suggestions for shopping list
  const shopSuggestions = useMemo(() => {
    const query = shopInput.trim().toLowerCase()
    if (!query) return []
    return catalog.threads
      .filter(
        (thread) =>
          (thread.number.toLowerCase().includes(query) ||
            thread.name.toLowerCase().includes(query)) &&
          !stash.includes(thread.number) &&
          !shoppingList.includes(thread.number)
      )
      .slice(0, 5)
  }, [shopInput, catalog.threads, stash, shoppingList])

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

  // Copy shopping list clipboard text helper
  const copyShoppingListText = useCallback(() => {
    if (shoppingList.length === 0) return
    const text = shoppingList.map((num) => `DMC ${num}`).join(', ')
    navigator.clipboard.writeText(text)
    alert('Shopping list copied to clipboard!')
  }, [shoppingList])

  if (!context) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        Loading match context...
      </div>
    )
  }

  const {
    primary,
    familyLadder,
    alternatives,
    ladderPosition,
    topMatches,
    valueWarnings,
    suggestedSet,
  } = context

  const showLadder = familyLadder.length > 1
  const otherChoices = topMatches.filter((match) => match.id !== primary.id).slice(0, VISIBLE_MATCH_COUNT - 1)
  const extraAlternatives = alternatives.filter(
    (thread) => !topMatches.some((match) => match.id === thread.id)
  )

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm transition-all duration-300">
      {/* Editorial Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 px-5 py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧵</span>
            <h2 className="text-base font-serif italic font-bold text-gray-900 dark:text-gray-100">
              D·M·C Mouliné Spécial
            </h2>
          </div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Stranded Cotton Colorways
          </p>
        </div>
      </header>

      {/* Heritage Subtabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-950">
        {(['match', 'stash', 'shopping', 'card'] as Tab[]).map((tab) => {
          const isActive = activeTab === tab
          let label = ''
          let badge: number | null = null

          if (tab === 'match') label = '🔍 Match'
          if (tab === 'stash') {
            label = '🗂️ My Stash'
            badge = stash.length
          }
          if (tab === 'shopping') {
            label = '🛒 Wishlist'
            badge = shoppingList.length
          }
          if (tab === 'card') label = '🗺️ Color Card'

          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                isActive
                  ? 'border-pink-600 text-pink-600 bg-white dark:bg-gray-900/50 font-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50/50 dark:hover:bg-gray-900/10'
              }`}
            >
              <span>{label}</span>
              {badge !== null && badge > 0 && (
                <span className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-[10px] text-gray-600 dark:text-gray-400 font-bold px-1.5 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Panels */}
      <div className="p-5">
        <AnimatePresence mode="wait">
          {activeTab === 'match' && (
            <motion.div
              key="match"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* SWATCH & TOP MATCHES ROW */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/10 p-5">
                <div className="flex flex-col gap-6">
                  {/* Swatch & Top 3 Side-by-Side */}
                  <div className="flex flex-col items-center sm:flex-row sm:items-center justify-between gap-5 border-b border-gray-200 dark:border-gray-850 pb-5">
                    {/* Sampled Color Swatch */}
                    <div className="flex flex-col items-center shrink-0">
                      <div
                        className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl border-2 border-black/15 dark:border-white/10 shadow-md shrink-0 relative overflow-hidden"
                        style={{ backgroundColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent pointer-events-none" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                        Sampled Color
                      </span>
                      <span className="font-mono text-[10px] text-gray-400 mt-0.5 uppercase">
                        {`#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`}
                      </span>
                    </div>

                    {/* Arrow Divider */}
                    <div className="hidden sm:block text-gray-300 dark:text-gray-700 text-lg font-black shrink-0">➔</div>
                    <div className="sm:hidden text-gray-300 dark:text-gray-700 text-lg font-black shrink-0">▼</div>

                    {/* Top 3 thread matches */}
                    <div className="flex-1 flex justify-center gap-4">
                      {topMatches.slice(0, 3).map((match, idx) => (
                        <div key={match.id} className="flex flex-col items-center">
                          <DMCSkein
                            hex={match.hex}
                            number={match.number}
                            name={match.name}
                            size="md"
                            simple={true}
                            selected={idx === 0}
                            onClick={() => onColorSelect(match.rgb)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detailed metadata card under matches */}
                  <div className="min-w-0 flex-1 space-y-4">
                    <SampleValueHero context={context} />
                    <ValueWarningsList warnings={valueWarnings} />

                    <div className="pt-2 border-t border-gray-150 dark:border-gray-800">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Closest Perceptual Match
                      </p>
                      <div className="flex flex-wrap items-baseline gap-2 mt-1">
                        <h3 className="text-3xl font-mono font-black text-gray-900 dark:text-gray-100">
                          {primary.number}
                        </h3>
                        <p className="text-base font-serif italic text-gray-800 dark:text-gray-200">
                          {primary.name}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatThreadValueBand(primary.oklab.L)} · {formatFamilyPosition(primary.shadeRank, primary.familySize)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <span className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-2.5 py-1 text-xs font-bold text-gray-600 dark:text-gray-400">
                        {primary.confidenceLabel}
                      </span>
                      <span className="font-mono text-xs font-semibold text-gray-400">
                        ΔE: {formatCatalogDeltaE00(primary.deltaE00)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyCode(e, primary.number)}
                        className="text-xs font-bold text-gray-500 hover:text-pink-600 transition-colors flex items-center gap-1 border border-gray-200 dark:border-gray-800 rounded-lg px-2.5 py-1 bg-white dark:bg-gray-950"
                      >
                        {copiedCode === primary.number ? '✓ Copied' : '📋 Copy Code'}
                      </button>
                    </div>

                    {/* Companion steps (lighter/darker) */}
                    {ladderPosition && (ladderPosition.lighter || ladderPosition.darker) && (
                      <div className="grid grid-cols-2 gap-3 pt-3">
                        {ladderPosition.lighter && (
                          <button
                            type="button"
                            onClick={() => onColorSelect(ladderPosition.lighter!.rgb)}
                            className="flex items-center gap-3 text-left border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl p-2.5 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                          >
                            <div className="w-5 h-12 shrink-0 rounded overflow-hidden shadow-inner relative" style={{ backgroundColor: ladderPosition.lighter.hex }}>
                              <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/20" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Lighter</span>
                              <span className="font-mono text-sm font-black text-gray-900 dark:text-gray-100">{ladderPosition.lighter.number}</span>
                              <span className="text-[10px] text-gray-500 block truncate">{ladderPosition.lighter.name}</span>
                            </div>
                          </button>
                        )}
                        {ladderPosition.darker && (
                          <button
                            type="button"
                            onClick={() => onColorSelect(ladderPosition.darker!.rgb)}
                            className="flex items-center gap-3 text-left border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl p-2.5 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                          >
                            <div className="w-5 h-12 shrink-0 rounded overflow-hidden shadow-inner relative" style={{ backgroundColor: ladderPosition.darker.hex }}>
                              <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/20" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Darker</span>
                              <span className="font-mono text-sm font-black text-gray-900 dark:text-gray-100">{ladderPosition.darker.number}</span>
                              <span className="text-[10px] text-gray-500 block truncate">{ladderPosition.darker.name}</span>
                            </div>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>


              {/* SUGGESTED RENDERING SET */}
              {suggestedSet.suggestions.length > 1 && (
                <div className="space-y-3">
                  <SectionLabel>Suggested Palette Roles</SectionLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {suggestedSet.suggestions.map((entry) => (
                      <button
                        key={`${entry.role}-${entry.thread.id}`}
                        type="button"
                        onClick={() => onColorSelect(entry.thread.rgb)}
                        className="flex flex-col items-center gap-2 border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl p-3 text-center hover:bg-gray-100 dark:hover:bg-gray-900 transition-all hover:shadow-sm"
                      >
                        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                          {RENDERING_ROLE_LABELS[entry.role]}
                        </span>
                        <DMCSkein
                          hex={entry.thread.hex}
                          number={entry.thread.number}
                          name={entry.thread.name}
                          size="sm"
                          showActions={false}
                          simple={true}
                        />
                        <span className="font-mono text-[10px] font-semibold text-gray-400">
                          ΔE: {formatCatalogDeltaE00(entry.thread.deltaE00)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* FAMILY VALUE LADDER */}
              {showLadder && (
                <div className="space-y-3 pt-2">
                  <SectionLabel>{primary.familyLabel} Gradient Ladder</SectionLabel>
                  <div className="flex h-5 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-850">
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
                  <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
                    {familyLadder.map((thread) => {
                      const isPrimary = thread.id === primary.id
                      return (
                        <button
                          key={thread.id}
                          type="button"
                          onClick={() => onColorSelect(thread.rgb)}
                          className={`flex items-center gap-2 shrink-0 border rounded-xl px-2.5 py-1.5 text-left text-xs ${
                            isPrimary
                              ? 'border-pink-600 bg-pink-50/20 dark:bg-pink-950/10'
                              : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:bg-gray-50'
                          }`}
                        >
                          <div className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: thread.hex }} />
                          <span className="font-mono font-bold text-gray-900 dark:text-gray-100">{thread.number}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* OTHER CLOSE MATCHES */}
              {otherChoices.length > 0 && (
                <div className="space-y-3 pt-2">
                  <SectionLabel>Alternative Matching Thread Families</SectionLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {otherChoices.map((match) => {
                      const inStash = stash.includes(match.number)
                      return (
                        <div
                          key={match.id}
                          className="flex items-center gap-4 border border-gray-250/60 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-2xl p-3"
                        >
                          <div className="shrink-0 scale-90">
                            <DMCSkein
                              hex={match.hex}
                              number={match.number}
                              name={match.name}
                              size="md"
                              simple={true}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] text-gray-400 font-bold block">{match.familyLabel}</span>
                            <span
                              onClick={() => onColorSelect(match.rgb)}
                              className="font-mono text-base font-black text-gray-900 dark:text-gray-100 hover:text-pink-600 cursor-pointer"
                            >
                              {match.number}
                            </span>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{match.name}</p>
                            <div className="flex gap-2 items-center mt-1">
                              <span className="font-mono text-[10px] font-bold text-gray-400">ΔE: {formatCatalogDeltaE00(match.deltaE00)}</span>
                              {inStash && (
                                <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 text-[9px] font-extrabold uppercase px-1 rounded">Stash</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* EXTRA ALTERNATIVES */}
              {extraAlternatives.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-800 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAlternatives((o) => !o)}
                    className="flex w-full items-center justify-between text-xs font-bold text-gray-500 hover:text-gray-700 py-2"
                  >
                    <span>More families to consider</span>
                    <span>{showAlternatives ? 'Hide' : `Show ${extraAlternatives.length}`}</span>
                  </button>
                  {showAlternatives && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      {extraAlternatives.map((match) => (
                        <div
                          key={match.id}
                          className="flex items-center gap-4 border border-gray-250/60 dark:border-gray-850 bg-white dark:bg-gray-950 rounded-2xl p-3"
                        >
                          <div className="shrink-0 scale-90">
                            <DMCSkein
                              hex={match.hex}
                              number={match.number}
                              name={match.name}
                              size="md"
                              simple={true}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] text-gray-400 font-bold block">{match.familyLabel}</span>
                            <span
                              onClick={() => onColorSelect(match.rgb)}
                              className="font-mono text-base font-black text-gray-900 dark:text-gray-100 hover:text-pink-600 cursor-pointer"
                            >
                              {match.number}
                            </span>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{match.name}</p>
                            <span className="font-mono text-[10px] text-gray-400 block mt-1">ΔE: {formatCatalogDeltaE00(match.deltaE00)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Value grouping preview */}
              <ReducedValueMapPreview
                valueBuffer={valueBuffer}
                valueScaleClip={valueScaleClip}
                rgb={rgb}
              />

              <footer className="space-y-1 px-1 py-1 text-[10px] leading-relaxed text-gray-400 border-t border-gray-100 dark:border-gray-900 pt-3">
                <p>{PICKED_COLOR_DISCLAIMER}</p>
                <p>{VALUE_ANALYSIS_NOTE}</p>
              </footer>
            </motion.div>
          )}

          {activeTab === 'stash' && (
            <motion.div
              key="stash"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* STASH INVENTORY STATS */}
              <div className="grid grid-cols-3 items-center gap-4 bg-gray-50/50 dark:bg-gray-900/10 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                <div className="col-span-2">
                  <h3 className="text-base font-serif italic text-gray-900 dark:text-gray-100">My Thread Stash</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Your local catalog of DMC solid stranded cotton threads.
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="relative w-14 h-14 flex items-center justify-center border-4 border-emerald-500 rounded-full">
                    <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">{stash.length}</span>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mt-1">Skeins</span>
                </div>
              </div>

              {/* QUICK ADD FORM */}
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Quick add thread number (e.g. 310, Blanc)..."
                      value={stashInput}
                      onChange={(e) => {
                        setStashInput(e.target.value)
                        setIsStashDropdownOpen(true)
                      }}
                      onFocus={() => setIsStashDropdownOpen(true)}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-250 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-600 dark:focus:ring-pink-500 text-gray-900 dark:text-gray-100"
                    />
                    {stashInput && (
                      <button
                        type="button"
                        onClick={() => setStashInput('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Auto Suggestions dropdown */}
                {isStashDropdownOpen && stashSuggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    {stashSuggestions.map((thread) => (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => {
                          addToStash(thread.number)
                          setStashInput('')
                          setIsStashDropdownOpen(false)
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-850 flex items-center justify-between border-b border-gray-100 dark:border-gray-900 last:border-b-0"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: thread.hex }} />
                          <span className="font-mono font-bold text-gray-900 dark:text-gray-100">{thread.number}</span>
                          <span className="text-xs text-gray-500 truncate">- {thread.name}</span>
                        </div>
                        <span className="text-[10px] text-pink-600 dark:text-pink-400 font-bold uppercase tracking-wider">+ Stash</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* GRID OF OWNED COLORS */}
              {stash.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed border-gray-250 dark:border-gray-800 rounded-2xl text-center">
                  <span className="text-3xl mb-2 opacity-65">📦</span>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Your stash is empty</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-[240px]">
                    Use the matcher to sample colors from photos, or use the quick add bar above to catalog your collection.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <SectionLabel>Stashed Thread Library</SectionLabel>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 pt-1 max-h-[350px] overflow-y-auto pr-1">
                    {stash
                      .map((num) => catalog.threads.find((t) => t.number === num))
                      .filter((t): t is DMCThread => !!t)
                      .map((thread) => (
                        <div key={thread.id} className="relative group/stash flex flex-col items-center">
                          <DMCSkein
                            hex={thread.hex}
                            number={thread.number}
                            name={thread.name}
                            size="md"
                            simple={true}
                            onClick={() => onColorSelect(thread.rgb)}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'shopping' && (
            <motion.div
              key="shopping"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-serif italic text-gray-900 dark:text-gray-100">Wishlist & Shopping</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Colors you need to purchase for your active palettes.
                  </p>
                </div>

                {shoppingList.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={copyShoppingListText}
                      className="px-2.5 py-1.5 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-400 transition-colors"
                      title="Copy list as text"
                    >
                      📋 Copy List
                    </button>
                    <button
                      type="button"
                      onClick={purchaseAllFromList}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                      title="Mark all as purchased and move to stash"
                    >
                      ✓ Buy All
                    </button>
                  </div>
                )}
              </div>

              {/* QUICK ADD SHOPPING LIST */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Add thread to wishlist by number or name..."
                  value={shopInput}
                  onChange={(e) => {
                    setShopInput(e.target.value)
                    setIsShopDropdownOpen(true)
                  }}
                  onFocus={() => setIsShopDropdownOpen(true)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-250 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-600 dark:focus:ring-pink-500 text-gray-900 dark:text-gray-100"
                />
                {shopInput && (
                  <button
                    type="button"
                    onClick={() => setShopInput('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}

                {/* Auto Suggestions dropdown */}
                {isShopDropdownOpen && shopSuggestions.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    {shopSuggestions.map((thread) => (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => {
                          addToShoppingList(thread.number)
                          setShopInput('')
                          setIsShopDropdownOpen(false)
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-850 flex items-center justify-between border-b border-gray-100 dark:border-gray-900 last:border-b-0"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: thread.hex }} />
                          <span className="font-mono font-bold text-gray-900 dark:text-gray-100">{thread.number}</span>
                          <span className="text-xs text-gray-500 truncate">- {thread.name}</span>
                        </div>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">+ Wishlist</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* LIST OF SHOPPING ITEMS */}
              {shoppingList.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed border-gray-250 dark:border-gray-800 rounded-2xl text-center">
                  <span className="text-3xl mb-2 opacity-65">🛒</span>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Wishlist is empty</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-[240px]">
                    Threads can be added to your wishlist directly from the matcher results to prepare for your next trip to the store.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {shoppingList
                    .map((num) => catalog.threads.find((t) => t.number === num))
                    .filter((t): t is DMCThread => !!t)
                    .map((thread) => (
                      <div
                        key={thread.id}
                        className="flex items-center justify-between border border-gray-200 dark:border-gray-800 rounded-xl p-3 bg-white dark:bg-gray-950"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full border border-black/10" style={{ backgroundColor: thread.hex }} />
                          <div>
                            <span className="font-mono font-bold text-gray-900 dark:text-gray-100">{thread.number}</span>
                            <span className="text-xs text-gray-500 ml-2">{thread.name}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => addToStash(thread.number)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded transition-colors"
                            title="Mark as purchased (Move to Stash)"
                            aria-label="Mark as purchased"
                          >
                            ✓ Bought
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromShoppingList(thread.number)}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                            title="Remove from list"
                            aria-label="Remove from list"
                          >
                            ✕ Remove
                          </button>
                        </div>
                      </div>
                    ))}

                  <div className="flex justify-end pt-3">
                    <button
                      type="button"
                      onClick={clearShoppingList}
                      className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                    >
                      Clear Wishlist
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'card' && (
            <motion.div
              key="card"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div>
                <h3 className="text-base font-serif italic text-gray-900 dark:text-gray-100">DMC Thread Catalog Map</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Organized by color families, sorted from light to dark. Sampled color is highlighted in gold.
                </p>
              </div>

              {/* CARD COLUMN VIEWPORT */}
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 max-h-[480px] select-none border-t border-gray-100 dark:border-gray-900">
                {HUE_BUCKET_ORDER.map((bucketKey) => {
                  const threads = groupedCatalog[bucketKey] || []
                  return (
                    <div
                      key={bucketKey}
                      className="flex-shrink-0 w-28 bg-gray-50/50 dark:bg-gray-900/10 border border-gray-200 dark:border-gray-800 rounded-2xl p-2.5 flex flex-col gap-2 max-h-[440px]"
                    >
                      <h4 className="text-[10px] font-bold text-center uppercase tracking-widest text-gray-400 border-b border-gray-200 dark:border-gray-800 pb-1.5">
                        {HUE_BUCKET_LABELS[bucketKey]}
                      </h4>
                      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 scrollbar-thin">
                        {threads.map((thread) => {
                          const isMatched = thread.number === primary.number
                          const inStash = stash.includes(thread.number)

                          return (
                            <div
                              key={thread.id}
                              ref={isMatched ? activeCardCellRef : null}
                              onClick={() => onColorSelect(thread.rgb)}
                              className={`group relative p-1.5 rounded-lg text-center cursor-pointer transition-all ${
                                isMatched
                                  ? 'bg-amber-100/50 dark:bg-amber-950/20 border-2 border-amber-500 shadow-md ring-2 ring-amber-500/20 scale-[1.03] z-10 font-bold'
                                  : 'bg-white dark:bg-gray-950 border border-gray-150 dark:border-gray-900 hover:border-gray-400 dark:hover:border-gray-700'
                              }`}
                              style={{
                                borderLeftColor: isMatched ? undefined : thread.hex,
                                borderLeftWidth: isMatched ? undefined : '4px',
                              }}
                              title={`${thread.number}: ${thread.name}`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono text-[10px] font-black text-gray-900 dark:text-gray-100 block">
                                  {thread.number}
                                </span>
                                {inStash && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="In Stash" />
                                )}
                              </div>
                              <span className="text-[8px] text-gray-400 truncate block mt-0.5 max-w-full text-left">
                                {thread.name}
                              </span>

                              {/* Tiny Hover Swatch Preview inside card */}
                              <div
                                className="absolute right-1 top-1.5 w-2 h-2 rounded-full border border-black/10 pointer-events-none group-hover:scale-125 transition-transform"
                                style={{ backgroundColor: thread.hex }}
                              />
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

function ReducedValueMapPreview({
  valueBuffer,
  valueScaleClip,
  rgb,
}: {
  valueBuffer: ValueBuffer | null | undefined
  valueScaleClip: number
  rgb: { r: number; g: number; b: number }
}) {
  const [mode, setMode] = useState<ValueMapMode>('original')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const thresholdsByMode = useMemo(() => {
    if (!valueBuffer) return null
    return {
      '3': computeValueScale(valueBuffer.y, 3, 'Even', valueScaleClip).thresholds,
      '5': computeValueScale(valueBuffer.y, 5, 'Even', valueScaleClip).thresholds,
    }
  }, [valueBuffer, valueScaleClip])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !valueBuffer || mode === 'original') return

    const thresholds = mode === '3' ? thresholdsByMode?.['3'] : thresholdsByMode?.['5']
    if (!thresholds) return

    const { width, height, y } = valueBuffer
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.createImageData(width, height)
    const data = imageData.data
    const numSteps = thresholds.length - 1

    for (let i = 0; i < y.length; i++) {
      const stepIdx = getStepIndex(y[i], thresholds)
      const val = stepToGray(stepIdx, numSteps)
      const idx = i * 4
      data[idx] = val
      data[idx + 1] = val
      data[idx + 2] = val
      data[idx + 3] = 255
    }

    ctx.putImageData(imageData, 0, 0)
  }, [valueBuffer, mode, thresholdsByMode])

  if (!valueBuffer) return null

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 pt-5">
      <SectionLabel>Value Grouping Preview</SectionLabel>
      <div className="mb-3 flex flex-wrap gap-2">
        {(['original', '3', '5'] as ValueMapMode[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
              mode === option
                ? 'border-pink-600 bg-pink-50/10 text-pink-600'
                : 'border-gray-200 dark:border-gray-850 text-gray-500 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            {option === 'original' ? 'Sample Color' : `${option}-value`}
          </button>
        ))}
      </div>
      <div
        className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-850 bg-gray-50/50 dark:bg-gray-900/10"
        style={{ aspectRatio: `${valueBuffer.width} / ${valueBuffer.height}` }}
      >
        {mode === 'original' ? (
          <div
            className="h-full w-full transition-colors duration-300"
            style={{ backgroundColor: `rgb(${rgb.r},${rgb.g},${rgb.b})` }}
            aria-label="Sampled color swatch"
          />
        ) : (
          <canvas ref={canvasRef} className="h-full w-full object-contain" />
        )}
      </div>
    </div>
  )
}
