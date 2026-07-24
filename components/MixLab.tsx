'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PALETTE } from '@/lib/spectral/palette'
import { MixInput } from '@/lib/spectral/types'
import { getSolverWorker } from '@/lib/workers'
import {
  formatSpectralModelError,
  getSpectralModelFitPresentation,
} from '@/lib/colorSemantics'
import type { DisplayRecipe } from '@/components/PaintRecipe'

interface MixLabProps {
  targetHex?: string
  /** Artist mode hides numeric model Δ */
  showMetrics?: boolean
  /** Populate sliders from the current solver recipe */
  solverRecipe?: DisplayRecipe | null
  onUseRecipe?: (inputs: MixInput[]) => void
}

export default function MixLab({
  targetHex,
  showMetrics = false,
  solverRecipe,
  onUseRecipe,
}: MixLabProps) {
  const [sliders, setSliders] = useState<Record<string, number>>(() =>
    Object.fromEntries(PALETTE.map((p) => [p.id, 0])),
  )
  const [mixedHex, setMixedHex] = useState<string>('#808080')
  const [mixError, setMixError] = useState<number | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isOverTarget, setIsOverTarget] = useState(false)
  const [isOverResult, setIsOverResult] = useState(false)

  const mixInputs = useMemo((): MixInput[] => {
    const total = Object.values(sliders).reduce((sum, v) => sum + v, 0)
    if (total === 0) return []
    return PALETTE.map((p) => ({
      pigmentId: p.id,
      weight: sliders[p.id] / total,
    })).filter((i) => i.weight > 0)
  }, [sliders])

  const calculateMix = useCallback(async () => {
    const total = Object.values(sliders).reduce((sum, v) => sum + v, 0)
    if (total === 0) {
      setMixedHex('#808080')
      setMixError(null)
      return
    }

    setIsCalculating(true)
    try {
      const solver = getSolverWorker()
      if (targetHex) {
        const result = await solver.mixInteractiveWithError(mixInputs, targetHex)
        setMixedHex(result.hex)
        setMixError(result.error)
      } else {
        const result = await solver.mixInteractive(mixInputs)
        setMixedHex(result.hex)
        setMixError(null)
      }
    } catch (err) {
      console.error('Mix calculation failed:', err)
      setMixedHex('#808080')
      setMixError(null)
    } finally {
      setIsCalculating(false)
    }
  }, [sliders, mixInputs, targetHex])

  useEffect(() => {
    const timer = setTimeout(() => void calculateMix(), 50)
    return () => clearTimeout(timer)
  }, [calculateMix])

  const handleSliderChange = (id: string, value: number) => {
    setSliders((prev) => ({ ...prev, [id]: value }))
  }

  const handleReset = () => {
    setSliders(Object.fromEntries(PALETTE.map((p) => [p.id, 0])))
  }

  const applySolverRecipe = () => {
    if (!solverRecipe || solverRecipe.ingredients.length === 0) return
    const maxWeight = Math.max(...solverRecipe.ingredients.map((i) => i.weight), 0.01)
    const next = Object.fromEntries(PALETTE.map((p) => [p.id, 0]))
    for (const ing of solverRecipe.ingredients) {
      next[ing.pigment.id] = Math.round((ing.weight / maxWeight) * 100)
    }
    setSliders(next)
  }

  const handleDropOnResult = (e: React.DragEvent) => {
    e.preventDefault()
    setIsOverResult(false)
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      if (data.type === 'pigment' && data.id) {
        setSliders((prev) => ({ ...prev, [data.id]: (prev[data.id] || 0) + 10 }))
      }
    } catch (err) {
      console.error('Drop failed', err)
    }
  }

  const totalWeight = Object.values(sliders).reduce((sum, v) => sum + v, 0)
  const modelFit = mixError !== null ? getSpectralModelFitPresentation(mixError) : null

  const canApplySolver =
    solverRecipe &&
    solverRecipe.source === 'solver' &&
    solverRecipe.ingredients.length > 0

  // Active pigments calculation for visual proportion strand
  const activeProportions = useMemo(() => {
    if (totalWeight === 0) return []
    return PALETTE.map((p) => ({
      pigment: p,
      percentage: Math.round((sliders[p.id] / totalWeight) * 100),
      weight: sliders[p.id] / totalWeight,
    })).filter((item) => item.percentage > 0)
  }, [sliders, totalWeight])

  return (
    <div className="space-y-4">
      {/* Bento Header Bar */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-ink-hairline bg-paper-elevated p-4 shadow-sm">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-muted">
            Subtractive Mixing Lab
          </span>
          <h3 className="font-serif text-base font-semibold tracking-tight text-ink">
            Kubelka–Munk Spectral Mixing
          </h3>
          <p className="mt-0.5 text-xs text-ink-secondary">
            Simulates real oil and acrylic pigment behavior, not RGB light.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="min-h-10 shrink-0 rounded-xl border border-ink-hairline bg-paper px-3 text-xs font-medium uppercase tracking-[0.08em] text-ink-secondary transition-all hover:bg-paper-recessed hover:text-ink active:scale-95"
        >
          Reset Mix
        </button>
      </div>

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Card 1: Result & Swatches (Span 5 on LG) */}
        <div className="flex flex-col justify-between rounded-2xl border border-ink-hairline bg-paper-elevated p-5 shadow-sm lg:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-muted">
              Mixed Result
            </span>
            {targetHex && (
              <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-muted">
                Target Reference
              </span>
            )}
          </div>

          <div className="flex items-center justify-around py-4">
            {/* Mixed Swatch Well */}
            <div className="flex flex-col items-center">
              <motion.div
                layout
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsOverResult(true)
                }}
                onDragLeave={() => setIsOverResult(false)}
                onDrop={handleDropOnResult}
                animate={{ scale: isOverResult ? 1.05 : 1 }}
                className={`relative h-28 w-28 rounded-full border border-ink-hairline shadow-md transition-shadow ${
                  isOverResult ? 'ring-2 ring-ink ring-offset-2' : ''
                }`}
                style={{ backgroundColor: mixedHex }}
              >
                <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/10" />
              </motion.div>
              <div className="mt-3 font-mono text-xs font-semibold tabular-nums text-ink">
                {isCalculating ? 'Mixing…' : mixedHex.toUpperCase()}
              </div>
              {targetHex && mixError !== null && (
                <div className="mt-1 text-center">
                  <span className="rounded-full border border-ink-hairline bg-paper-recessed px-2.5 py-0.5 font-mono text-[10px] font-semibold text-ink">
                    {modelFit?.label}
                  </span>
                  {showMetrics && (
                    <div className="mt-1 font-mono text-[10px] text-ink-muted">
                      {formatSpectralModelError(mixError)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Target Swatch Well if present */}
            {targetHex && (
              <div className="flex flex-col items-center">
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsOverTarget(true)
                  }}
                  onDragLeave={() => setIsOverTarget(false)}
                  className={`h-20 w-20 rounded-full border-2 border-dashed border-ink-hairline shadow-sm transition-all ${
                    isOverTarget ? 'border-ink scale-105' : ''
                  }`}
                  style={{ backgroundColor: targetHex }}
                />
                <div className="mt-3 font-mono text-xs text-ink-muted tabular-nums">
                  {targetHex.toUpperCase()}
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Visual Mixing Proportion Strand */}
          <div className="mt-4 border-t border-ink-hairline pt-3">
            <div className="mb-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.08em] text-ink-muted">
              <span>Mixing Proportion Strand</span>
              <span className="font-mono tabular-nums">{activeProportions.length} Pigments</span>
            </div>

            <div className="relative h-4 w-full overflow-hidden rounded-full border border-ink-hairline bg-paper-recessed flex">
              <AnimatePresence>
                {activeProportions.length > 0 ? (
                  activeProportions.map((item) => (
                    <motion.div
                      key={item.pigment.id}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      exit={{ width: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      style={{ backgroundColor: item.pigment.hex }}
                      className="h-full relative group"
                      title={`${item.pigment.name}: ${item.percentage}%`}
                    />
                  ))
                ) : (
                  <div className="flex w-full items-center justify-center text-[10px] italic text-ink-muted">
                    Empty palette well
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Card 2: Pigment Tray (Span 7 on LG) */}
        <div className="rounded-2xl border border-ink-hairline bg-paper-elevated p-5 shadow-sm lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-muted">
                Pigment Palette Tray
              </span>
              <span className="text-[10px] text-ink-muted">
                Drag or click chip to add
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
              {PALETTE.map((pigment) => {
                const isSelected = sliders[pigment.id] > 0
                return (
                  <button
                    key={pigment.id}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        'application/json',
                        JSON.stringify({ type: 'pigment', id: pigment.id, name: pigment.name }),
                      )
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                    onClick={() => handleSliderChange(pigment.id, isSelected ? 0 : 50)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-all ${
                      isSelected
                        ? 'border-ink bg-paper shadow-sm ring-1 ring-ink/20'
                        : 'border-ink-hairline bg-paper/50 hover:bg-paper hover:border-linen'
                    }`}
                  >
                    <div
                      className="h-9 w-9 rounded-full border border-ink-hairline shadow-inner"
                      style={{ backgroundColor: pigment.hex }}
                    />
                    <span className="w-full truncate text-[11px] font-medium text-ink">
                      {pigment.name.split(' ')[0]}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-4 border-t border-ink-hairline pt-3 flex flex-col sm:flex-row gap-2">
            {canApplySolver && (
              <button
                type="button"
                onClick={applySolverRecipe}
                className="flex-1 min-h-11 rounded-xl border border-ink-hairline bg-paper px-4 text-xs font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:bg-paper-recessed"
              >
                Apply Solver Formula
              </button>
            )}

            {onUseRecipe && (
              <button
                type="button"
                onClick={() => onUseRecipe(mixInputs)}
                disabled={mixInputs.length === 0}
                className="flex-1 min-h-11 rounded-xl border border-ink-hairline bg-paper-recessed px-4 text-xs font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:bg-paper disabled:opacity-40"
              >
                Set as Base Recipe
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bento Card 3: Fine-Tune Sliders */}
      <div className="rounded-2xl border border-ink-hairline bg-paper-elevated p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-muted">
            Fine Proportion Controls
          </span>
          <span className="font-mono text-xs text-ink-secondary tabular-nums">
            Total Weight: {totalWeight}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PALETTE.map((pigment) => {
            const value = sliders[pigment.id]
            const percentage = totalWeight > 0 ? Math.round((value / totalWeight) * 100) : 0
            return (
              <div
                key={pigment.id}
                className={`flex items-center gap-3 rounded-xl border p-2.5 transition-colors ${
                  value > 0 ? 'border-ink-hairline bg-paper' : 'border-transparent bg-paper/30'
                }`}
              >
                <button
                  type="button"
                  className="h-8 w-8 shrink-0 rounded-full border border-ink-hairline shadow-sm"
                  style={{ backgroundColor: pigment.hex }}
                  onClick={() => handleSliderChange(pigment.id, value === 0 ? 50 : 0)}
                  aria-label={`Toggle ${pigment.name}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-xs text-ink-secondary mb-1">
                    <span className="truncate font-medium">{pigment.name}</span>
                    <span className={`font-mono text-xs tabular-nums ${percentage > 0 ? 'font-bold text-ink' : 'text-ink-muted'}`}>
                      {percentage}%
                    </span>
                  </div>
                  <input
                    name={`mix-${pigment.id}`}
                    aria-label={`Adjust ${pigment.name} amount`}
                    type="range"
                    min={0}
                    max={100}
                    value={value}
                    onChange={(e) => handleSliderChange(pigment.id, parseInt(e.target.value, 10))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-paper-recessed accent-ink"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

