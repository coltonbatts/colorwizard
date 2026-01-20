'use client'

import { useState, useEffect } from 'react'
import { generatePaintRecipe, HEURISTIC_WEIGHT_MAP } from '@/lib/colorMixer'
import { getSolverWorker } from '@/lib/workers'
import { solveRecipe, SolveOptions } from '@/lib/paint/solveRecipe'
import { SpectralRecipe } from '@/lib/spectral/types'
import { Palette } from '@/lib/types/palette'
import { SkeletonPaintRecipe } from '@/components/ui/SkeletonLoader'
import { useDebouncedLoading } from '@/hooks/useDebounce'
import PuddleRecipeDisplay from './paint/PuddleRecipeDisplay'

interface PaintRecipeProps {
  hsl: { h: number; s: number; l: number }
  targetHex: string
  activePalette?: Palette
  /**
   * Use the new paint catalog instead of legacy palette.
   * When true, brandId and lineId are used for filtering.
   */
  useCatalog?: boolean
  /** Brand ID when using catalog */
  brandId?: string
  /** Line ID when using catalog */
  lineId?: string
  /** Specific paint IDs to use (overrides brandId/lineId filter) */
  paintIds?: string[]
}

// Match quality colors
const QUALITY_COLORS = {
  Excellent: { text: 'text-green-400', bg: 'bg-green-500' },
  Good: { text: 'text-emerald-400', bg: 'bg-emerald-500' },
  Fair: { text: 'text-yellow-400', bg: 'bg-yellow-500' },
  Poor: { text: 'text-red-400', bg: 'bg-red-500' },
}


const HEURISTIC_PIGMENT_MAP: Record<string, { hex: string, id: string }> = {
  'Titanium White': { hex: '#FDFDFD', id: 'titanium-white' },
  'Ivory Black': { hex: '#0B0B0B', id: 'ivory-black' },
  'Yellow Ochre': { hex: '#CC8E35', id: 'yellow-ochre' },
  'Cadmium Red': { hex: '#E52B21', id: 'cadmium-red' },
  'Phthalo Green': { hex: '#123524', id: 'phthalo-green' },
  'Phthalo Blue': { hex: '#0F2E53', id: 'phthalo-blue' },
}

export default function PaintRecipe({
  hsl,
  targetHex,
  activePalette,
  useCatalog = false,
  brandId,
  lineId,
  paintIds,
}: PaintRecipeProps) {
  const [spectralRecipe, setSpectralRecipe] = useState<SpectralRecipe | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFallback, setIsFallback] = useState(false)

  // Debounce loading state to prevent flicker on fast operations
  const showLoading = useDebouncedLoading(isLoading, 100)

  // Fallback recipe from HSL heuristics
  const heuristicRecipe = generatePaintRecipe(hsl)

  useEffect(() => {
    let cancelled = false

    async function solve() {
      // If we're using catalog but no paints are selected, don't even try to solve
      if (useCatalog && (!paintIds || paintIds.length === 0)) {
        setIsLoading(false)
        setSpectralRecipe(null)
        setIsFallback(false)
        return
      }

      setIsLoading(true)

      // Build options based on mode
      let options: SolveOptions | undefined

      if (useCatalog) {
        // Use new catalog system
        options = {
          useCatalog: true,
          brandId,
          lineId,
          paintIds,
        }
      } else if (activePalette && !activePalette.isDefault) {
        // Legacy palette filter
        options = { paletteColorIds: activePalette.colors.map(c => c.id) }
      }

      try {
        // Use the type-safe worker wrapper
        const worker = getSolverWorker()
        const recipe = await worker.solveRecipe(targetHex, options)

        if (!cancelled) {
          setSpectralRecipe(recipe)
          setIsFallback(false)
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Spectral recipe worker failed:', err)

        // Fallback to direct call or heuristic if worker fails
        if (!cancelled) {
          try {
            const recipe = await solveRecipe(targetHex, options)
            setSpectralRecipe(recipe)
            setIsFallback(false)
          } catch (fallbackErr) {
            console.error('Direct solveRecipe also failed:', fallbackErr)
            setSpectralRecipe(null)
            setIsFallback(true)
          }
          setIsLoading(false)
        }
      }
    }

    solve()

    return () => {
      cancelled = true
    }
  }, [targetHex, activePalette, useCatalog, brandId, lineId, paintIds])

  // Map heuristic recipe to spectral format for high-fidelity rendering
  const getMappedHeuristic = (): SpectralRecipe => {
    const rawIngredients = heuristicRecipe.colors.map(c => {
      const pigmentInfo = HEURISTIC_PIGMENT_MAP[c.name] || { hex: '#888888', id: 'unknown' }
      const weight = HEURISTIC_WEIGHT_MAP[c.amount] || 0.1
      return {
        pigment: {
          id: pigmentInfo.id,
          name: c.name,
          hex: pigmentInfo.hex,
          tintingStrength: 1.0,
        },
        weight,
        percentage: c.amount,
      }
    })

    const totalWeight = rawIngredients.reduce((sum, ing) => sum + ing.weight, 0)

    return {
      ingredients: rawIngredients.map(ing => ({
        ...ing,
        weight: ing.weight / totalWeight,
        percentage: ing.percentage === 'none' ? '0%' : ing.percentage,
      })).filter(ing => ing.weight > 0),
      predictedHex: targetHex, // We assume heuristic is a reasonable match for UI purposes
      error: 5.0, // Arbitrary "Fair" error
      matchQuality: 'Fair',
      steps: heuristicRecipe.steps,
    }
  }

  // Determine which recipe to show
  const recipe = spectralRecipe || getMappedHeuristic()

  // Handle empty catalog state separately
  const isEmptyCatalog = useCatalog && (!paintIds || paintIds.length === 0)

  return (
    <div className="p-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-3 lg:mb-4">
        <h3 className="text-lg lg:text-xl font-bold text-gray-100">Oil Paint Recipe</h3>
        {isFallback && !isEmptyCatalog && (
          <span className="text-[10px] lg:text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 lg:py-1 rounded border border-blue-500/30">
            Heuristic Match
          </span>
        )}
      </div>

      {showLoading ? (
        <SkeletonPaintRecipe />
      ) : isEmptyCatalog ? (
        <div className="py-8 px-4 text-center border-2 border-dashed border-gray-700 rounded-lg bg-gray-800/20">
          <div className="text-3xl mb-3 opacity-50">🎨</div>
          <p className="text-sm font-medium text-gray-300">No Paints Selected</p>
          <p className="text-xs text-gray-500 mt-1 max-w-[200px] mx-auto">
            Select some paints from the Library tab to see a custom recipe.
          </p>
        </div>
      ) : (
        // Always show the high-fidelity visualization
        <>
          <PuddleRecipeDisplay
            ingredients={recipe.ingredients}
            predictedHex={recipe.predictedHex}
            targetHex={targetHex}
            matchQuality={recipe.matchQuality}
            error={recipe.error}
          />

          {/* Mixing Steps */}
          <div className="mt-6 mb-4 lg:mb-6">
            <h4 className="text-xs lg:text-sm font-bold text-gray-300 mb-2 lg:mb-3 uppercase tracking-wider">
              Mixing Steps
            </h4>
            <ol className="list-decimal list-outside ml-4 space-y-1.5 lg:space-y-2 text-[13px] lg:text-sm text-gray-300">
              {recipe.steps.map((step, i) => (
                <li
                  key={i}
                  dangerouslySetInnerHTML={{
                    __html: step
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                  }}
                />
              ))}
            </ol>
          </div>
        </>
      )}

      <div className="mt-4 pt-4 border-t border-gray-700">
        {isEmptyCatalog ? (
          <p className="text-[10px] text-gray-500 italic">
            Add paints to build your active palette.
          </p>
        ) : useCatalog && paintIds && paintIds.length > 0 ? (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Using Paint Library:</span>
            <span className="text-xs text-blue-400 font-medium">
              {paintIds.length} paint{paintIds.length !== 1 ? 's' : ''} selected
            </span>
          </div>
        ) : activePalette && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Using Palette:</span>
            <span className="text-xs text-blue-400 font-medium">{activePalette.name}</span>
            {!activePalette.isDefault && (
              <span className="text-[9px] bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded">
                {activePalette.colors.length} colors
              </span>
            )}
          </div>
        )}
        {!isEmptyCatalog && (
          <p className="text-xs text-gray-500">
            {useCatalog && paintIds && paintIds.length > 0
              ? 'Recipe uses only paints from your Paint Library selection'
              : activePalette && !activePalette.isDefault
                ? `Limited to: ${activePalette.colors.map(c => c.displayName).join(', ')}`
                : 'Limited palette: Titanium White, Ivory Black, Yellow Ochre, Cadmium Red, Phthalo Green, Phthalo Blue'
            }
          </p>
        )}
      </div>
    </div>
  )
}
