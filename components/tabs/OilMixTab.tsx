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
    setResolvedRecipe((current) => (current === recipe ? current : recipe))
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
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Mix</div>
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
    <div className="mix-lab-stack min-h-full space-y-5 bg-paper-elevated p-4 font-sans text-ink lg:p-5">
      {/* Subtractive mixing leads — this is what ColorWizard is for. */}
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

        <div className="mt-3">
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
        title="Subtractive mixing"
        isOpen={mixLabOpen}
        onToggle={() => setMixLabOpen((open) => !open)}
      >
        <MixLab
          targetHex={hex}
          showMetrics={!artistMode}
          solverRecipe={resolvedRecipe}
        />
      </CollapsibleSection>

      <section className="border-t border-ink-hairline pt-5">
        <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">
          Color position
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

      <section className="space-y-6 border-t border-ink-hairline pt-5">
        <div>
          <h3 className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">
            Harmonies
          </h3>
          <ColorHarmonies
            rgb={sampledColor.rgb}
            onColorSelect={onColorSelect ?? (() => {})}
          />
        </div>

        <AISuggestions rgb={sampledColor.rgb} />
      </section>
    </div>
  )
}
