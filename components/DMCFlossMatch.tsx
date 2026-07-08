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
    <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-ink-muted mb-3">
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
    <div className="py-4 border-t border-ink-hairline">
      <SectionLabel>Suggested Palette Deck</SectionLabel>
      <div className="grid grid-cols-3 gap-2">
        {suggestions.map((entry) => (
          <button
            key={`${entry.role}-${entry.thread.id}`}
            type="button"
            onClick={() => onSelect(entry.thread.rgb)}
            className="flex flex-col items-stretch p-2 rounded-lg border border-ink-hairline bg-paper-elevated hover:bg-paper-recessed/50 transition-all text-left group shadow-sm hover:scale-[1.02]"
          >
            <div 
              className="w-full h-8 rounded border border-ink-hairline shadow-inner transition-transform group-hover:scale-95 duration-200" 
              style={{ backgroundColor: entry.thread.hex }}
            />
            <div className="mt-2 text-center min-w-0">
              <span className="text-[8px] font-black uppercase tracking-wider text-ink-muted block truncate">
                {RENDERING_ROLE_LABELS[entry.role]}
              </span>
              <span className="font-mono text-xs font-bold text-ink block mt-0.5 leading-none">
                {entry.thread.number}
              </span>
              <span className="font-mono text-[9px] text-ink-secondary block mt-1">
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
      <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-ink-muted">
        <span>Light end</span>
        <span>Dark end</span>
      </div>
      <div className="flex h-4 overflow-hidden rounded-md border border-ink-hairline shadow-sm">
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
    <div className="space-y-6">
      {/* Symmetrical Pantone-Style Swatch Comparison Block */}
      <div className="border border-ink-hairline rounded-xl overflow-hidden bg-paper-elevated shadow-md transition-all duration-300">
        
        {/* Symmetrical side-by-side color blocks with no gap */}
        <div className="grid grid-cols-2 h-32 relative">
          <div 
            className="w-full h-full relative" 
            style={{ backgroundColor: sampleHex }}
          >
            <div className="absolute top-2.5 left-3 bg-black/40 text-[8px] font-black uppercase tracking-widest text-white/90 px-1.5 py-0.5 rounded backdrop-blur-sm select-none">
              Sampled
            </div>
          </div>
          <div 
            className="w-full h-full relative border-l border-ink-hairline" 
            style={{ backgroundColor: primary.hex }}
          >
            <div className="absolute top-2.5 right-3 bg-black/40 text-[8px] font-black uppercase tracking-widest text-white/90 px-1.5 py-0.5 rounded backdrop-blur-sm select-none">
              DMC Match
            </div>
          </div>
        </div>

        {/* Symmetrical metadata labels below color swatches */}
        <div className="grid grid-cols-2 divide-x divide-ink-hairline border-t border-ink-hairline">
          <div className="p-4 flex flex-col justify-between">
            <div>
              <span className="text-[8px] font-black uppercase tracking-[0.16em] text-ink-muted">RGB Data</span>
              <span className="font-mono text-base font-black text-ink block mt-1 tracking-tight">{sampleHex}</span>
            </div>
            <span className="font-mono text-[10px] text-ink-secondary mt-1 block">
              ({rgb.r}, {rgb.g}, {rgb.b})
            </span>
          </div>

          <div className="p-4 flex flex-col justify-between">
            <div>
              <span className="text-[8px] font-black uppercase tracking-[0.16em] text-ink-muted">
                {getDMCColorFamily(primary.rgb, primary.name)}
              </span>
              <span className="font-serif text-base font-bold text-ink block mt-1 leading-none">
                DMC {primary.number}
              </span>
            </div>
            <span className="text-xs text-ink-secondary truncate block mt-1" title={primary.name}>
              {primary.name}
            </span>
          </div>
        </div>

        {/* Delta E score banner - centered and symmetrical */}
        <div className="bg-paper-recessed/40 text-center py-2 px-3 border-t border-ink-hairline flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="font-bold text-ink font-mono bg-paper px-1.5 py-0.5 rounded border border-ink-hairline shadow-sm">
              {formatCatalogDeltaE00(primary.deltaE00)}
            </span>
            <span className="text-ink-secondary font-medium font-sans">
              · {primary.confidenceLabel}
            </span>
          </div>
          <span className="text-[10px] text-ink-muted font-mono">
            {formatThreadValueBand(primary.oklab.L)}
          </span>
        </div>

        {/* Symmetrical Action Button Bar */}
        <div className="grid grid-cols-2 divide-x divide-ink-hairline border-t border-ink-hairline bg-paper-elevated">
          <button
            onClick={() => onColorSelect(primary.rgb)}
            className="py-2.5 text-[10px] font-black uppercase tracking-wider text-ink-secondary hover:text-ink hover:bg-paper-recessed/30 transition-all flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Highlight on Image
          </button>
          
          <button
            onClick={() => handleCopyCode(primary.number)}
            className="py-2.5 text-[10px] font-black uppercase tracking-wider text-ink-secondary hover:text-ink hover:bg-paper-recessed/30 transition-all flex items-center justify-center gap-1.5"
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
        <div className="py-4 border-t border-ink-hairline space-y-3">
          <SectionLabel>{primary.familyLabel} Value Scale</SectionLabel>
          <FamilyValueScale ladder={familyLadder} primaryId={primary.id} onSelect={onColorSelect} />

          {/* Symmetrical list of family items in a clean double-column grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {familyLadder.map((thread) => {
              const isPrimary = thread.id === primary.id

              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => onColorSelect(thread.rgb)}
                  className={`flex items-center gap-2 rounded-lg border p-2 text-left transition-all ${
                    isPrimary
                      ? 'border-ink bg-paper-recessed/50'
                      : 'border-ink-hairline bg-paper-elevated/40 hover:bg-paper-recessed/30'
                  }`}
                >
                  <div 
                    className="w-7 h-7 rounded-md border border-ink-hairline shrink-0" 
                    style={{ backgroundColor: thread.hex }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono text-xs font-bold text-ink leading-none">{thread.number}</span>
                      {isPrimary && (
                        <span className="text-[8px] font-black uppercase text-ink-muted">Match</span>
                      )}
                    </div>
                    <p className="text-[10px] text-ink-secondary truncate mt-0.5">{thread.name}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Alternative Matches list */}
      {otherChoices.length > 0 ? (
        <div className="py-4 border-t border-ink-hairline space-y-3">
          <SectionLabel>Alternative Matches</SectionLabel>
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
            <span className="text-[9px] font-black uppercase tracking-wider text-ink-muted">More Families to Consider</span>
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
  onCopy: (code: string) => void
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
        <div 
          className="h-10 w-10 rounded-md border border-ink-hairline shrink-0" 
          style={{ backgroundColor: match.hex }}
        />
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
      
      <button
        type="button"
        onClick={() => onCopy(match.number)}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-ink-hairline bg-paper-elevated text-ink-secondary hover:text-ink hover:bg-paper-recessed transition-all shadow-sm"
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
