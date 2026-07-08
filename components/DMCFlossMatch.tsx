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
import { formatCatalogDeltaE00, PICKED_COLOR_DISCLAIMER, VALUE_ANALYSIS_NOTE } from '@/lib/colorSemantics'
import { computeValueScale, getStepIndex, stepToGray } from '@/lib/valueScale'
import type { ValueBuffer } from '@/hooks/useImageAnalyzer'
import { getDMCColorFamily } from '@/lib/dmcFloss'

type ValueMapMode = 'original' | '3' | '5'
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'

interface DMCFlossMatchProps {
  rgb: { r: number; g: number; b: number }
  imageValue?: ImageValueContext | null
  valueBuffer?: ValueBuffer | null
  valueScaleClip?: number
  onColorSelect: (rgb: { r: number; g: number; b: number }) => void
}

const VISIBLE_MATCH_COUNT = 4

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
      ? 'h-16 w-full rounded-md'
      : size === 'lg'
        ? 'h-10 w-10 rounded-md'
        : 'h-8 w-8 rounded-full'

  return (
    <div
      className={`${sizeClass} shrink-0 border border-ink-hairline shadow-sm transition-transform duration-200 ${
        selected ? 'ring-1 ring-ink' : ''
      }`}
      style={{ backgroundColor: hex }}
      aria-hidden
    />
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted mb-2.5">
      {children}
    </h3>
  )
}

function ValueWarningsList({ warnings }: { warnings: ValueWarning[] }) {
  if (warnings.length === 0) return null
  return (
    <ul className="mt-3 space-y-1.5">
      {warnings.map((warning) => (
        <li
          key={warning.code}
          className={`rounded-lg border px-3 py-2 text-xs leading-snug ${
            warning.severity === 'caution'
              ? 'border-amber-200 bg-amber-50/50 text-amber-950'
              : 'border-ink-hairline bg-paper-recessed/50 text-ink-secondary'
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
    <div className="rounded-lg border border-ink-hairline bg-paper-recessed/30 px-3 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-bold text-ink">{sampleValue.bandLabel}</p>
        <p className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-ink-secondary">
          Value {sampleValue.normalizedPosition}
        </p>
      </div>
      {hint ? <p className="mt-1 text-[11px] text-ink-muted">{hint}</p> : null}
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
    <div className="py-4 border-t border-ink-hairline">
      <SectionLabel>Suggested rendering set</SectionLabel>
      <ul className="space-y-1.5">
        {context.suggestedSet.suggestions.map((entry) => (
          <li key={`${entry.role}-${entry.thread.id}`}>
            <button 
              type="button" 
              onClick={() => onSelect(entry.thread.rgb)} 
              className="flex w-full items-center gap-3 rounded-lg border border-ink-hairline bg-paper-elevated/40 px-3 py-2.5 text-left transition-all hover:bg-paper-recessed/50 group"
            >
              <ThreadSwatch hex={entry.thread.hex} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">{RENDERING_ROLE_LABELS[entry.role]}</p>
                <p className="font-mono text-sm font-bold text-ink leading-tight">DMC {entry.thread.number}</p>
                <p className="text-xs text-ink-secondary truncate">{entry.thread.name}</p>
              </div>
              <span className="shrink-0 font-mono text-xs text-ink-muted group-hover:text-ink-secondary transition-colors">
                {formatCatalogDeltaE00(entry.thread.deltaE00)}
              </span>
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
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] font-medium text-ink-muted">
        <span>Light end</span>
        <span>Dark end</span>
      </div>
      <div className="flex h-3.5 overflow-hidden rounded-md border border-ink-hairline shadow-sm">
        {ladder.map((thread) => (
          <button
            key={thread.id}
            type="button"
            onClick={() => onSelect(thread.rgb)}
            className={`min-w-0 flex-1 transition-all hover:opacity-90 relative ${
              thread.id === primaryId ? 'ring-1 ring-inset ring-ink scale-y-110 z-10' : ''
            }`}
            style={{ backgroundColor: thread.hex }}
            title={`DMC ${thread.number} · ${formatThreadValueBand(thread.oklab.L)}`}
            aria-label={`DMC ${thread.number}, ${formatThreadValueBand(thread.oklab.L)}`}
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
}: {
  code: string
  copiedCode: string | null
  onCopy: (e: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>, code: string) => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => onCopy(e, code)}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-ink-hairline bg-paper-elevated text-ink-secondary hover:text-ink hover:bg-paper-recessed transition-all shadow-sm"
      title="Copy DMC code"
      aria-label={`Copy DMC code ${code}`}
    >
      {copiedCode === code ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-green-600">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

  const sampleHex = rgb ? `#${((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1).toUpperCase()}` : ''

  return (
    <div className="space-y-6">
      {/* Editorial Swatch Comparison Hero */}
      <div className="grid grid-cols-2 gap-px bg-ink-hairline rounded-xl overflow-hidden border border-ink-hairline shadow-sm">
        {/* Left: Sampled Color */}
        <div className="bg-paper-elevated p-4 flex flex-col justify-between">
          <div>
            <span className="text-[9px] tracking-widest text-ink-muted font-bold uppercase block mb-2">Sampled Color</span>
            <div 
              className="w-full aspect-[4/3] rounded-md border border-ink-hairline shadow-inner mb-3 transition-colors duration-200"
              style={{ backgroundColor: sampleHex }}
            />
          </div>
          <div>
            <span className="font-mono text-sm font-semibold tracking-tight text-ink">{sampleHex}</span>
            <div className="text-[11px] font-mono text-ink-secondary mt-1 leading-relaxed">
              rgb({rgb.r}, {rgb.g}, {rgb.b})
            </div>
          </div>
        </div>

        {/* Right: Best DMC Match */}
        <div className="bg-paper-elevated p-4 flex flex-col justify-between relative">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[9px] tracking-widest text-ink font-bold uppercase block">Best Floss Match</span>
              <span className="text-[9px] font-semibold text-ink-muted font-mono">{getDMCColorFamily(primary.rgb, primary.name)}</span>
            </div>
            <div 
              className="w-full aspect-[4/3] rounded-md border border-ink-hairline shadow-inner mb-3 transition-colors duration-200"
              style={{ backgroundColor: primary.hex }}
            />
          </div>
          <div>
            <span className="font-serif text-lg font-bold text-ink leading-none block mb-0.5">DMC {primary.number}</span>
            <span className="text-xs text-ink-secondary truncate block mb-2" title={primary.name}>{primary.name}</span>
            
            <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-ink-hairline">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-ink-secondary">
                  {formatCatalogDeltaE00(primary.deltaE00)}
                </span>
                <span className="text-[9px] text-ink-muted leading-tight block">{primary.confidenceLabel}</span>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => onColorSelect(primary.rgb)}
                  className="p-1 rounded-md text-ink-secondary hover:text-ink hover:bg-paper-recessed border border-transparent transition-all"
                  title="Highlight on canvas"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <CopyCodeButton code={primary.number} copiedCode={copiedCode} onCopy={handleCopyCode} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Value Readout & Warnings */}
      <div className="space-y-3">
        <SampleValueHero context={context} />
        <ValueWarningsList warnings={valueWarnings} />
      </div>

      {/* Go Lighter / Go Darker companion suggestions */}
      {ladderPosition && (ladderPosition.lighter || ladderPosition.darker) ? (
        <div className="grid grid-cols-2 gap-3">
          {ladderPosition.lighter ? (
            <CompanionCard
              label="Go lighter"
              thread={ladderPosition.lighter}
              onSelect={onColorSelect}
            />
          ) : <div />}
          {ladderPosition.darker ? (
            <CompanionCard
              label="Go darker"
              thread={ladderPosition.darker}
              onSelect={onColorSelect}
            />
          ) : <div />}
        </div>
      ) : null}

      <SuggestedRenderingSetSection context={context} onSelect={onColorSelect} />

      {/* Family value ladder */}
      {showLadder ? (
        <div className="py-4 border-t border-ink-hairline">
          <SectionLabel>{primary.familyLabel} — light to dark</SectionLabel>
          <FamilyValueScale ladder={familyLadder} primaryId={primary.id} onSelect={onColorSelect} />

          <div className="mt-3 space-y-1.5">
            {familyLadder.map((thread) => {
              const isPrimary = thread.id === primary.id
              const shade = formatShadeStep(thread.shadeStep)

              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => onColorSelect(thread.rgb)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all ${
                    isPrimary
                      ? 'border-ink bg-paper-recessed/50'
                      : 'border-ink-hairline bg-paper-elevated/40 hover:bg-paper-recessed/50'
                  }`}
                >
                  <ThreadSwatch hex={thread.hex} size="lg" selected={isPrimary} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-mono text-sm font-bold text-ink">DMC {thread.number}</span>
                      {isPrimary ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">Match</span>
                      ) : null}
                    </div>
                    <p className="text-xs text-ink-secondary truncate">{thread.name}</p>
                    <p className="text-[11px] text-ink-muted mt-0.5 leading-none">
                      {formatThreadValueBand(thread.oklab.L)}
                      {shade ? ` · ${shade}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-ink-muted">
                    {Math.round(thread.oklab.L * 100)}%
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Other top matches */}
      {otherChoices.length > 0 ? (
        <div className="py-4 border-t border-ink-hairline">
          <SectionLabel>Other close matches</SectionLabel>
          <ul className="space-y-1.5">
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
        <div className="border-t border-ink-hairline pt-3">
          <button
            type="button"
            onClick={() => setShowAlternatives((open) => !open)}
            className="flex w-full items-center justify-between gap-3 text-left transition-colors hover:text-ink text-ink-secondary py-1"
            aria-expanded={showAlternatives}
          >
            <span className="text-xs font-semibold">More color families to consider</span>
            <span className="font-mono text-xs font-bold text-ink-muted">
              {showAlternatives ? 'Hide' : `Show ${extraAlternatives.length}`}
            </span>
          </button>

          {showAlternatives ? (
            <ul className="space-y-1.5 mt-3 animate-in fade-in duration-200">
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

      <div className="border-t border-ink-hairline pt-4">
        <ReducedValueMapPreview
          valueBuffer={valueBuffer}
          valueScaleClip={valueScaleClip}
          rgb={rgb}
        />
      </div>

      <footer className="space-y-1.5 border-t border-ink-hairline pt-4 text-[10px] leading-relaxed text-ink-muted">
        <p>{PICKED_COLOR_DISCLAIMER}</p>
        <p>{VALUE_ANALYSIS_NOTE}</p>
      </footer>
    </div>
  )
}

function AlternateMatchRow({
  match,
  onSelect,
  onCopy,
  copiedCode,
}: {
  match: ScoredDMCThread
  onSelect: (rgb: { r: number; g: number; b: number }) => void
  onCopy: (e: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>, code: string) => void
  copiedCode: string | null
}) {
  const shade = formatShadeStep(match.shadeStep)

  return (
    <div className="flex items-center gap-3 rounded-lg border border-ink-hairline bg-paper-elevated/40 p-2.5 hover:bg-paper-recessed/30 transition-all">
      <button
        type="button"
        onClick={() => onSelect(match.rgb)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <ThreadSwatch hex={match.hex} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="font-mono text-sm font-bold text-ink">DMC {match.number}</span>
            <span className="text-[10px] text-ink-muted truncate">{match.familyLabel}</span>
          </div>
          <p className="text-xs font-semibold text-ink-secondary truncate">{match.name}</p>
          <p className="text-[10px] text-ink-muted mt-0.5">
            {formatThreadValueBand(match.oklab.L)}
            {shade ? ` · ${shade}` : ''}
            <span className="font-mono font-bold text-ink-secondary"> · {formatCatalogDeltaE00(match.deltaE00)}</span>
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
      className="flex min-w-0 items-center gap-2.5 overflow-hidden rounded-lg border border-ink-hairline bg-paper-elevated/40 p-2.5 text-left transition-all hover:bg-paper-recessed/50 hover:border-ink-muted/30"
    >
      <div 
        className="h-7 w-7 rounded-full border border-ink-hairline shadow-sm shrink-0" 
        style={{ backgroundColor: thread.hex }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">{label}</p>
        <p className="font-mono text-xs font-bold leading-tight text-ink">DMC {thread.number}</p>
        <p className="text-[10px] leading-tight text-ink-secondary truncate">
          {formatThreadValueSummary(thread.oklab.L, thread.shadeStep)}
        </p>
      </div>
    </button>
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

  const sampleHex = rgb ? `#${((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1).toUpperCase()}` : ''

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Value grouping preview</SectionLabel>
        <div className="flex bg-paper-recessed/60 rounded-md p-0.5 border border-ink-hairline">
          {(['original', '3', '5'] as ValueMapMode[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                mode === option
                  ? 'bg-paper-elevated text-ink shadow-sm'
                  : 'text-ink-muted hover:text-ink-secondary'
              }`}
            >
              {option === 'original' ? 'Sample' : `${option}-val`}
            </button>
          ))}
        </div>
      </div>
      <div
        className="overflow-hidden rounded-lg border border-ink-hairline bg-paper-recessed"
        style={{ aspectRatio: `${valueBuffer.width} / ${valueBuffer.height}` }}
      >
        {mode === 'original' ? (
          <div
            className="h-full w-full"
            style={{ backgroundColor: sampleHex }}
            aria-label="Sampled color swatch"
          />
        ) : (
          <canvas ref={canvasRef} className="h-full w-full object-contain" />
        )}
      </div>
    </div>
  )
}
