'use client'

/**
 * Compact 3-step view of how a spectral mix was derived (artist-first, lab-optional).
 */

import { motion } from 'framer-motion'
import { Pigment } from '@/lib/spectral/types'
import {
  formatSpectralModelError,
  getSpectralModelFitPresentation,
  SPECTRAL_RECIPE_DISCLAIMER,
} from '@/lib/colorSemantics'

export interface MixPipelinePeekIngredient {
  pigment: Pigment
  weight: number
  percentage: string
}

export interface MixPipelinePeekPreview {
  predictedHex: string
  matchQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor'
  error: number
}

interface MixPipelinePeekProps {
  targetHex: string
  ingredients: MixPipelinePeekIngredient[]
  preview: MixPipelinePeekPreview | null
  mixSource: 'solver' | 'heuristic'
  /** Artist mode: plain fit words only. Lab mode: show model Δ. */
  showMetrics?: boolean
}

const FIT_DOT: Record<MixPipelinePeekPreview['matchQuality'], string> = {
  Excellent: 'bg-emerald-500',
  Good: 'bg-green-500',
  Fair: 'bg-amber-500',
  Poor: 'bg-red-500',
}

function StepCard({
  label,
  children,
  delay,
}: {
  label: string
  children: React.ReactNode
  delay: number
}) {
  return (
    <motion.div
      className="flex min-w-0 flex-1 flex-col rounded-[20px] border border-ink-hairline bg-[rgba(255,252,247,0.88)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.62)]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.22 }}
    >
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-ink-muted">{label}</div>
      <div className="mt-2 min-w-0">{children}</div>
    </motion.div>
  )
}

export default function MixPipelinePeek({
  targetHex,
  ingredients,
  preview,
  mixSource,
  showMetrics = false,
}: MixPipelinePeekProps) {
  const topIngredients = [...ingredients]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)

  const modelFit = preview ? getSpectralModelFitPresentation(preview.error) : null

  return (
    <section
      className="rounded-[24px] border border-ink-hairline bg-[rgba(255,252,247,0.72)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
      aria-label="How this mix was found"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-ink-muted">
          How this mix was found
        </h3>
        <span className="rounded-full border border-ink-hairline bg-paper px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-secondary">
          {mixSource === 'solver' ? 'Spectral solver' : 'Studio guide'}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <StepCard label="Your sample" delay={0}>
          <div
            className="h-14 w-full rounded-[14px] border border-black/8 shadow-[0_8px_20px_rgba(33,24,14,0.1)]"
            style={{ backgroundColor: targetHex }}
          />
          <p className="mt-2 font-mono text-[11px] font-bold text-ink-secondary">{targetHex.toUpperCase()}</p>
        </StepCard>

        <StepCard label="Pigment recipe" delay={0.06}>
          {topIngredients.length > 0 ? (
            <ul className="space-y-1.5">
              {topIngredients.map((ing) => (
                <li key={ing.pigment.id} className="flex items-center gap-2">
                  <span
                    className="h-5 w-5 shrink-0 rounded-md border border-black/8"
                    style={{ backgroundColor: ing.pigment.hex }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-ink">
                    {ing.pigment.name}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] font-bold text-ink-secondary">
                    {ing.percentage}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] leading-4 text-ink-secondary">
              Add paints in Library to search spectral mixes.
            </p>
          )}
        </StepCard>

        <StepCard label="Spectral preview" delay={0.12}>
          {preview ? (
            <>
              <div className="flex items-center gap-2">
                <div
                  className="h-14 flex-1 rounded-[14px] border border-black/8"
                  style={{ backgroundColor: preview.predictedHex }}
                />
                <div
                  className="h-14 w-14 shrink-0 rounded-[14px] border border-dashed border-ink-hairline"
                  style={{ backgroundColor: targetHex }}
                  title="Target"
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink">
                  <span className={`h-2 w-2 rounded-full ${FIT_DOT[preview.matchQuality]}`} />
                  {modelFit?.label ?? preview.matchQuality}
                </span>
                {showMetrics && (
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                    {formatSpectralModelError(preview.error)}
                  </span>
                )}
              </div>
              <p className="mt-1 font-mono text-[11px] text-ink-muted">{preview.predictedHex.toUpperCase()}</p>
            </>
          ) : (
            <p className="text-[11px] leading-4 text-ink-secondary">
              {mixSource === 'heuristic'
                ? 'Heuristic guide from hue and value — no spectral preview for this mix.'
                : 'Solver preview will appear when a spectral fit is available.'}
            </p>
          )}
        </StepCard>
      </div>

      <p className="mt-3 text-[11px] leading-4 text-ink-muted">{SPECTRAL_RECIPE_DISCLAIMER}</p>

      {showMetrics && (
        <p className="mt-2 text-[11px] leading-4 text-ink-muted">
          <span className="font-semibold text-ink-secondary">Lab note:</span> Kubelka–Munk mixing via spectral.js
          predicts how pigments combine in light; model Δ is OKLab distance on screen, not wet-paint ΔE.
        </p>
      )}
    </section>
  )
}
