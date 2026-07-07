'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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

  const [isOverTarget, setIsOverTarget] = useState(false)
  const [isOverResult, setIsOverResult] = useState(false)

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
  const modelFit =
    mixError !== null ? getSpectralModelFitPresentation(mixError) : null

  const canApplySolver =
    solverRecipe &&
    solverRecipe.source === 'solver' &&
    solverRecipe.ingredients.length > 0

  return (
    <div className="rounded-lg border border-ink-hairline bg-paper-elevated p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">
            Subtractive mixing
          </h3>
          <p className="mt-1 text-[11px] text-ink-secondary">
            Pigments mix as paint, not as light — Kubelka–Munk, computed spectrally
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md border border-ink-hairline bg-paper px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-secondary transition-colors hover:bg-paper-recessed hover:text-ink"
        >
          Reset
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-center gap-6 rounded-md border border-ink-hairline bg-paper px-4 py-6">
        <div className="flex flex-col items-center">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">
            Mixed
          </div>
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsOverResult(true)
            }}
            onDragLeave={() => setIsOverResult(false)}
            onDrop={handleDropOnResult}
            className={`h-28 w-28 rounded-full border transition-shadow ${
              isOverResult ? 'border-ink shadow-[0_0_0_2px_rgba(26,26,26,0.2)]' : 'border-ink-hairline'
            }`}
            style={{ backgroundColor: mixedHex }}
          />
          <div className="mt-2 font-mono text-[11px] text-ink-secondary">
            {isCalculating ? 'Mixing…' : mixedHex.toUpperCase()}
          </div>
          {targetHex && mixError !== null && (
            <div className="mt-2 text-center">
              <span className="text-[11px] font-semibold text-ink">
                {modelFit?.label}
              </span>
              {showMetrics && (
                <div className="mt-0.5 font-mono text-[10px] text-ink-faint">
                  {formatSpectralModelError(mixError)}
                </div>
              )}
            </div>
          )}
        </div>

        {targetHex && (
          <div className="flex flex-col items-center">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">
              Target
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsOverTarget(true)
              }}
              onDragLeave={() => setIsOverTarget(false)}
              className={`h-20 w-20 rounded-full border border-dashed ${
                isOverTarget ? 'border-ink' : 'border-ink-hairline'
              }`}
              style={{ backgroundColor: targetHex }}
            />
            <div className="mt-2 font-mono text-[10px] text-ink-faint">{targetHex.toUpperCase()}</div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <h4 className="mb-3 text-center text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">
          Drag pigments into the mix
        </h4>
        <div className="flex flex-wrap justify-center gap-3">
          {PALETTE.map((pigment) => (
            <div
              key={pigment.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  'application/json',
                  JSON.stringify({ type: 'pigment', id: pigment.id, name: pigment.name }),
                )
                e.dataTransfer.effectAllowed = 'copy'
              }}
              className="flex cursor-grab flex-col items-center gap-1 active:cursor-grabbing"
              title={`Drag ${pigment.name}`}
            >
              <div
                className="h-10 w-10 rounded-full border border-ink-hairline"
                style={{ backgroundColor: pigment.hex }}
              />
              <span className="w-14 text-center text-[9px] font-medium uppercase leading-none text-ink-muted">
                {pigment.name.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 border-t border-ink-hairline pt-4">
        <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">
          Fine tune
        </h4>
        {PALETTE.map((pigment) => {
          const value = sliders[pigment.id]
          const percentage = totalWeight > 0 ? Math.round((value / totalWeight) * 100) : 0
          return (
            <div key={pigment.id} className="flex items-center gap-3">
              <button
                type="button"
                className="h-5 w-5 shrink-0 rounded border border-ink-hairline"
                style={{ backgroundColor: pigment.hex }}
                onClick={() => handleSliderChange(pigment.id, value === 0 ? 50 : 0)}
                aria-label={`Toggle ${pigment.name}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between text-[11px] text-ink-secondary">
                  <span className="truncate">{pigment.name}</span>
                  <span className={`font-mono tabular-nums ${percentage > 0 ? 'text-ink' : ''}`}>{percentage}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={value}
                  onChange={(e) => handleSliderChange(pigment.id, parseInt(e.target.value, 10))}
                  className="mt-1 h-1 w-full cursor-pointer appearance-none rounded-lg bg-paper-recessed accent-ink"
                />
              </div>
            </div>
          )
        })}
        {totalWeight === 0 && (
          <p className="py-2 text-center text-[10px] italic text-ink-faint">
            Drag pigments above or apply the solver recipe below.
          </p>
        )}
      </div>

      {canApplySolver && (
        <button
          type="button"
          onClick={applySolverRecipe}
          className="studio-action mt-4 w-full py-3 text-[11px] font-medium uppercase tracking-[0.08em]"
        >
          Apply solver recipe to well
        </button>
      )}

      {onUseRecipe && (
        <button
          type="button"
          onClick={() => onUseRecipe(mixInputs)}
          disabled={mixInputs.length === 0}
          className="mt-2 w-full rounded-md border border-ink-hairline bg-paper-recessed py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-secondary transition-colors hover:bg-paper hover:text-ink disabled:opacity-40"
        >
          Set as base recipe
        </button>
      )}
    </div>
  )
}
