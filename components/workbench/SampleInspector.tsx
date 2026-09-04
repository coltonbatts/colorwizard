'use client'

import { useCallback, useMemo, useState } from 'react'
import { lab as culoriLab, rgb as culoriRgb } from 'culori'
import AISuggestions from '@/components/AISuggestions'
import ColorCardModal from '@/components/ColorCardModal'
import ColorHarmonies from '@/components/ColorHarmonies'
import ErrorBoundary from '@/components/ErrorBoundary'
import FullScreenOverlay from '@/components/FullScreenOverlay'
import MixLab from '@/components/MixLab'
import PaintRecipe, { type DisplayRecipe } from '@/components/PaintRecipe'
import PhotoshopColorWheel from '@/components/PhotoshopColorWheel'
import { RecipeSolverErrorFallback } from '@/components/errors/RecipeSolverErrorFallback'
import MixColorPushMap from '@/components/paint/MixColorPushMap'
import { createColorCard, createPinnedColor } from '@/lib/colorArtifacts'
import { PICKED_COLOR_DISCLAIMER } from '@/lib/colorSemantics'
import { useSampleReadout, type SampleReadoutColor } from '@/lib/hooks/useSampleReadout'
import { useCanvasStore } from '@/lib/store/useCanvasStore'
import { usePaintPaletteStore } from '@/lib/store/usePaintPaletteStore'
import type { ColorCard } from '@/lib/types/colorCard'
import type { Palette } from '@/lib/types/palette'
import type { PinnedColor } from '@/lib/types/pinnedColor'

export type InspectorDisclosure = 'collapsed' | 'medium' | 'expanded'

interface SampleInspectorProps {
  sampledColor: SampleReadoutColor
  activePalette: Palette
  onPin: (newPin: PinnedColor) => void
  isPinned: boolean
  simpleMode: boolean
  valueModeEnabled: boolean
  valueModeSteps: 5 | 7 | 9 | 11
  layoutMode?: 'wide' | 'medium' | 'narrow'
  presentation?: 'desktop' | 'mobile'
  disclosure?: InspectorDisclosure
  forceCorePalette?: boolean
  onAddToSession?: (color: { hex: string; rgb: { r: number; g: number; b: number } }) => void
  onOpenThreads?: () => void
  onChoosePaints?: () => void
  onColorSelect?: (rgb: { r: number; g: number; b: number }) => void
}

export default function SampleInspector({
  sampledColor,
  activePalette,
  onPin,
  isPinned,
  simpleMode,
  valueModeEnabled,
  valueModeSteps,
  layoutMode = 'wide',
  presentation = 'desktop',
  disclosure = 'expanded',
  forceCorePalette = false,
  onAddToSession,
  onOpenThreads,
  onChoosePaints,
  onColorSelect,
}: SampleInspectorProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [isPinning, setIsPinning] = useState(false)
  const [isCreatingCard, setIsCreatingCard] = useState(false)
  const [showColorPreview, setShowColorPreview] = useState(false)
  const [pendingCard, setPendingCard] = useState<ColorCard | null>(null)
  const [showCardModal, setShowCardModal] = useState(false)
  const [resolvedRecipe, setResolvedRecipe] = useState<DisplayRecipe | null>(null)
  const { getSelectedPaintIds, isUsingPaintPalette } = usePaintPaletteStore()
  const selectedPaintIds = getSelectedPaintIds()
  const hasPaintPalette = !forceCorePalette && isUsingPaintPalette()
  const valueScaleSettings = useCanvasStore((state) => state.valueScaleSettings)
  const activeValueBandIndex = useCanvasStore((state) => state.activeValueBandIndex)
  const setActiveValueBandIndex = useCanvasStore((state) => state.setActiveValueBandIndex)
  const readout = useSampleReadout({
    sampledColor,
    valueModeEnabled,
    valueModeSteps,
    preferredName: sampledColor?.label,
  })

  const solveOptions = useMemo(() => {
    if (hasPaintPalette && selectedPaintIds.length) {
      return { useCatalog: true as const, paintIds: selectedPaintIds }
    }
    if (activePalette.isDefault) return undefined
    return { paletteColorIds: activePalette.colors.map((color) => color.id) }
  }, [activePalette, hasPaintPalette, selectedPaintIds])

  const labValue = useMemo(() => {
    if (!sampledColor) return null
    const parsed = culoriLab(sampledColor.hex)
    return parsed ? `${parsed.l.toFixed(1)} ${(parsed.a ?? 0).toFixed(1)} ${(parsed.b ?? 0).toFixed(1)}` : null
  }, [sampledColor])

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    window.setTimeout(() => setCopied(null), 1200)
  }

  const handlePin = async () => {
    if (!sampledColor || isPinned) return
    setIsPinning(true)
    try {
      onPin(await createPinnedColor(sampledColor, {
        label: sampledColor.label?.trim() || readout.colorName || `Color ${sampledColor.hex}`,
        solveOptions,
      }))
    } finally {
      setIsPinning(false)
    }
  }

  const handleCreateCard = async () => {
    if (!sampledColor) return
    setIsCreatingCard(true)
    try {
      const card = await createColorCard(sampledColor, {
        name: readout.colorName || `Color ${sampledColor.hex}`,
        colorName: readout.colorName || undefined,
        valueStep: readout.valueModeMeta?.step ?? sampledColor.valueMetadata?.step,
        recipeLabel: activePalette.isDefault ? 'Core six-color mix' : activePalette.name,
        solveOptions,
      })
      setPendingCard(card)
      setShowCardModal(true)
    } finally {
      setIsCreatingCard(false)
    }
  }

  const handleRecipeResolved = useCallback((recipe: DisplayRecipe) => setResolvedRecipe(recipe), [])

  if (!sampledColor) {
    return (
      <aside className={`sample-inspector sample-inspector--empty ${presentation === 'desktop' ? 'workbench-floating-panel' : ''}`} aria-label="Sample inspector">
        <span className="sample-inspector-kicker">Sample</span>
        <h2>Click the image to read a color.</h2>
        <p>Its character and a practical paint mix will appear here.</p>
      </aside>
    )
  }

  if (!readout.harmonies || !readout.chroma) return null
  const { hex, rgb, hsl } = sampledColor
  const showResult = disclosure !== 'collapsed'
  const showExpanded = presentation === 'desktop' || disclosure === 'expanded'

  return (
    <>
      <aside
        className={`sample-inspector sample-inspector--canonical ${presentation === 'desktop' ? 'workbench-floating-panel' : 'sample-inspector--mobile'}`}
        data-layout={layoutMode}
        data-presentation={presentation}
        aria-label="Sample inspector"
      >
        <div className="sample-inspector-scroll">
          <div className="sample-inspector-summary">
            <button
              type="button"
              className="sample-hero-swatch"
              style={{ backgroundColor: valueModeEnabled ? readout.grayscaleHex : hex }}
              onClick={() => setShowColorPreview(true)}
              aria-label={`Preview ${readout.displayName} full screen`}
            />

            <header className="sample-identity">
              <span className="sample-inspector-kicker">Sampled color</span>
              <h2 aria-live="polite">{readout.isLoadingName ? 'Reading color…' : readout.displayName}</h2>
              <span className="sample-hex font-mono tabular-nums">{hex.toUpperCase()}</span>
            </header>
          </div>

          {showResult && (
            <>
              <section className="sample-character font-mono tabular-nums" aria-label="Color character">
                <div>
                  <span>Value</span>
                  <strong title={readout.valueBand} aria-label={`Value ${readout.painterValue.toFixed(1)} of 10, ${readout.valueBand}`}>
                    {readout.painterValue.toFixed(1)}<em>/10</em>
                  </strong>
                  <i style={{ backgroundColor: readout.grayscaleHex }} aria-hidden="true" />
                </div>
                <div><span>Temperature</span><strong>{readout.temperatureLabel}</strong></div>
                <div><span>Chroma</span><strong>{readout.chroma.label}</strong></div>
              </section>

              <section className="sample-mix-result" aria-label="Practical paint mix">
                <div className="sample-section-heading">
                  <div>
                    <span className="sample-inspector-kicker">Painter’s starting point</span>
                    <h3>Practical Paint Mix</h3>
                  </div>
                  {onChoosePaints && <button type="button" onClick={onChoosePaints}>Change Paints</button>}
                </div>
                <ErrorBoundary fallback={({ error, resetError }) => <RecipeSolverErrorFallback error={error} resetError={resetError} targetHex={hex} />}>
                  <PaintRecipe
                    hsl={hsl}
                    targetHex={hex}
                    activePalette={activePalette}
                    useCatalog={hasPaintPalette}
                    paintIds={hasPaintPalette ? selectedPaintIds : undefined}
                    variant={presentation === 'mobile' ? 'compact' : 'standard'}
                    showExportButton={false}
                    hideHeader
                    hideFooter={presentation === 'mobile'}
                    onRecipeResolved={handleRecipeResolved}
                    onChoosePaints={onChoosePaints}
                  />
                </ErrorBoundary>
              </section>

              <div className="sample-actions" aria-label="Color actions" aria-live="polite">
                <button type="button" className="primary" onClick={handlePin} disabled={isPinning || isPinned}>
                  {isPinning ? 'Saving…' : isPinned ? 'Color Saved' : 'Save Color'}
                </button>
                {onOpenThreads && <button type="button" onClick={onOpenThreads}>Embroidery Match</button>}
              </div>

              {showExpanded && (
                <>
                  <details className="sample-mixing-advanced group">
                    <summary>
                      <span>Advanced Mixing Guidance</span>
                      <span aria-hidden="true">+</span>
                    </summary>
                    <div className="sample-mixing-advanced-content">
                      <section>
                        <h3>Adjust the mix</h3>
                        <MixLab targetHex={hex} showMetrics={!simpleMode} solverRecipe={resolvedRecipe} />
                      </section>

                      {resolvedRecipe && (
                        <MixColorPushMap targetHex={hex} ingredients={resolvedRecipe.ingredients} mixSource={resolvedRecipe.source} variant="compact" />
                      )}

                      <details className="sample-color-theory-more">
                        <summary>Color Position & Harmonies</summary>
                        <div>
                          <PhotoshopColorWheel
                            color={hex}
                            onChange={(newHex) => {
                              const parsed = culoriRgb(newHex)
                              if (parsed && onColorSelect) {
                                onColorSelect({ r: Math.round(parsed.r * 255), g: Math.round(parsed.g * 255), b: Math.round(parsed.b * 255) })
                              }
                            }}
                          />
                          <ColorHarmonies rgb={rgb} onColorSelect={onColorSelect ?? (() => undefined)} />
                          <AISuggestions rgb={rgb} />
                        </div>
                      </details>
                    </div>
                  </details>

                  <details className="sample-details group">
                    <summary><span>Technical Details</span><span aria-hidden="true">+</span></summary>
                    <div className="sample-detail-values font-mono tabular-nums">
                      <button type="button" onClick={() => copy(hex, 'hex')}><span>HEX</span><strong>{copied === 'hex' ? 'Copied' : hex.toUpperCase()}</strong></button>
                      <button type="button" onClick={() => copy(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, 'rgb')}><span>RGB</span><strong>{copied === 'rgb' ? 'Copied' : `${rgb.r} ${rgb.g} ${rgb.b}`}</strong></button>
                      <button type="button" onClick={() => copy(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, 'hsl')}><span>HSL</span><strong>{copied === 'hsl' ? 'Copied' : `${hsl.h}° ${hsl.s}% ${hsl.l}%`}</strong></button>
                      {labValue && <button type="button" onClick={() => copy(`lab(${labValue})`, 'lab')}><span>LAB</span><strong>{copied === 'lab' ? 'Copied' : labValue}</strong></button>}
                    </div>

                    {valueModeEnabled && (
                      <label className="sample-value-band">
                        <span>Canvas value band</span>
                        <input
                          type="range"
                          min={0}
                          max={Math.max(0, valueScaleSettings.steps - 1)}
                          name="canvas-value-band"
                          autoComplete="off"
                          value={activeValueBandIndex}
                          onChange={(event) => setActiveValueBandIndex(Number(event.target.value))}
                        />
                        <output>{activeValueBandIndex + 1}/{valueScaleSettings.steps}</output>
                      </label>
                    )}

                    <div className="sample-secondary-actions">
                      {onAddToSession && <button type="button" onClick={() => onAddToSession({ hex, rgb })}>Add to Session</button>}
                      {!simpleMode && <button type="button" onClick={handleCreateCard} disabled={isCreatingCard}>{isCreatingCard ? 'Making…' : 'Make Color Card'}</button>}
                    </div>
                    <p>{PICKED_COLOR_DISCLAIMER}</p>
                  </details>
                </>
              )}
            </>
          )}
        </div>
      </aside>

      <FullScreenOverlay isOpen={showColorPreview} onClose={() => setShowColorPreview(false)} backgroundColor={hex} />
      {showCardModal && (
        <ColorCardModal
          isOpen={showCardModal}
          onClose={() => { setShowCardModal(false); setPendingCard(null) }}
          card={pendingCard}
          isNewCard
          onCardSaved={() => undefined}
        />
      )}
    </>
  )
}
