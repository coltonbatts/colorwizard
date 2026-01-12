'use client'

import { useState, useEffect } from 'react'
import { generatePaintRecipe } from '@/lib/colorMixer'
import { solveRecipe } from '@/lib/paint/solveRecipe'
import { SpectralRecipe } from '@/lib/spectral/types'
import { Palette } from '@/lib/types/palette'

interface PaintRecipeProps {
  hsl: { h: number; s: number; l: number }
  targetHex: string
  activePalette?: Palette
}

// Match quality colors
const QUALITY_COLORS = {
  Excellent: { text: 'text-green-400', bg: 'bg-green-500' },
  Good: { text: 'text-emerald-400', bg: 'bg-emerald-500' },
  Fair: { text: 'text-yellow-400', bg: 'bg-yellow-500' },
  Poor: { text: 'text-red-400', bg: 'bg-red-500' },
}

export default function PaintRecipe({ hsl, targetHex, activePalette }: PaintRecipeProps) {
  const [spectralRecipe, setSpectralRecipe] = useState<SpectralRecipe | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFallback, setIsFallback] = useState(false)

  // Fallback recipe from HSL heuristics
  const fallbackRecipe = generatePaintRecipe(hsl)

  useEffect(() => {
    let cancelled = false

    async function solve() {
      setIsLoading(true)
      try {
        // Build palette filter if a non-default palette is active
        const options = activePalette && !activePalette.isDefault
          ? { paletteColorIds: activePalette.colors.map(c => c.id) }
          : undefined

        const recipe = await solveRecipe(targetHex, options)
        if (!cancelled) {
          setSpectralRecipe(recipe)
          setIsFallback(false)
        }
      } catch (err) {
        console.error('Spectral recipe failed:', err)
        if (!cancelled) {
          setSpectralRecipe(null)
          setIsFallback(true)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    solve()

    return () => {
      cancelled = true
    }
  }, [targetHex, activePalette])

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

      {/* Swatch Comparison */}
      {!isFallback && recipe && (
        <div className="flex gap-3 mb-6">
          {/* Predicted Mix */}
          <div className="flex-1">
            <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-bold">
              Predicted Mix
            </div>
            <div
              className="h-16 rounded-lg border border-gray-600 shadow-lg"
              style={{ backgroundColor: recipe.predictedHex }}
            />
          </div>
          {/* Target */}
          <div className="w-16">
            <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-bold">
              Target
            </div>
            <div
              className="h-16 rounded-lg border border-gray-600 shadow-lg"
              style={{ backgroundColor: targetHex }}
            />
          </div>
        </div>
      )}

      {/* Match Quality */}
      {!isFallback && recipe && qualityColor && (
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-2 h-2 rounded-full ${qualityColor.bg}`} />
          <span className={`text-sm font-medium ${qualityColor.text}`}>
            {recipe.matchQuality} Match
          </span>
          <span className="text-xs text-gray-500">
            (ΔE: {recipe.error.toFixed(1)})
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
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
        // Spectral recipe
        recipe && (
          <>
            {/* Steps */}
            <div className="mb-4 lg:mb-6">
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

            {/* Ingredients with Percentages */}
            <div className="space-y-2 mb-4 lg:mb-6">
              <h4 className="text-xs lg:text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">
                Ingredients
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
                {recipe.ingredients.map((ingredient, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-gray-800/30 rounded border border-gray-800"
                  >
                    {/* Color swatch */}
                    <div
                      className="w-4 h-4 rounded border border-gray-600 shrink-0"
                      style={{ backgroundColor: ingredient.pigment.hex }}
                    />
                    <span className="font-medium text-gray-200 text-xs lg:text-sm flex-1 truncate">
                      {ingredient.pigment.name}
                    </span>
                    {/* Percentage bar - hide on narrow screens if needed, or keep small */}
                    <div className="w-12 xl:w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden shrink-0 hidden sm:block">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.round(ingredient.weight * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] lg:text-xs text-gray-300 font-mono w-8 text-right shrink-0">
                      {ingredient.percentage}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )
      )}

      <div className="mt-4 pt-4 border-t border-gray-700">
        {activePalette && (
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
          {activePalette && !activePalette.isDefault
            ? `Limited to: ${activePalette.colors.map(c => c.displayName).join(', ')}`
            : 'Limited palette: Titanium White, Ivory Black, Yellow Ochre, Cadmium Red, Phthalo Green, Phthalo Blue'
          }
        </p>
      </div>
    </div>
  )
}
