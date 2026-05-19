'use client'

import { useState, useCallback, useEffect } from 'react'
import { findClosestDMCColors, getThreadMatchContext } from '@/lib/dmcFloss'
import type { ThreadMatchResult } from '@/lib/dmcFloss'
import type { DMCMatch } from '@/lib/dmcFloss'
import type { OklabCoords, ScoredDMCThread, ShadeStep } from '@/lib/dmc/types'
import { formatCatalogDeltaE00, PICKED_COLOR_DISCLAIMER } from '@/lib/colorSemantics'
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'

interface DMCFlossMatchProps {
  rgb: { r: number; g: number; b: number }
  onColorSelect: (rgb: { r: number; g: number; b: number }) => void
}

const VISIBLE_MATCH_COUNT = 5

function formatShadeStep(step: ShadeStep): string | null {
  if (step === 'unspecified') return null
  return step
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/** Artist-facing value readout from OKLab lightness (0–1). */
function formatValueBand(oklab: OklabCoords): string {
  const l = oklab.L
  if (l >= 0.88) return 'Very light value'
  if (l >= 0.74) return 'Light value'
  if (l >= 0.58) return 'Mid value'
  if (l >= 0.42) return 'Dark value'
  if (l >= 0.28) return 'Very dark value'
  return 'Deep dark value'
}

function formatValuePercent(oklab: OklabCoords): string {
  return `${Math.round(oklab.L * 100)}% light`
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

function ThreadSwatch({
  hex,
  size = 'md',
  selected = false,
}: {
  hex: string
  size?: 'md' | 'lg' | 'hero'
  selected?: boolean
}) {
  const sizeClass =
    size === 'hero'
      ? 'h-[6.5rem] w-[6.5rem] rounded-2xl sm:h-[7.5rem] sm:w-[7.5rem]'
      : size === 'lg'
        ? 'h-14 w-14 rounded-xl'
        : 'h-12 w-12 rounded-xl'

  return (
    <div
      className={`${sizeClass} shrink-0 border-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] ${
        selected ? 'border-ink ring-2 ring-ink/20' : 'border-black/15'
      }`}
      style={{ backgroundColor: hex }}
      aria-hidden
    />
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-graphite">
      {children}
    </h3>
  )
}

function ValueReadout({ thread, ladder }: { thread: ScoredDMCThread; ladder: ScoredDMCThread[] }) {
  const shade = formatShadeStep(thread.shadeStep)
  const hint = formatLadderHint(thread, ladder)

  return (
    <dl className="mt-3 space-y-2 rounded-xl border border-linen bg-paper-recessed/80 px-3 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <dt className="text-xs font-bold uppercase tracking-wide text-graphite">Value</dt>
        <dd className="text-sm font-bold text-ink">{formatValueBand(thread.oklab)}</dd>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-secondary">
        <span className="font-mono font-semibold text-ink">{formatValuePercent(thread.oklab)}</span>
        {shade ? <span>{shade}</span> : null}
        {thread.familySize > 1 ? (
          <span>{formatFamilyPosition(thread.shadeRank, thread.familySize)}</span>
        ) : null}
      </div>
      {hint ? <p className="text-sm leading-snug text-ink-secondary">{hint}</p> : null}
    </dl>
  )
}

function FamilyValueScale({
  ladder,
  primaryId,
  onSelect,
}: {
  ladder: ScoredDMCThread[]
  primaryId: string
  onSelect: (rgb: { r: number; g: number; b: number }) => void
}) {
  if (ladder.length <= 1) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-bold text-ink-secondary">
        <span>Light end</span>
        <span>Dark end</span>
      </div>
      <div className="flex h-4 overflow-hidden rounded-lg border-2 border-ink-hairline">
        {ladder.map((thread) => (
          <button
            key={thread.id}
            type="button"
            onClick={() => onSelect(thread.rgb)}
            className={`min-w-0 flex-1 transition-opacity hover:opacity-90 ${
              thread.id === primaryId ? 'ring-2 ring-inset ring-ink' : ''
            }`}
            style={{ backgroundColor: thread.hex }}
            title={`${thread.number} · ${formatValueBand(thread.oklab)}`}
            aria-label={`${thread.number}, ${formatValueBand(thread.oklab)}`}
          />
        ))}
      </div>
    </div>
  )
}

function CopyCodeButton({
  code,
  copiedCode,
  onCopy,
  large = false,
}: {
  code: string
  copiedCode: string | null
  onCopy: (e: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>, code: string) => void
  large?: boolean
}) {
  const sizeClass = large ? 'h-10 w-10' : 'h-9 w-9'

  return (
    <button
      type="button"
      onClick={(e) => onCopy(e, code)}
      className={`inline-flex ${sizeClass} shrink-0 items-center justify-center rounded-lg border-2 border-linen bg-paper text-ink transition-colors hover:border-graphite-muted hover:bg-paper-recessed`}
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="10" height="10" rx="2" />
          <rect x="5" y="5" width="10" height="10" rx="2" />
        </svg>
      )}
    </button>
  )
}

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
  const showLadder = familyLadder.length > 1
  const otherChoices = topMatches.filter((match) => match.id !== primary.id).slice(0, VISIBLE_MATCH_COUNT - 1)
  const extraAlternatives = alternatives.filter(
    (thread) => !topMatches.some((match) => match.id === thread.id),
  )

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-linen bg-paper animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className="border-b-2 border-linen bg-paper-recessed px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-ink">Threads</h2>
          <p className="truncate text-sm font-semibold text-ink-secondary">{primary.familyLabel} family</p>
        </div>
      </header>

      {/* Primary match */}
      <div className="border-b-2 border-linen px-4 py-5">
        <p className="mb-4 text-sm font-semibold text-ink-secondary">Best match for your sample</p>

        <div className="rounded-2xl border-2 border-linen bg-paper-elevated p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <button
              type="button"
              onClick={() => onColorSelect(primary.rgb)}
              className="flex shrink-0 flex-col items-center gap-2 sm:items-start"
            >
              <div className="relative">
                <div className={`absolute -left-1 top-2 bottom-2 w-1.5 rounded-full ${primary.confidenceBgColor}`} />
                <ThreadSwatch hex={primary.hex} size="hero" selected />
              </div>
              <span className="text-xs font-bold uppercase tracking-wide text-graphite">Tap swatch to sample</span>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-3xl font-black leading-none tracking-tight text-ink">
                    {primary.number}
                  </p>
                  <p className="mt-2 text-base font-semibold leading-snug text-ink">
                    {primary.name}
                  </p>
                </div>
                <CopyCodeButton code={primary.number} copiedCode={copiedCode} onCopy={handleCopyCode} large />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-lg border border-linen bg-paper-recessed px-2.5 py-1 text-xs font-bold text-ink">
                  {primary.confidenceLabel}
                </span>
                <span className="font-mono text-sm font-bold text-ink">
                  {formatCatalogDeltaE00(primary.deltaE00)}
                </span>
              </div>

              <ValueReadout thread={primary} ladder={familyLadder} />

              {ladderPosition && (ladderPosition.lighter || ladderPosition.darker) ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {ladderPosition.lighter ? (
                    <CompanionCard
                      label="Go lighter"
                      thread={ladderPosition.lighter}
                      onSelect={onColorSelect}
                    />
                  ) : null}
                  {ladderPosition.darker ? (
                    <CompanionCard
                      label="Go darker"
                      thread={ladderPosition.darker}
                      onSelect={onColorSelect}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Family value ladder */}
      {showLadder ? (
        <div className="border-b-2 border-linen px-4 py-5">
          <SectionLabel>{primary.familyLabel} — light to dark</SectionLabel>
          <p className="mt-1 mb-4 text-sm text-ink-secondary">
            Same hue family. Move lighter for highlights, darker for shadow passes.
          </p>

          <FamilyValueScale ladder={familyLadder} primaryId={primary.id} onSelect={onColorSelect} />

          <div className="mt-4 space-y-2">
            {familyLadder.map((thread) => {
              const isPrimary = thread.id === primary.id
              const shade = formatShadeStep(thread.shadeStep)

              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => onColorSelect(thread.rgb)}
                  className={`flex w-full items-center gap-4 rounded-xl border-2 px-3 py-3 text-left transition-colors ${
                    isPrimary
                      ? 'border-ink bg-paper-recessed'
                      : 'border-linen bg-paper-elevated hover:border-graphite-muted hover:bg-paper-recessed'
                  }`}
                >
                  <ThreadSwatch hex={thread.hex} size="lg" selected={isPrimary} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-mono text-lg font-black text-ink">{thread.number}</span>
                      {isPrimary ? (
                        <span className="text-xs font-bold uppercase tracking-wide text-graphite">Your match</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-sm font-semibold text-ink-secondary">{thread.name}</p>
                    <p className="mt-1 text-sm font-medium text-ink">
                      {formatValueBand(thread.oklab)}
                      {shade ? ` · ${shade}` : ''}
                    </p>
                  </div>
                  <span className="hidden shrink-0 font-mono text-xs font-bold text-ink-secondary sm:block">
                    {formatValuePercent(thread.oklab)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Other top matches */}
      {otherChoices.length > 0 ? (
        <div className="border-b-2 border-linen px-4 py-5">
          <SectionLabel>Other close matches</SectionLabel>
          <p className="mt-1 mb-4 text-sm text-ink-secondary">
            Different families or values — compare before you commit to a skein.
          </p>
          <ul className="space-y-3">
            {otherChoices.map((match) => (
              <li key={match.id}>
                <AlternateMatchRow
                  match={match}
                  onSelect={onColorSelect}
                  onCopy={handleCopyCode}
                  copiedCode={copiedCode}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {extraAlternatives.length > 0 ? (
        <div className="border-b-2 border-linen">
          <button
            type="button"
            onClick={() => setShowAlternatives((open) => !open)}
            className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-paper-recessed"
            aria-expanded={showAlternatives}
          >
            <span className="text-sm font-bold text-ink">More families to consider</span>
            <span className="font-mono text-sm font-bold text-ink-secondary">
              {showAlternatives ? 'Hide' : `Show ${extraAlternatives.length}`}
            </span>
          </button>

          {showAlternatives ? (
            <ul className="space-y-3 border-t-2 border-linen px-4 py-4">
              {extraAlternatives.map((thread) => (
                <li key={thread.id}>
                  <AlternateMatchRow
                    match={thread}
                    onSelect={onColorSelect}
                    onCopy={handleCopyCode}
                    copiedCode={copiedCode}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <p className="px-4 py-3 text-sm leading-relaxed text-ink-secondary">
        {PICKED_COLOR_DISCLAIMER}
      </p>
    </section>
  )
}

type ThreadListItem = Pick<
  DMCMatch,
  'id' | 'number' | 'name' | 'hex' | 'rgb' | 'familyLabel' | 'shadeStep' | 'oklab' | 'deltaE00'
>

function AlternateMatchRow({
  match,
  onSelect,
  onCopy,
  copiedCode,
}: {
  match: ThreadListItem
  onSelect: (rgb: { r: number; g: number; b: number }) => void
  onCopy: (e: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>, code: string) => void
  copiedCode: string | null
}) {
  const shade = formatShadeStep(match.shadeStep)

  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-linen bg-paper-elevated p-3">
      <button
        type="button"
        onClick={() => onSelect(match.rgb)}
        className="flex min-w-0 flex-1 items-center gap-4 text-left"
      >
        <ThreadSwatch hex={match.hex} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-lg font-black text-ink">{match.number}</span>
            <span className="text-sm font-semibold text-ink-secondary">{match.familyLabel}</span>
          </div>
          <p className="mt-0.5 text-sm font-semibold text-ink">{match.name}</p>
          <p className="mt-1 text-sm text-ink-secondary">
            {formatValueBand(match.oklab)}
            {shade ? ` · ${shade}` : ''}
            <span className="font-mono font-semibold text-ink"> · {formatCatalogDeltaE00(match.deltaE00)}</span>
          </p>
        </div>
      </button>
      <CopyCodeButton code={match.number} copiedCode={copiedCode} onCopy={onCopy} />
    </div>
  )
}

function CompanionCard({
  label,
  thread,
  onSelect,
}: {
  label: string
  thread: ScoredDMCThread
  onSelect: (rgb: { r: number; g: number; b: number }) => void
}) {
  const shade = formatShadeStep(thread.shadeStep)

  return (
    <button
      type="button"
      onClick={() => onSelect(thread.rgb)}
      className="flex items-center gap-3 rounded-xl border-2 border-linen bg-paper px-3 py-3 text-left transition-colors hover:border-graphite-muted hover:bg-paper-recessed"
    >
      <ThreadSwatch hex={thread.hex} size="md" />
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-graphite">{label}</p>
        <p className="font-mono text-base font-black text-ink">{thread.number}</p>
        <p className="text-sm text-ink-secondary">
          {formatValueBand(thread.oklab)}
          {shade ? ` · ${shade}` : ''}
        </p>
      </div>
    </button>
  )
}
