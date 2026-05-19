'use client'

import { useState, useCallback, useEffect } from 'react'
import { findClosestDMCColors, getThreadMatchContext } from '@/lib/dmcFloss'
import type { ThreadMatchResult } from '@/lib/dmcFloss'
import type { DMCMatch } from '@/lib/dmcFloss'
import type { ScoredDMCThread, ShadeStep } from '@/lib/dmc/types'
import { formatCatalogDeltaE00, PICKED_COLOR_DISCLAIMER } from '@/lib/colorSemantics'
import type { KeyboardEvent, MouseEvent } from 'react'

interface DMCFlossMatchProps {
  rgb: { r: number; g: number; b: number }
  onColorSelect: (rgb: { r: number; g: number; b: number }) => void
}

function formatShadeStep(step: ShadeStep): string | null {
  if (step === 'unspecified') return null
  return step
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/** Secondary choices use 40px swatches; hero is 120px (200% larger than 40px). */
function ThreadSwatch({
  hex,
  size = 'md',
  selected = false,
}: {
  hex: string
  size?: 'xs' | 'sm' | 'md' | 'hero'
  selected?: boolean
}) {
  const sizeClass =
    size === 'hero'
      ? 'h-[7.5rem] w-[7.5rem] rounded-2xl'
      : size === 'xs'
        ? 'h-10 w-10 rounded-xl'
        : size === 'sm'
          ? 'h-8 w-8 rounded-lg'
          : 'h-10 w-10 rounded-xl'

  return (
    <div
      className={`${sizeClass} shrink-0 border shadow-inner ${
        selected ? 'border-ink ring-2 ring-ink/15' : 'border-black/10'
      }`}
      style={{ backgroundColor: hex }}
    />
  )
}

function CopyCodeButton({
  code,
  copiedCode,
  onCopy,
}: {
  code: string
  copiedCode: string | null
  onCopy: (e: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>, code: string) => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => onCopy(e, code)}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-hairline bg-paper text-ink-secondary transition-colors hover:bg-paper-recessed hover:text-ink"
      title="Copy DMC code"
      aria-label={`Copy DMC code ${code}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onCopy(e, code)
        }
      }}
    >
      {copiedCode === code ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="10" height="10" rx="2" />
          <rect x="5" y="5" width="10" height="10" rx="2" />
        </svg>
      )}
    </button>
  )
}

const VISIBLE_MATCH_COUNT = 5

export default function DMCFlossMatch({ rgb, onColorSelect }: DMCFlossMatchProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [context, setContext] = useState<ThreadMatchResult | null>(null)
  const [topMatches, setTopMatches] = useState<DMCMatch[]>([])
  const [showAlternatives, setShowAlternatives] = useState(false)

  useEffect(() => {
    let cancelled = false

    if (!rgb) {
      setContext(null)
      setTopMatches([])
      return
    }

    Promise.all([
      getThreadMatchContext(rgb, { alternativeCount: 3 }),
      findClosestDMCColors(rgb, VISIBLE_MATCH_COUNT),
    ])
      .then(([result, ranked]) => {
        if (!cancelled) {
          setContext(result)
          setTopMatches(ranked)
          setShowAlternatives(false)
        }
      })
      .catch((error) => {
        console.error('DMC Matching Error:', error)
        if (!cancelled) {
          setContext(null)
          setTopMatches([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [rgb])

  const handleCopyCode = useCallback((e: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>, code: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 1800)
  }, [])

  if (!context) {
    return null
  }

  const { primary, familyLadder, alternatives, ladderPosition } = context
  const shadeLabel = formatShadeStep(primary.shadeStep)
  const showLadder = familyLadder.length > 1
  const otherChoices = topMatches.filter((match) => match.id !== primary.id).slice(0, VISIBLE_MATCH_COUNT - 1)
  const extraAlternatives = alternatives.filter(
    (thread) => !topMatches.some((match) => match.id === thread.id),
  )

  return (
    <section className="overflow-hidden rounded-xl border border-ink-hairline bg-paper animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between gap-3 border-b border-ink-hairline px-3 py-2.5">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-secondary">
          Threads
        </div>
        <div className="truncate font-mono text-[10px] font-bold text-ink-faint">
          {primary.familyLabel}
        </div>
      </div>

      {/* Primary match */}
      <div className="border-b border-ink-hairline bg-paper-elevated px-3 py-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => onColorSelect(primary.rgb)}
            className="group flex min-w-0 flex-1 items-start gap-3 text-left"
          >
            <div className="relative pt-0.5">
              <div className={`absolute inset-y-1 -left-3 w-1 rounded-full ${primary.confidenceBgColor}`} />
              <ThreadSwatch hex={primary.hex} size="hero" selected />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xl font-black tracking-tight text-ink sm:text-2xl">
                  {primary.number}
                </span>
                <span
                  className={`rounded-full bg-paper-recessed px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] ${primary.confidenceColor}`}
                >
                  {primary.confidenceLabel}
                </span>
              </div>
              <div className="mt-0.5 text-sm font-semibold text-ink-secondary">
                {primary.name}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] font-bold text-ink-faint">
                <span>{formatCatalogDeltaE00(primary.deltaE00)}</span>
                {shadeLabel ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{shadeLabel}</span>
                  </>
                ) : null}
                {primary.warmth !== 'neutral' ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{primary.warmth}</span>
                  </>
                ) : null}
              </div>
            </div>
          </button>

          <CopyCodeButton code={primary.number} copiedCode={copiedCode} onCopy={handleCopyCode} />
        </div>

        {ladderPosition && (ladderPosition.lighter || ladderPosition.darker) ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {ladderPosition.lighter ? (
              <CompanionChip
                label="Lighter"
                thread={ladderPosition.lighter}
                onSelect={onColorSelect}
              />
            ) : null}
            {ladderPosition.darker ? (
              <CompanionChip
                label="Darker"
                thread={ladderPosition.darker}
                onSelect={onColorSelect}
              />
            ) : null}
          </div>
        ) : null}

        {otherChoices.length > 0 ? (
          <div className="mt-4 border-t border-ink-hairline pt-3">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-ink-faint">
              Also consider
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {otherChoices.map((match) => (
                <SecondaryMatchCard
                  key={match.id}
                  match={match}
                  onSelect={onColorSelect}
                  onCopy={handleCopyCode}
                  copiedCode={copiedCode}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Family ladder */}
      {showLadder ? (
        <div className="border-b border-ink-hairline bg-paper-elevated px-3 py-3">
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-ink-faint">
            {primary.familyLabel} ladder
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {familyLadder.map((thread) => {
              const isPrimary = thread.id === primary.id
              const step = formatShadeStep(thread.shadeStep)

              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => onColorSelect(thread.rgb)}
                  title={`${thread.number} ${thread.name}${step ? ` · ${step}` : ''}`}
                  className={`flex min-w-[4.5rem] flex-col items-center gap-1.5 rounded-xl border px-2 py-2 transition-colors ${
                    isPrimary
                      ? 'border-ink bg-paper-recessed'
                      : 'border-ink-hairline bg-paper hover:bg-paper-recessed'
                  }`}
                >
                  <ThreadSwatch hex={thread.hex} size="sm" selected={isPrimary} />
                  <span className="font-mono text-[10px] font-black text-ink">{thread.number}</span>
                  {step ? (
                    <span className="max-w-full truncate text-[9px] font-semibold text-ink-faint">
                      {step}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Cross-family alternatives not already shown above */}
      {extraAlternatives.length > 0 ? (
        <div className="bg-paper-elevated">
          <button
            type="button"
            onClick={() => setShowAlternatives((open) => !open)}
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-paper-recessed"
            aria-expanded={showAlternatives}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-ink-secondary">
              Other families
            </span>
            <span className="font-mono text-[10px] font-bold text-ink-faint">
              {showAlternatives ? '−' : `${extraAlternatives.length}`}
            </span>
          </button>

          {showAlternatives ? (
            <div className="border-t border-ink-hairline">
              {extraAlternatives.map((thread, index) => (
                <div
                  key={thread.id}
                  className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 transition-colors hover:bg-paper-recessed ${
                    index !== 0 ? 'border-t border-ink-hairline' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onColorSelect(thread.rgb)}
                    className="flex min-w-0 items-center gap-3 text-left"
                  >
                    <ThreadSwatch hex={thread.hex} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black tracking-tight text-ink">
                          {thread.number}
                        </span>
                        <span className="truncate text-[10px] font-semibold text-ink-faint">
                          {thread.familyLabel}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-sm font-semibold text-ink-secondary">
                        {thread.name}
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] font-bold text-ink-faint">
                      {formatCatalogDeltaE00(thread.deltaE00)}
                    </span>
                  </button>

                  <CopyCodeButton code={thread.number} copiedCode={copiedCode} onCopy={handleCopyCode} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="border-t border-ink-hairline px-3 py-2 text-[10px] leading-relaxed text-ink-faint">
        {PICKED_COLOR_DISCLAIMER}
      </p>
    </section>
  )
}

function SecondaryMatchCard({
  match,
  onSelect,
  onCopy,
  copiedCode,
}: {
  match: DMCMatch
  onSelect: (rgb: { r: number; g: number; b: number }) => void
  onCopy: (e: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>, code: string) => void
  copiedCode: string | null
}) {
  const deltaE00 = match.deltaE00

  return (
    <div className="flex flex-col rounded-xl border border-ink-hairline bg-paper p-2 transition-colors hover:bg-paper-recessed">
      <button
        type="button"
        onClick={() => onSelect(match.rgb)}
        className="flex flex-col items-center gap-1.5 text-center"
      >
        <ThreadSwatch hex={match.hex} size="xs" />
        <span className="font-mono text-[11px] font-black text-ink">{match.number}</span>
        <span className="line-clamp-2 min-h-[2rem] text-[9px] font-semibold leading-tight text-ink-secondary">
          {match.name}
        </span>
        <span className="font-mono text-[9px] font-bold text-ink-faint">
          {formatCatalogDeltaE00(deltaE00)}
        </span>
      </button>
      <div className="mt-1.5 flex justify-center">
        <CopyCodeButton code={match.number} copiedCode={copiedCode} onCopy={onCopy} />
      </div>
    </div>
  )
}

function CompanionChip({
  label,
  thread,
  onSelect,
}: {
  label: string
  thread: ScoredDMCThread
  onSelect: (rgb: { r: number; g: number; b: number }) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(thread.rgb)}
      className="inline-flex items-center gap-2 rounded-lg border border-ink-hairline bg-paper px-2 py-1.5 text-left transition-colors hover:bg-paper-recessed"
    >
      <ThreadSwatch hex={thread.hex} size="sm" />
      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-ink-faint">{label}</span>
      <span className="font-mono text-[10px] font-bold text-ink">{thread.number}</span>
    </button>
  )
}
