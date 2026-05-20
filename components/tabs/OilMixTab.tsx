'use client'

/**
 * OilMixTab - Paint recipe, pipeline peek, and Mix Lab
 */

import { useCallback, useEffect, useState } from 'react'
import { rgb as culoriRgb } from 'culori'
import PaintRecipe, { type DisplayRecipe } from '../PaintRecipe'
import MixPipelinePeek from '../paint/MixPipelinePeek'
import MixLab from '../MixLab'
import CollapsibleSection from '../ui/CollapsibleSection'
import PhotoshopColorWheel from '../PhotoshopColorWheel'
import { Palette } from '@/lib/types/palette'
import ErrorBoundary from '../ErrorBoundary'
import { RecipeSolverErrorFallback } from '../errors/RecipeSolverErrorFallback'
import { usePaintPaletteStore } from '@/lib/store/usePaintPaletteStore'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import AISuggestions from '../AISuggestions'
import ColorHarmonies from '../ColorHarmonies'

interface OilMixTabProps {
  sampledColor: {
    hex: string
    rgb: { r: number; g: number; b: number }
    hsl: { h: number; s: number; l: number }
  } | null
  activePalette?: Palette
  onColorSelect?: (rgb: { r: number; g: number; b: number }) => void
  /** true = Artist (hide metrics); false = Lab */
  artistMode?: boolean
}

export default function OilMixTab({
  sampledColor,
  activePalette,
  onColorSelect,
  artistMode = true,
}: OilMixTabProps) {
  const { getSelectedPaintIds, isUsingPaintPalette } = usePaintPaletteStore()
  const selectedPaintIds = getSelectedPaintIds()
  const hasPaintPalette = isUsingPaintPalette()
  const isShortViewport = useMediaQuery('(max-height: 900px)')

  const [resolvedRecipe, setResolvedRecipe] = useState<DisplayRecipe | null>(null)
  const [mixLabOpen, setMixLabOpen] = useState(!artistMode)

  const handleRecipeResolved = useCallback((recipe: DisplayRecipe) => {
    setResolvedRecipe(recipe)
  }, [])

  useEffect(() => {
    if (!artistMode) setMixLabOpen(true)
  }, [artistMode])

  if (!sampledColor) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-paper-elevated p-6 text-ink-secondary">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-ink-hairline bg-paper-recessed text-ink-faint">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="8" />
            <path d="M12 4v8l5 5" />
          </svg>
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">Mix</div>
        <p className="mt-2 text-sm font-semibold text-ink">Sample to mix.</p>
      </div>
    )
  }

  const { hex, hsl } = sampledColor
  const recipeVariant = isShortViewport ? 'compact' : 'standard'
  const peekRecipe = resolvedRecipe ?? {
    source: 'heuristic' as const,
    ingredients: [],
    steps: [],
    preview: null,
  }

  return (
    <div className="min-h-0 min-h-full space-y-6 bg-paper-elevated p-4 font-sans text-ink lg:p-6">
      <section>
        <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-ink-faint">
          Color Position
        </h3>
        <PhotoshopColorWheel
          color={hex}
          onChange={(newHex) => {
            if (onColorSelect) {
              const parsed = culoriRgb(newHex)
              if (parsed) {
                onColorSelect({
                  r: Math.round(parsed.r * 255),
                  g: Math.round(parsed.g * 255),
                  b: Math.round(parsed.b * 255),
                })
              }
            }
          }}
        />
      </section>

      <section>
        <ErrorBoundary
          fallback={({ error, resetError }) => (
            <RecipeSolverErrorFallback
              error={error}
              resetError={resetError}
              targetHex={hex}
            />
          )}
        >
          <PaintRecipe
            hsl={hsl}
            targetHex={hex}
            activePalette={activePalette}
            useCatalog={hasPaintPalette}
            paintIds={hasPaintPalette ? selectedPaintIds : undefined}
            variant={recipeVariant}
            onRecipeResolved={handleRecipeResolved}
          />
        </ErrorBoundary>

        <div className="mt-4">
          <MixPipelinePeek
            targetHex={hex}
            ingredients={peekRecipe.ingredients}
            preview={peekRecipe.preview}
            mixSource={peekRecipe.source}
            showMetrics={!artistMode}
          />
        </div>
      </section>

      <CollapsibleSection
        title="Mix Lab"
        accentColor="purple"
        isOpen={mixLabOpen}
        onToggle={() => setMixLabOpen((open) => !open)}
      >
        <MixLab
          targetHex={hex}
          showMetrics={!artistMode}
          solverRecipe={resolvedRecipe}
        />
      </CollapsibleSection>

      <section className="space-y-8">
        <AISuggestions rgb={sampledColor.rgb} />

        <div className="border-t border-ink-hairline pt-4">
          <h3 className="mb-4 text-[10px] font-black uppercase tracking-widest text-ink-faint">
            Standard Harmonies
          </h3>
          <ColorHarmonies
            rgb={sampledColor.rgb}
            onColorSelect={onColorSelect ?? (() => {})}
          />
        </div>
      </section>
    </div>
  )
}
