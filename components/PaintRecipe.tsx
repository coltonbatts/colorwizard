'use client'

import { useEffect, useMemo, useState } from 'react'
import { generatePaintRecipe, HEURISTIC_WEIGHT_MAP } from '@/lib/colorMixer'
import { getSolverWorker } from '@/lib/workers'
import { solveRecipe, type SolveOptions } from '@/lib/paint/solveRecipe'
import type { SpectralRecipe } from '@/lib/spectral/types'
import type { Palette } from '@/lib/types/palette'
import { SkeletonPaintRecipe } from '@/components/ui/SkeletonLoader'
import { useDebouncedLoading } from '@/hooks/useDebounce'
import MixedColorPreview from './paint/MixedColorPreview'
import ProcreateExportButton from './ProcreateExportButton'
import { SPECTRAL_RECIPE_DISCLAIMER } from '@/lib/colorSemantics'
import type { ProcreateColor } from '@/lib/types/procreate'

interface PaintRecipeProps {
  hsl: { h: number; s: number; l: number }
  targetHex: string
  activePalette?: Palette
  useCatalog?: boolean
  brandId?: string
  lineId?: string
  paintIds?: string[]
  variant?: 'standard' | 'dashboard' | 'compact' | 'board'
  showExportButton?: boolean
  hideHeader?: boolean
  hideFooter?: boolean
  previewOnly?: boolean
  onRecipeResolved?: (recipe: DisplayRecipe) => void
}

const HEURISTIC_PIGMENT_MAP: Record<string, { hex: string; id: string }> = {
  'Titanium White': { hex: '#FDFDFD', id: 'titanium-white' },
  'Ivory Black': { hex: '#0B0B0B', id: 'ivory-black' },
  'Yellow Ochre': { hex: '#CC8E35', id: 'yellow-ochre' },
  'Cadmium Red': { hex: '#E52B21', id: 'cadmium-red' },
  'Phthalo Green': { hex: '#123524', id: 'phthalo-green' },
  'Phthalo Blue': { hex: '#0F2E53', id: 'phthalo-blue' },
}

export type DisplayRecipe = {
  source: 'solver' | 'heuristic'
  ingredients: SpectralRecipe['ingredients']
  steps: string[]
  preview: { predictedHex: string; matchQuality: SpectralRecipe['matchQuality']; error: number } | null
}

export default function PaintRecipe({
  hsl,
  targetHex,
  activePalette,
  useCatalog = false,
  brandId,
  lineId,
  paintIds,
  variant = 'standard',
  showExportButton = true,
  hideHeader = false,
  hideFooter = false,
  previewOnly = false,
  onRecipeResolved,
}: PaintRecipeProps) {
  const [spectralRecipe, setSpectralRecipe] = useState<SpectralRecipe | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const showLoading = useDebouncedLoading(isLoading, 100)
  const heuristicRecipe = useMemo(() => generatePaintRecipe(hsl), [hsl])
  const isEmptyCatalog = useCatalog && (!paintIds || paintIds.length === 0)

  useEffect(() => {
    let cancelled = false
    async function solve() {
      if (isEmptyCatalog) {
        setSpectralRecipe(null)
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      let options: SolveOptions | undefined
      if (useCatalog) options = { useCatalog: true, brandId, lineId, paintIds }
      else if (activePalette && !activePalette.isDefault) options = { paletteColorIds: activePalette.colors.map((color) => color.id) }

      try {
        const timeout = new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('Solver worker timed out')), 5000))
        const result = await Promise.race([getSolverWorker().solveRecipe(targetHex, options), timeout])
        if (!cancelled) setSpectralRecipe(result)
      } catch (error) {
        console.error('Spectral recipe worker failed:', error)
        if (!cancelled) {
          try { setSpectralRecipe(await solveRecipe(targetHex, options)) }
          catch (fallbackError) {
            console.error('Direct solveRecipe also failed:', fallbackError)
            setSpectralRecipe(null)
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void solve()
    return () => { cancelled = true }
  }, [activePalette, brandId, isEmptyCatalog, lineId, paintIds, targetHex, useCatalog])

  const fallbackIngredients = useMemo<SpectralRecipe['ingredients']>(() => {
    const raw = heuristicRecipe.colors.map((color) => {
      const pigment = HEURISTIC_PIGMENT_MAP[color.name] ?? { hex: '#888888', id: 'unknown' }
      return {
        pigment: { id: pigment.id, name: color.name, hex: pigment.hex, tintingStrength: 1 },
        weight: HEURISTIC_WEIGHT_MAP[color.amount] || 0.1,
        percentage: color.amount === 'none' ? '0%' : color.amount,
      }
    }).filter((ingredient) => ingredient.weight > 0)
    const total = raw.reduce((sum, ingredient) => sum + ingredient.weight, 0)
    return raw.map((ingredient) => ({ ...ingredient, weight: total ? ingredient.weight / total : 0 }))
  }, [heuristicRecipe.colors])

  const recipe = useMemo<DisplayRecipe>(() => spectralRecipe ? {
    source: 'solver',
    ingredients: spectralRecipe.ingredients,
    steps: spectralRecipe.steps,
    preview: { predictedHex: spectralRecipe.predictedHex, matchQuality: spectralRecipe.matchQuality, error: spectralRecipe.error },
  } : {
    source: 'heuristic', ingredients: fallbackIngredients, steps: heuristicRecipe.steps, preview: null,
  }, [fallbackIngredients, heuristicRecipe.steps, spectralRecipe])

  const sortedIngredients = useMemo(() => [...recipe.ingredients].sort((a, b) => b.weight - a.weight), [recipe.ingredients])
  const paletteLabel = useCatalog && paintIds?.length
    ? `${paintIds.length} library paints`
    : activePalette && !activePalette.isDefault ? activePalette.name : 'Core six-color mix'

  useEffect(() => {
    if (!isLoading && !isEmptyCatalog) onRecipeResolved?.(recipe)
  }, [isEmptyCatalog, isLoading, onRecipeResolved, recipe])

  if (showLoading) return <div className="paint-recipe-loading"><SkeletonPaintRecipe /></div>
  if (isEmptyCatalog) return <div className="paint-recipe-empty"><strong>No paints selected.</strong><span>Choose paints in Library.</span></div>

  if (previewOnly) {
    return (
      <div className="recipe-inline" aria-label="Practical mix preview">
        <div className="recipe-inline-names">
          {sortedIngredients.slice(0, 3).map((ingredient) => (
            <span key={ingredient.pigment.id}>
              <i style={{ backgroundColor: ingredient.pigment.hex }} aria-hidden="true" />
              {ingredient.pigment.name} <b>{ingredient.percentage}</b>
            </span>
          ))}
        </div>
        <div className="recipe-strand" aria-label={sortedIngredients.map((ingredient) => `${ingredient.pigment.name} ${ingredient.percentage}`).join(', ')}>
          {sortedIngredients.map((ingredient) => (
            <i key={ingredient.pigment.id} style={{ width: `${ingredient.weight * 100}%`, backgroundColor: ingredient.pigment.hex }} />
          ))}
        </div>
      </div>
    )
  }

  const firstPigment = sortedIngredients[0]?.pigment.name ?? 'the base paint'

  return (
    <section className={`paint-recipe paint-recipe--${variant}`} aria-label="Paint recipe">
      {!hideHeader && (
        <header className="paint-recipe-header">
          <div><span>Paint mix</span><h3>Target & predicted result</h3></div>
          <small>{paletteLabel}</small>
        </header>
      )}

      <MixedColorPreview targetHex={targetHex} preview={recipe.preview} mixSource={recipe.source} variant={variant} />

      <div className="paint-ingredients" aria-label="Pigments and ratios">
        {sortedIngredients.map((ingredient) => (
          <div key={ingredient.pigment.id}>
            <i style={{ backgroundColor: ingredient.pigment.hex }} aria-hidden="true" />
            <span>{ingredient.pigment.name}</span>
            <strong>{ingredient.percentage}</strong>
          </div>
        ))}
      </div>

      <div className="recipe-strand recipe-strand--large" aria-label="Proportional mix strand">
        {sortedIngredients.map((ingredient) => (
          <i key={ingredient.pigment.id} style={{ width: `${ingredient.weight * 100}%`, backgroundColor: ingredient.pigment.hex }} />
        ))}
      </div>

      <p className="paint-next-action"><span>Next</span> Start with {firstPigment}, then add the smaller amounts gradually.</p>

      <details className="paint-instructions group">
        <summary className="flex items-center justify-between cursor-pointer list-none hover:text-ink transition-colors duration-normal">
          <span className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
              className="w-4 h-4 text-ink-muted group-hover:text-ink transform transition-transform duration-normal group-open:rotate-90"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            Mixing instructions
          </span>
          <span>{recipe.steps.length} steps</span>
        </summary>
        <ol>
          {recipe.steps.map((step, index) => <li key={`${index}-${step}`}><b>{index + 1}</b><span>{step.replace(/\*\*/g, '')}</span></li>)}
        </ol>
      </details>

      {!hideFooter && (
        <footer className="paint-recipe-footer">
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer list-none hover:text-ink transition-colors duration-normal">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
                className="w-3.5 h-3.5 text-ink-muted group-hover:text-ink transform transition-transform duration-normal group-open:rotate-90"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
              About this prediction
            </summary>
            <p>{recipe.source === 'solver' ? SPECTRAL_RECIPE_DISCLAIMER : 'This hue-and-value guide is a practical starting point. Adjust by eye for paint, surface, and light.'}</p>
          </details>
          {showExportButton && (
            <ProcreateExportButton
              colors={recipe.ingredients.map((ingredient): ProcreateColor => ({ hex: ingredient.pigment.hex, name: ingredient.pigment.name }))}
              paletteName={`${targetHex.replace('#', '')} Recipe`}
              variant="secondary"
              className="paint-export"
            />
          )}
        </footer>
      )}
    </section>
  )
}
