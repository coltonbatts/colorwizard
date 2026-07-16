'use client'

import { useCallback, useState } from 'react'
import { rgb as culoriRgb } from 'culori'
import PaintRecipe, { type DisplayRecipe } from '../PaintRecipe'
import MixLab from '../MixLab'
import PhotoshopColorWheel from '../PhotoshopColorWheel'
import type { Palette } from '@/lib/types/palette'
import ErrorBoundary from '../ErrorBoundary'
import { RecipeSolverErrorFallback } from '../errors/RecipeSolverErrorFallback'
import { usePaintPaletteStore } from '@/lib/store/usePaintPaletteStore'
import AISuggestions from '../AISuggestions'
import ColorHarmonies from '../ColorHarmonies'
import MixColorPushMap from '../paint/MixColorPushMap'

interface OilMixTabProps {
  sampledColor: { hex: string; rgb: { r: number; g: number; b: number }; hsl: { h: number; s: number; l: number } } | null
  activePalette?: Palette
  onColorSelect?: (rgb: { r: number; g: number; b: number }) => void
  artistMode?: boolean
}

export default function OilMixTab({ sampledColor, activePalette, onColorSelect, artistMode = true }: OilMixTabProps) {
  const { getSelectedPaintIds, isUsingPaintPalette } = usePaintPaletteStore()
  const selectedPaintIds = getSelectedPaintIds()
  const hasPaintPalette = isUsingPaintPalette()
  const [resolvedRecipe, setResolvedRecipe] = useState<DisplayRecipe | null>(null)
  const handleRecipeResolved = useCallback((recipe: DisplayRecipe) => setResolvedRecipe(recipe), [])

  if (!sampledColor) {
    return <div className="panel-empty"><strong>Sample a color to mix it.</strong><span>Click anywhere on the image.</span></div>
  }

  const { hex, hsl } = sampledColor

  return (
    <div className="mix-lab-stack">
      <ErrorBoundary fallback={({ error, resetError }) => <RecipeSolverErrorFallback error={error} resetError={resetError} targetHex={hex} />}>
        <PaintRecipe
          hsl={hsl}
          targetHex={hex}
          activePalette={activePalette}
          useCatalog={hasPaintPalette}
          paintIds={hasPaintPalette ? selectedPaintIds : undefined}
          variant="standard"
          onRecipeResolved={handleRecipeResolved}
        />
      </ErrorBoundary>

      <details className="mix-advanced group">
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
            Advanced
          </span>
        </summary>
        <div className="mix-advanced-content">
          <section>
            <h3>Adjust the mix</h3>
            <MixLab targetHex={hex} showMetrics={!artistMode} solverRecipe={resolvedRecipe} />
          </section>

          {resolvedRecipe && (
            <MixColorPushMap targetHex={hex} ingredients={resolvedRecipe.ingredients} mixSource={resolvedRecipe.source} variant="compact" />
          )}

          <section>
            <h3>Color position</h3>
            <PhotoshopColorWheel
              color={hex}
              onChange={(newHex) => {
                const parsed = culoriRgb(newHex)
                if (parsed && onColorSelect) onColorSelect({ r: Math.round(parsed.r * 255), g: Math.round(parsed.g * 255), b: Math.round(parsed.b * 255) })
              }}
            />
          </section>

          <section>
            <h3>Harmonies & suggestions</h3>
            <ColorHarmonies rgb={sampledColor.rgb} onColorSelect={onColorSelect ?? (() => undefined)} />
            <AISuggestions rgb={sampledColor.rgb} />
          </section>
        </div>
      </details>
    </div>
  )
}
