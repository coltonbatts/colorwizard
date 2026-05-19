'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { getThreadMatchContext } from '@/lib/dmcFloss'
import type { ThreadMatchResult } from '@/lib/dmcFloss'
import type {
  ImageValueContext,
  RenderingSetRole,
  ScoredDMCThread,
  ShadeStep,
  ValueWarning,
} from '@/lib/dmc/types'
import { formatCatalogDeltaE00, PICKED_COLOR_DISCLAIMER } from '@/lib/colorSemantics'
import { computeValueScale, getStepIndex, stepToGray } from '@/lib/valueScale'
import type { ValueBuffer } from '@/hooks/useImageAnalyzer'

type ValueMapMode = 'original' | '3' | '5'
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'

interface DMCFlossMatchProps {
  rgb: { r: number; g: number; b: number }
  imageValue?: ImageValueContext | null
  valueBuffer?: ValueBuffer | null
  valueScaleClip?: number
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

const RENDERING_ROLE_LABELS: Record<RenderingSetRole, string> = {
  highlight: 'Highlight',
  base: 'Local / base',
  shadow: 'Shadow',
  'anchor-dark': 'Anchor dark',
}

/** Thread catalog value readout from OKLab lightness (0–1). */
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

function formatThreadValueSummary(oklabL: number, shadeStep: ShadeStep): string {
  const band = formatThreadValueBand(oklabL)
  const shade = formatShadeStep(shadeStep)
  if (!shade) return band
  if (band.toLowerCase().includes(shade.toLowerCase())) return band
  return `${band} · ${shade}`
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

function ValueWarningsList({ warnings }: { warnings: ValueWarning[] }) {
  if (warnings.length === 0) return null
  return (
    <ul className="mt-3 space-y-2">
      {warnings.map((warning) => (
        <li
          key={warning.code}
          className={`rounded-xl border-2 px-3 py-2.5 text-sm leading-snug ${
            warning.severity === 'caution'
              ? 'border-amber-300/80 bg-amber-50 text-amber-950'
              : 'border-linen bg-paper-recessed text-ink-secondary'
          }`}
        >
          {warning.message}
        </li>
      ))}
    </ul>
  )
}

function SampleValueHero({ context }: { context: ThreadMatchResult }) {
  const { sampleValue, primary, ladderPosition, familyLadder } = context
  const hint = formatLadderHint(primary, familyLadder)
  return (
    <div className="rounded-xl border-2 border-ink/15 bg-paper-recessed px-3 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-graphite">Value role in this image</p>
      <p className="mt-1 text-2xl font-black leading-tight text-ink">{sampleValue.bandLabel}</p>
      <p className="mt-1 font-mono text-sm font-bold text-ink-secondary">
        {sampleValue.normalizedPosition} on image value scale (0 = darkest, 100 = lightest)
      </p>
      {hint ? <p className="mt-2 text-sm text-ink-secondary">{hint}</p> : null}
      {ladderPosition && (ladderPosition.lighter || ladderPosition.darker) ? (
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-graphite">Light-to-dark ladder neighbors available</p>
      ) : null}
    </div>
  )
}

function SuggestedRenderingSetSection({
  context,
  onSelect,
}: {
  context: ThreadMatchResult
  onSelect: (rgb: { r: number; g: number; b: number }) => void
}) {
  if (context.suggestedSet.suggestions.length <= 1) return null
  return (
    <div className="border-b-2 border-linen px-4 py-5">
      <SectionLabel>Suggested rendering set</SectionLabel>
      <p className="mt-1 mb-4 text-sm text-ink-secondary">Light-to-dark passes using this family when possible.</p>
      <ul className="space-y-2">
        {context.suggestedSet.suggestions.map((entry) => (
          <li key={`${entry.role}-${entry.thread.id}`}>
            <button type="button" onClick={() => onSelect(entry.thread.rgb)} className="flex w-full items-center gap-3 rounded-xl border-2 border-linen bg-paper-elevated px-3 py-3 text-left transition-colors hover:border-graphite-muted hover:bg-paper-recessed">
              <ThreadSwatch hex={entry.thread.hex} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-graphite">{RENDERING_ROLE_LABELS[entry.role]}</p>
                <p className="font-mono text-base font-black text-ink">{entry.thread.number}</p>
                <p className="text-sm text-ink-secondary">{entry.thread.name}</p>
              </div>
              <span className="shrink-0 font-mono text-xs font-bold text-ink-secondary">{formatCatalogDeltaE00(entry.thread.deltaE00)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
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
            title={`${thread.number} · ${formatThreadValueBand(thread.oklab.L)}`}
            aria-label={`${thread.number}, ${formatThreadValueBand(thread.oklab.L)}`}
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

export default function DMCFlossMatch({ rgb, imageValue, valueBuffer, valueScaleClip = 0, onColorSelect }: DMCFlossMatchProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [context, setContext] = useState<ThreadMatchResult | null>(null)
  const [showAlternatives, setShowAlternatives] = useState(false)

  useEffect(() => {
    let cancelled = false

    if (!rgb) {
      setContext(null)
      return
    }

    getThreadMatchContext(rgb, { alternativeCount: 3, imageValue, topMatchCount: VISIBLE_MATCH_COUNT })
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

  const handleCopyCode = useCallback((e: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>, code: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 1800)
  }, [])

  if (!context) {
    return null
  }

  const { primary, familyLadder, alternatives, ladderPosition, topMatches, valueWarnings } = context
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
        <p className="mb-4 text-sm font-semibold text-ink-secondary">Plan value first — then pick thread</p>

        <div className="rounded-2xl border-2 border-linen bg-paper-elevated p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <button
              type="button"
              onClick={() => onColorSelect(primary.rgb)}
              className="flex shrink-0 flex-col items-center gap-2 sm:items-start"
            >
              <ThreadSwatch hex={primary.hex} size="hero" selected />
              <span className="text-xs font-bold uppercase tracking-wide text-graphite">Tap swatch to sample</span>
            </button>

            <div className="min-w-0 flex-1">
              <SampleValueHero context={context} />
              <ValueWarningsList warnings={valueWarnings} />

              <div className="mt-4 flex items-start justify-between gap-3 border-t border-linen pt-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-graphite">Closest hue match</p>
                  <p className="font-mono text-3xl font-black leading-none tracking-tight text-ink">
                    {primary.number}
                  </p>
                  <p className="mt-1 text-base font-semibold leading-snug text-ink">{primary.name}</p>
                  <p className="mt-1 text-sm text-ink-secondary">
                    {formatThreadValueBand(primary.oklab.L)}
                    {' · '}
                    {formatFamilyPosition(primary.shadeRank, primary.familySize)}
                  </p>
                </div>
                <CopyCodeButton code={primary.number} copiedCode={copiedCode} onCopy={handleCopyCode} large />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-lg border border-linen bg-paper-recessed px-2.5 py-1 text-xs font-bold text-ink-secondary">
                  {primary.confidenceLabel}
                </span>
                <span className="font-mono text-xs font-bold text-ink-secondary">
                  {formatCatalogDeltaE00(primary.deltaE00)}
                </span>
              </div>

              {ladderPosition && (ladderPosition.lighter || ladderPosition.darker) ? (
                <div className="mt-4 grid grid-cols-1 gap-2">
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

      <SuggestedRenderingSetSection context={context} onSelect={onColorSelect} />

      {/* Family value ladder */}
      {showLadder ? (
        <div className="border-b-2 border-linen px-4 py-5">
          <SectionLabel>{primary.familyLabel} — light to dark</SectionLabel>
          <p className="mt-1 mb-4 text-sm text-ink-secondary">
            Light-to-dark rendering ladder in this hue family.
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
                      {formatThreadValueBand(thread.oklab.L)}
                      {shade ? ` · ${shade}` : ''}
                    </p>
                  </div>
                  <span className="hidden shrink-0 font-mono text-xs font-bold text-ink-secondary sm:block">
                    {`${Math.round(thread.oklab.L * 100)}% light`}
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

      <ReducedValueMapPreview
        valueBuffer={valueBuffer}
        valueScaleClip={valueScaleClip}
        rgb={rgb}
      />

      <p className="px-4 py-3 text-sm leading-relaxed text-ink-secondary">
        {PICKED_COLOR_DISCLAIMER}
      </p>
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
    <div className="border-b-2 border-linen px-4 py-5">
      <SectionLabel>Value grouping preview</SectionLabel>
      <p className="mt-1 mb-3 text-sm text-ink-secondary">
        Rough 3- or 5-value groupings of the loaded image (for planning, not stitching charts).
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {(['original', '3', '5'] as ValueMapMode[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={`rounded-lg border-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
              mode === option
                ? 'border-ink bg-paper-recessed text-ink'
                : 'border-linen text-ink-secondary hover:border-graphite-muted'
            }`}
          >
            {option === 'original' ? 'Sample' : `${option}-value`}
          </button>
        ))}
      </div>
      <div
        className="overflow-hidden rounded-xl border-2 border-linen bg-paper-recessed"
        style={{ aspectRatio: `${valueBuffer.width} / ${valueBuffer.height}` }}
      >
        {mode === 'original' ? (
          <div
            className="h-full w-full"
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

type ThreadListItem = ScoredDMCThread

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
            {formatThreadValueBand(match.oklab.L)}
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
  return (
    <button
      type="button"
      onClick={() => onSelect(thread.rgb)}
      className="flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-xl border-2 border-linen bg-paper px-3 py-3 text-left transition-colors hover:border-graphite-muted hover:bg-paper-recessed"
    >
      <ThreadSwatch hex={thread.hex} size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-graphite">{label}</p>
        <p className="font-mono text-base font-black leading-tight text-ink">{thread.number}</p>
        <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-ink-secondary">
          {formatThreadValueSummary(thread.oklab.L, thread.shadeStep)}
        </p>
      </div>
    </button>
  )
}
