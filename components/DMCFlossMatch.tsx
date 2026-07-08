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

import type { ReactNode } from 'react'

type ValueMapMode = 'original' | '3' | '5'

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
  base: 'Base / Local',
  shadow: 'Shadow',
  'anchor-dark': 'Anchor Dark',
}

function formatThreadValueBand(oklabL: number): string {
  if (oklabL >= 0.88) return 'Very light'
  if (oklabL >= 0.74) return 'Light'
  if (oklabL >= 0.58) return 'Mid'
  if (oklabL >= 0.42) return 'Dark'
  if (oklabL >= 0.28) return 'Very dark'
  return 'Deep dark'
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
      {children}
    </h3>
  )
}

function ValueWarningsList({ warnings }: { warnings: ValueWarning[] }) {
  if (warnings.length === 0) return null
  return (
    <ul className="space-y-1.5">
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

function SuggestedRenderingSetSection({
  context,
  onSelect,
}: {
  context: ThreadMatchResult
  onSelect: (rgb: { r: number; g: number; b: number }) => void
}) {
  const suggestions = context.suggestedSet.suggestions.filter(s => s.role !== 'anchor-dark')
  if (suggestions.length <= 1) return null

  return (
    <div className="border-t border-ink-hairline py-5">
      <SectionLabel>Suggested Palette Deck</SectionLabel>
      <div className="grid grid-cols-3 gap-3">
        {suggestions.map((entry) => (
          <button
            key={`${entry.role}-${entry.thread.id}`}
            type="button"
            onClick={() => onSelect(entry.thread.rgb)}
            className="group flex flex-col items-stretch rounded-lg border border-ink-hairline bg-paper-elevated p-3 text-left transition-all hover:bg-paper-recessed/50"
          >
            <div 
              className="h-11 w-full rounded border border-ink-hairline shadow-inner transition-transform duration-200 group-hover:scale-95" 
              style={{ backgroundColor: entry.thread.hex }}
            />
            <div className="mt-2 text-center min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
                {RENDERING_ROLE_LABELS[entry.role]}
              </span>
              <span className="mt-1 block font-mono text-sm font-bold leading-none text-ink">
                {entry.thread.number}
              </span>
              <span className="mt-1 block font-mono text-xs text-ink-secondary">
                {entry.thread.deltaE00.toFixed(1)}
              </span>
            </div>
          </button>
        ))}
      </div>
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
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
        <span>Light end</span>
        <span>Dark end</span>
      </div>
      <div className="flex h-6 overflow-hidden rounded-md border border-ink-hairline shadow-sm">
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

  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 1800)
  }, [])

  if (!context) {
    return null
  }

  const { primary, familyLadder, alternatives, topMatches, valueWarnings } = context
  const showLadder = familyLadder.length > 1
  const otherChoices = topMatches.filter((match) => match.id !== primary.id).slice(0, VISIBLE_MATCH_COUNT - 1)
  const extraAlternatives = alternatives.filter(
    (thread) => !topMatches.some((match) => match.id === thread.id),
  )

  const sampleHex = rgb ? `#${((1 << 24) + (rgb.r << 16) + (rgb.g << 8) + rgb.b).toString(16).slice(1).toUpperCase()}` : ''

  return (
    <div className="space-y-7">
      {/* Symmetrical Pantone-Style Swatch Comparison Block */}
      <div className="overflow-hidden rounded-xl border border-ink-hairline bg-paper-elevated shadow-md transition-all duration-300">
        
        {/* Symmetrical side-by-side color blocks with no gap */}
        <div className="relative grid h-44 grid-cols-2">
          <div 
            className="w-full h-full relative" 
            style={{ backgroundColor: sampleHex }}
          >
            <div className="absolute left-3 top-3 select-none rounded bg-black/45 px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/90 backdrop-blur-sm">
              Sampled
            </div>
          </div>
          <div 
            className="w-full h-full relative border-l border-ink-hairline" 
            style={{ backgroundColor: primary.hex }}
          >
            <div className="absolute right-3 top-3 select-none rounded bg-black/45 px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/90 backdrop-blur-sm">
              DMC Match
            </div>
          </div>
        </div>

        {/* Symmetrical metadata labels below color swatches */}
        <div className="grid grid-cols-2 divide-x divide-ink-hairline border-t border-ink-hairline">
          <div className="flex flex-col justify-between p-5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">RGB Data</span>
              <span className="mt-1 block font-mono text-lg font-bold tracking-tight text-ink">{sampleHex}</span>
            </div>
            <span className="mt-1 block font-mono text-sm text-ink-secondary">
              ({rgb.r}, {rgb.g}, {rgb.b})
            </span>
          </div>

          <div className="flex flex-col justify-between p-5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                {getDMCColorFamily(primary.rgb, primary.name)}
              </span>
              <span className="mt-1 block font-serif text-xl font-bold leading-tight text-ink">
                DMC {primary.number}
              </span>
            </div>
            <span className="mt-1 block text-sm leading-snug text-ink-secondary" title={primary.name}>
              {primary.name}
            </span>
          </div>
        </div>

        {/* Delta E score banner - centered and symmetrical */}
        <div className="flex items-center justify-between border-t border-ink-hairline bg-paper-recessed/40 px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="rounded border border-ink-hairline bg-paper px-2 py-1 font-mono font-bold text-ink shadow-sm">
              {formatCatalogDeltaE00(primary.deltaE00)}
            </span>
            <span className="font-sans font-medium text-ink-secondary">
              · {primary.confidenceLabel}
            </span>
          </div>
          <span className="font-mono text-xs text-ink-muted">
            {formatThreadValueBand(primary.oklab.L)}
          </span>
        </div>

        {/* Symmetrical Action Button Bar */}
        <div className="grid grid-cols-2 divide-x divide-ink-hairline border-t border-ink-hairline bg-paper-elevated">
          <button
            onClick={() => onColorSelect(primary.rgb)}
            className="flex items-center justify-center gap-2 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-ink-secondary transition-all hover:bg-paper-recessed/30 hover:text-ink"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Highlight on Image
          </button>
          
          <button
            onClick={() => handleCopyCode(primary.number)}
            className="flex items-center justify-center gap-2 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-ink-secondary transition-all hover:bg-paper-recessed/30 hover:text-ink"
          >
            {copiedCode === primary.number ? (
              <>
                <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-600">Copied</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <rect x="9" y="9" width="10" height="10" rx="2" />
                  <rect x="5" y="5" width="10" height="10" rx="2" />
                </svg>
                Copy DMC Code
              </>
            )}
          </button>
        </div>
      </div>

      {/* Warnings & Value Readouts */}
      <ValueWarningsList warnings={valueWarnings} />

      <SuggestedRenderingSetSection context={context} onSelect={onColorSelect} />

      {/* Family value ladder */}
      {showLadder ? (
        <div className="space-y-4 border-t border-ink-hairline py-5">
          <SectionLabel>{primary.familyLabel} Value Scale</SectionLabel>
          <FamilyValueScale ladder={familyLadder} primaryId={primary.id} onSelect={onColorSelect} />

          {/* Symmetrical list of family items in a clean double-column grid */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {familyLadder.map((thread) => {
              const isPrimary = thread.id === primary.id

              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => onColorSelect(thread.rgb)}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                    isPrimary
                      ? 'border-ink bg-paper-recessed/50'
                      : 'border-ink-hairline bg-paper-elevated/40 hover:bg-paper-recessed/30'
                  }`}
                >
                  <div 
                    className="h-9 w-9 shrink-0 rounded-md border border-ink-hairline" 
                    style={{ backgroundColor: thread.hex }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <span className="font-mono text-sm font-bold leading-none text-ink">{thread.number}</span>
                      {isPrimary && (
                        <span className="text-xs font-semibold uppercase text-ink-muted">Match</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-snug text-ink-secondary">{thread.name}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Alternative Matches list */}
      {otherChoices.length > 0 ? (
        <div className="space-y-4 border-t border-ink-hairline py-5">
          <SectionLabel>Alternative Matches</SectionLabel>
          <ul className="space-y-2">
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
        <div className="border-t border-ink-hairline pt-4">
          <button
            type="button"
            onClick={() => setShowAlternatives((open) => !open)}
            className="flex w-full items-center justify-between gap-3 py-1 text-left text-ink-secondary transition-colors hover:text-ink"
            aria-expanded={showAlternatives}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">More Families to Consider</span>
            <span className="font-mono text-xs font-bold text-ink-muted">
              {showAlternatives ? 'Hide' : `Show ${extraAlternatives.length}`}
            </span>
          </button>

          {showAlternatives ? (
            <ul className="mt-3 space-y-2 animate-in fade-in duration-200">
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

      <footer className="space-y-2 border-t border-ink-hairline pt-4 text-xs leading-relaxed text-ink-muted">
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
  onCopy: (code: string) => void
  copiedCode: string | null
}) {
  const shade = formatShadeStep(match.shadeStep)

  return (
    <div className="flex items-center gap-3 rounded-lg border border-ink-hairline bg-paper-elevated/40 p-3 transition-all hover:bg-paper-recessed/30">
      <button
        type="button"
        onClick={() => onSelect(match.rgb)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <div 
          className="h-12 w-12 shrink-0 rounded-md border border-ink-hairline" 
          style={{ backgroundColor: match.hex }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="font-mono text-base font-bold text-ink">DMC {match.number}</span>
            <span className="text-xs text-ink-muted">{match.familyLabel}</span>
          </div>
          <p className="text-sm font-semibold leading-snug text-ink-secondary">{match.name}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            {formatThreadValueBand(match.oklab.L)}
            {shade ? ` · ${shade}` : ''}
            <span className="font-mono font-bold text-ink-secondary"> · {formatCatalogDeltaE00(match.deltaE00)}</span>
          </p>
        </div>
      </button>
      
      <button
        type="button"
        onClick={() => onCopy(match.number)}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-ink-hairline bg-paper-elevated text-ink-secondary shadow-sm transition-all hover:bg-paper-recessed hover:text-ink"
        title="Copy DMC code"
      >
        {copiedCode === match.number ? (
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
    </div>
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
        <SectionLabel>Value Grouping Preview</SectionLabel>
        <div className="flex rounded-md border border-ink-hairline bg-paper-recessed/60 p-0.5">
          {(['original', '3', '5'] as ValueMapMode[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              className={`rounded px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] transition-all ${
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
