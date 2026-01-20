'use client'

import { useState, useEffect } from 'react'
import { generatePaintRecipe } from '@/lib/colorMixer'
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
  const fallbackRecipe = generatePaintRecipe(hsl)

  useEffect(() => {
    let cancelled = false

    async function solve() {
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

  // Use spectral recipe if available, otherwise use fallback
  const recipe = spectralRecipe
  const qualityColor = recipe ? QUALITY_COLORS[recipe.matchQuality] : null

  return (
    <div className="p-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-3 lg:mb-4">
        <h3 className="text-lg lg:text-xl font-bold text-gray-100">Oil Paint Recipe</h3>
        {isFallback && (
          <span className="text-[10px] lg:text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 lg:py-1 rounded border border-yellow-500/30">
            Basic Mode
          </span>
        )}
      </div>



      {showLoading ? (
        <SkeletonPaintRecipe />
      ) : isFallback ? (
        // Fallback to original HSL-based recipe
        <>
          <p className="text-sm text-gray-400 mb-6 italic border-l-2 border-gray-700 pl-3">
            {fallbackRecipe.description}
          </p>

          <div className="mb-4 lg:mb-6">
            <h4 className="text-xs lg:text-sm font-bold text-gray-300 mb-2 lg:mb-3 uppercase tracking-wider">
              Mixing Steps
            </h4>
            <ol className="list-decimal list-outside ml-4 space-y-1.5 lg:space-y-2 text-[13px] lg:text-sm text-gray-300">
              {fallbackRecipe.steps.map((step, i) => (
                <li
                  key={i}
                  dangerouslySetInnerHTML={{
                    __html: step.replace(
                      /\*\*(.*?)\*\*/g,
                      '<strong class="text-white">$1</strong>'
                    ),
                  }}
                />
              ))}
            </ol>
          </div>

          <div className="space-y-2 mb-4 lg:mb-6">
            <h4 className="text-xs lg:text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">
              Ingredients
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
              {fallbackRecipe.colors.map((color, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-800/30 rounded border border-gray-800"
                >
                  <span className="font-medium text-gray-200 text-xs lg:text-sm">{color.name}</span>
                  <span className="text-[10px] lg:text-xs text-gray-400 capitalize">{color.amount}</span>
                </div>
              ))}
            </div>
          </div>

          {fallbackRecipe.notes && (
            <div className="p-3 bg-blue-900/20 border border-blue-800/50 rounded mb-4">
              <p className="text-xs text-blue-200">
                <strong>Note:</strong> {fallbackRecipe.notes}
              </p>
            </div>
          )}
        </>
      ) : (
        // Spectral recipe with puddle visualization
        recipe && (
          <>
            {/* Puddle Recipe Display */}
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
        )
      )}

      <div className="mt-4 pt-4 border-t border-gray-700">
        {useCatalog && paintIds && paintIds.length > 0 ? (
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
        <p className="text-xs text-gray-500">
          {useCatalog && paintIds && paintIds.length > 0
            ? 'Recipe uses only paints from your Paint Library selection'
            : activePalette && !activePalette.isDefault
              ? `Limited to: ${activePalette.colors.map(c => c.displayName).join(', ')}`
              : 'Limited palette: Titanium White, Ivory Black, Yellow Ochre, Cadmium Red, Phthalo Green, Phthalo Blue'
          }
        </p>
      </div>
    </div>
  )
}
