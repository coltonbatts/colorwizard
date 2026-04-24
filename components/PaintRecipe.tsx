'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { generatePaintRecipe, HEURISTIC_WEIGHT_MAP } from '@/lib/colorMixer'
import { getSolverWorker } from '@/lib/workers'
import { solveRecipe, SolveOptions } from '@/lib/paint/solveRecipe'
import { SpectralRecipe } from '@/lib/spectral/types'
import { Palette } from '@/lib/types/palette'
import { SkeletonPaintRecipe } from '@/components/ui/SkeletonLoader'
import { useDebouncedLoading } from '@/hooks/useDebounce'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import PuddleRecipeDisplay from './paint/PuddleRecipeDisplay'
import ProcreateExportButton from './ProcreateExportButton'
import type { ProcreateColor } from '@/lib/types/procreate'

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
  /** Display variant */
  variant?: 'standard' | 'dashboard' | 'compact' | 'board'
  /** Whether to show the Procreate export button */
  showExportButton?: boolean
  /** Hide the recipe title block */
  hideHeader?: boolean
  /** Hide compact footer metadata */
  hideFooter?: boolean
}

const HEURISTIC_PIGMENT_MAP: Record<string, { hex: string, id: string }> = {
  'Titanium White': { hex: '#FDFDFD', id: 'titanium-white' },
  'Ivory Black': { hex: '#0B0B0B', id: 'ivory-black' },
  'Yellow Ochre': { hex: '#CC8E35', id: 'yellow-ochre' },
  'Cadmium Red': { hex: '#E52B21', id: 'cadmium-red' },
  'Phthalo Green': { hex: '#123524', id: 'phthalo-green' },
  'Phthalo Blue': { hex: '#0F2E53', id: 'phthalo-blue' },
}

type DisplayRecipe = {
  source: 'solver' | 'heuristic'
  ingredients: SpectralRecipe['ingredients']
  steps: string[]
  preview: {
    predictedHex: string
    matchQuality: SpectralRecipe['matchQuality']
    error: number
  } | null
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
}: PaintRecipeProps) {
  const [spectralRecipe, setSpectralRecipe] = useState<SpectralRecipe | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSteps, setShowSteps] = useState(variant !== 'compact')
  const isShortViewport = useMediaQuery('(max-height: 900px)')
  const isNarrowViewport = useMediaQuery('(max-width: 480px)')

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
        // Use the type-safe worker wrapper with a 5-second timeout
        const worker = getSolverWorker()
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Solver worker timed out')), 5000)
        )
        const recipe = await Promise.race([worker.solveRecipe(targetHex, options), timeout])

        if (!cancelled) {
          setSpectralRecipe(recipe)
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Spectral recipe worker failed:', err)

        // Fallback to direct call or heuristic if worker fails
        if (!cancelled) {
          try {
            const recipe = await solveRecipe(targetHex, options)
            setSpectralRecipe(recipe)
          } catch (fallbackErr) {
            console.error('Direct solveRecipe also failed:', fallbackErr)
            setSpectralRecipe(null)
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

  const getMappedHeuristicIngredients = (): SpectralRecipe['ingredients'] => {
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

    return rawIngredients.map(ing => ({
        ...ing,
        weight: totalWeight > 0 ? ing.weight / totalWeight : 0,
        percentage: ing.percentage === 'none' ? '0%' : ing.percentage,
      })).filter(ing => ing.weight > 0)
  }

  // Determine which recipe to show
  const recipe: DisplayRecipe = spectralRecipe
    ? {
        source: 'solver',
        ingredients: spectralRecipe.ingredients,
        steps: spectralRecipe.steps,
        preview: {
          predictedHex: spectralRecipe.predictedHex,
          matchQuality: spectralRecipe.matchQuality,
          error: spectralRecipe.error,
        },
      }
    : {
        source: 'heuristic',
        ingredients: getMappedHeuristicIngredients(),
        steps: heuristicRecipe.steps,
        preview: null,
      }
  const effectiveVariant =
    variant === 'compact' || variant === 'dashboard' || variant === 'board'
      ? variant
      : (isShortViewport || isNarrowViewport ? 'compact' : 'standard')

  // Handle empty catalog state separately
  const isEmptyCatalog = useCatalog && (!paintIds || paintIds.length === 0)
  const paletteContextLabel = useCatalog && paintIds && paintIds.length > 0
    ? `${paintIds.length} library paint${paintIds.length === 1 ? '' : 's'}`
    : activePalette && !activePalette.isDefault
      ? activePalette.name
      : 'Core six-color mix'
  const paletteRestrictionLabel = useCatalog && paintIds && paintIds.length > 0
    ? 'Starting mix uses only paints from your library selection.'
    : activePalette && !activePalette.isDefault
      ? `Starting mix is limited to ${activePalette.colors.length} paints from ${activePalette.name}.`
      : 'Built from the core six-color palette.'
  const provenanceLabel = recipe.source === 'solver' ? 'Starting Mix' : 'Studio Guide'
  const provenanceNote = recipe.source === 'solver'
    ? 'Use this as a practical first pass. Adjust by eye for your paint, surface, and light.'
    : 'Use this value-first studio guide as a practical first pass. Adjust by eye for your paint, surface, and light.'
  const isCompactLayout = effectiveVariant === 'compact'
  const isBoardLayout = effectiveVariant === 'board'
  const shouldShowInlineSteps = isCompactLayout || isBoardLayout
  const renderedStepCount = recipe.steps.length

  useEffect(() => {
    setShowSteps(!shouldShowInlineSteps)
  }, [shouldShowInlineSteps, targetHex])

  return (
    <div
      className={`w-full min-w-0 rounded-[26px] border border-ink-hairline bg-[linear-gradient(180deg,rgba(255,252,247,0.96),rgba(245,239,229,0.92))] shadow-[0_18px_42px_rgba(33,24,14,0.08),inset_0_1px_0_rgba(255,255,255,0.72)] ${isCompactLayout ? 'p-3' : isBoardLayout ? 'p-5' : 'p-4'}`}
    >
      {!hideHeader && (
        <div className={`flex items-start justify-between gap-3 ${isCompactLayout ? 'mb-3' : isBoardLayout ? 'mb-5' : 'mb-4'}`}>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">
              Mix Path
            </div>
            <h3 className={`${isCompactLayout ? 'mt-1 text-base' : isBoardLayout ? 'mt-2 text-[1.7rem]' : 'mt-2 text-xl'} font-display leading-none tracking-[-0.03em] text-ink`}>
              Starting Paint Mix
            </h3>
          </div>
          {!isEmptyCatalog && (
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                recipe.source === 'solver'
                  ? 'border border-ink-hairline bg-[rgba(255,252,247,0.82)] text-ink-secondary'
                  : 'border border-subsignal bg-subsignal-muted px-3 py-1 text-subsignal'
              }`}
            >
              {provenanceLabel}
            </span>
          )}
        </div>
      )}

      {showLoading ? (
        <SkeletonPaintRecipe />
      ) : isEmptyCatalog ? (
        <div className="rounded-[22px] border border-dashed border-ink-hairline bg-[rgba(255,252,247,0.72)] px-4 py-5 text-center">
          <p className="text-sm font-semibold text-ink">No paints</p>
          <p className="mt-1 text-[11px] text-ink-faint">
            Use Library.
          </p>
        </div>
      ) : (
        <>
          <PuddleRecipeDisplay
            ingredients={recipe.ingredients}
            targetHex={targetHex}
            preview={recipe.preview}
            mixSource={recipe.source}
            variant={effectiveVariant}
          />

          <div className={`${isCompactLayout ? 'mt-3' : isBoardLayout ? 'mt-5' : 'mt-5'} rounded-[22px] border border-ink-hairline bg-[rgba(255,252,247,0.68)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]`}>
            {shouldShowInlineSteps ? (
              <>
                <div className={`flex items-center justify-between gap-3 border-b border-ink-hairline ${isBoardLayout ? 'px-5 py-4' : 'px-4 py-3'}`}>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">
                      {isBoardLayout ? 'Mix Order' : 'Mixing Steps'}
                    </div>
                    <div className={`mt-1 font-semibold text-ink ${isBoardLayout ? 'text-lg' : 'text-sm'}`}>
                      {isBoardLayout ? 'What to put down first' : 'Short path to the match'}
                    </div>
                  </div>

                  <div className={`inline-flex items-center gap-2 rounded-full border border-ink-hairline bg-[rgba(255,252,247,0.82)] font-mono font-bold uppercase tracking-[0.16em] text-ink-secondary ${isBoardLayout ? 'px-4 py-2 text-[11px]' : 'px-3 py-1.5 text-[10px]'}`}>
                    {renderedStepCount} step{renderedStepCount === 1 ? '' : 's'}
                  </div>
                </div>

                <ol className={`${isBoardLayout ? 'space-y-3 px-4 pb-4 pt-4' : 'space-y-2 px-3 pb-3 pt-3'}`}>
                  {recipe.steps.map((step, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-3 rounded-[18px] border border-ink-hairline bg-[rgba(255,252,247,0.84)] text-ink-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.54)] ${isBoardLayout ? 'px-4 py-4 text-base leading-6' : 'px-3 py-2.5 text-[11px] leading-4.5'}`}
                    >
                      <span className={`flex shrink-0 items-center justify-center rounded-full bg-paper-recessed font-mono font-bold text-ink-secondary ${isBoardLayout ? 'h-10 w-10 text-sm' : 'h-6 w-6 text-[10px]'}`}>
                        {i + 1}
                      </span>
                      <span
                        dangerouslySetInnerHTML={{
                          __html: step.replace(/\*\*(.*?)\*\*/g, '<strong class="text-ink">$1</strong>'),
                        }}
                      />
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowSteps((value) => !value)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">
                      Process
                    </div>
                    <div className="mt-1 text-sm font-semibold text-ink">
                      {showSteps ? 'Hide mixing steps' : 'Reveal mixing steps'}
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-ink-hairline bg-[rgba(255,252,247,0.82)] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-secondary">
                    {renderedStepCount} step{renderedStepCount === 1 ? '' : 's'}
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ transform: showSteps ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {showSteps && (
                    <motion.div
                      initial={{ opacity: 0, maxHeight: 0 }}
                      animate={{ opacity: 1, maxHeight: 3200 }}
                      exit={{ opacity: 0, maxHeight: 0 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <ol className="space-y-2 border-t border-ink-hairline px-4 pb-4 pt-3">
                        {recipe.steps.map((step, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 rounded-[18px] border border-ink-hairline bg-[rgba(255,252,247,0.84)] px-3 py-3 text-[12px] leading-5 text-ink-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.54)]"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper-recessed font-mono text-[10px] font-bold text-ink-secondary">
                              {i + 1}
                            </span>
                            <span
                              dangerouslySetInnerHTML={{
                                __html: step.replace(/\*\*(.*?)\*\*/g, '<strong class="text-ink">$1</strong>'),
                              }}
                            />
                          </li>
                        ))}
                      </ol>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </>
      )}

      {!hideFooter && (
        <div className={`${isCompactLayout ? 'mt-3 pt-3' : isBoardLayout ? 'mt-5 pt-4' : 'mt-4 pt-4'} border-t border-ink-hairline`}>
          {isEmptyCatalog ? (
            <p className={`${isCompactLayout ? 'text-[9px]' : isBoardLayout ? 'text-[11px]' : 'text-[10px]'} italic text-ink-faint`}>
              Add paints to build your active palette.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">
                  Source
                </span>
                <span className="rounded-full border border-ink-hairline bg-[rgba(255,252,247,0.82)] px-3 py-1 text-[10px] font-semibold text-ink-secondary">
                  {paletteContextLabel}
                </span>
                {(isCompactLayout || isBoardLayout) && (
                  <span className="rounded-full border border-ink-hairline bg-[rgba(255,252,247,0.82)] px-3 py-1 text-[10px] font-semibold text-ink-secondary">
                    {renderedStepCount} step{renderedStepCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              {isCompactLayout || isBoardLayout ? (
                <div className="mt-2 space-y-1.5 text-[10px] leading-4 text-ink-secondary">
                  <p>{paletteRestrictionLabel}</p>
                  <p>{provenanceNote}</p>
                </div>
              ) : (
                <>
                  <p className="mt-3 text-xs text-ink-secondary">
                    {paletteRestrictionLabel}
                  </p>
                  <p className="mt-2 text-[11px] leading-5 text-ink-secondary">
                    {provenanceNote}
                  </p>
                </>
              )}

              {showExportButton && (
                <div className="mt-3">
                  <ProcreateExportButton
                    colors={recipe.ingredients.map((ing): ProcreateColor => ({
                      hex: ing.pigment.hex,
                      name: ing.pigment.name,
                    }))}
                    paletteName={`${targetHex.replace('#', '')} Recipe`}
                    variant="secondary"
                    className="w-full"
                    onExportSuccess={() => {
                      console.log('Recipe exported to Procreate successfully!')
                    }}
                    onExportError={(error) => {
                      console.error('Export failed:', error)
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
