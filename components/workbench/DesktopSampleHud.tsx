'use client'

import { useMemo, useState } from 'react'
import { lab as culoriLab } from 'culori'
import ColorCardModal from '@/components/ColorCardModal'
import FullScreenOverlay from '@/components/FullScreenOverlay'
import PaintRecipe from '@/components/PaintRecipe'
import { createColorCard, createPinnedColor } from '@/lib/colorArtifacts'
import type { ColorCard } from '@/lib/types/colorCard'
import type { Palette } from '@/lib/types/palette'
import type { PinnedColor } from '@/lib/types/pinnedColor'
import { useCanvasStore } from '@/lib/store/useCanvasStore'
import { getPaletteRecipeOptions, useSampleReadout } from '@/lib/hooks/useSampleReadout'
import { PICKED_COLOR_DISCLAIMER } from '@/lib/colorSemantics'

interface SampledColor {
  hex: string
  rgb: { r: number; g: number; b: number }
  hsl: { h: number; s: number; l: number }
  valueMetadata?: { y: number; step: number; range: [number, number]; percentile: number }
}

interface DesktopSampleHudProps {
  sampledColor: SampledColor | null
  activePalette: Palette
  onPin: (newPin: PinnedColor) => void
  isPinned: boolean
  simpleMode: boolean
  valueModeEnabled: boolean
  valueModeSteps: 5 | 7 | 9 | 11
  layoutMode?: 'wide' | 'medium' | 'narrow'
  onAddToSession?: (color: { hex: string; rgb: { r: number; g: number; b: number } }) => void
  onOpenMix?: () => void
  onOpenThreads?: () => void
}

export default function DesktopSampleHud({
  sampledColor,
  activePalette,
  onPin,
  isPinned,
  simpleMode,
  valueModeEnabled,
  valueModeSteps,
  layoutMode = 'wide',
  onAddToSession,
  onOpenMix,
  onOpenThreads,
}: DesktopSampleHudProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [isPinning, setIsPinning] = useState(false)
  const [isCreatingCard, setIsCreatingCard] = useState(false)
  const [showColorPreview, setShowColorPreview] = useState(false)
  const [pendingCard, setPendingCard] = useState<ColorCard | null>(null)
  const [showCardModal, setShowCardModal] = useState(false)

  const valueScaleSettings = useCanvasStore((state) => state.valueScaleSettings)
  const activeValueBandIndex = useCanvasStore((state) => state.activeValueBandIndex)
  const setActiveValueBandIndex = useCanvasStore((state) => state.setActiveValueBandIndex)
  const readout = useSampleReadout({ sampledColor, valueModeEnabled, valueModeSteps })

  const labValue = useMemo(() => {
    if (!sampledColor) return null
    const parsed = culoriLab(sampledColor.hex)
    return parsed ? `${parsed.l.toFixed(1)} ${(parsed.a ?? 0).toFixed(1)} ${(parsed.b ?? 0).toFixed(1)}` : null
  }, [sampledColor])

  if (!sampledColor) {
    return (
      <aside className="workbench-floating-panel sample-inspector sample-inspector--empty" aria-label="Sample inspector">
        <span className="sample-inspector-kicker">Sample</span>
        <h2>Click the image to read a color.</h2>
        <p>Color character, a practical mix, and actions will appear here.</p>
      </aside>
    )
  }

  if (!readout.harmonies || !readout.chroma) return null
  const { hex, rgb, hsl } = sampledColor

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    window.setTimeout(() => setCopied(null), 1200)
  }

  const handlePin = async () => {
    if (isPinned) return
    setIsPinning(true)
    try {
      onPin(await createPinnedColor(
        { hex, rgb, hsl },
        { label: readout.colorName || `Color ${hex}`, solveOptions: getPaletteRecipeOptions(activePalette) },
      ))
    } finally {
      setIsPinning(false)
    }
  }

  const handleCreateCard = async () => {
    setIsCreatingCard(true)
    try {
      const card = await createColorCard(
        { hex, rgb, hsl },
        {
          name: readout.colorName || `Color ${hex}`,
          colorName: readout.colorName || undefined,
          valueStep: readout.valueModeMeta?.step ?? sampledColor.valueMetadata?.step,
          recipeLabel: activePalette.isDefault ? 'Core six-color mix' : activePalette.name,
          solveOptions: getPaletteRecipeOptions(activePalette),
        },
      )
      setPendingCard(card)
      setShowCardModal(true)
    } finally {
      setIsCreatingCard(false)
    }
  }

  return (
    <>
      <aside className="workbench-floating-panel sample-inspector" data-layout={layoutMode} aria-label="Sample inspector">
        <div className="sample-inspector-scroll">
          <button
            type="button"
            className="sample-hero-swatch"
            style={{ backgroundColor: hex }}
            onClick={() => setShowColorPreview(true)}
            aria-label={`Preview ${readout.displayName} full screen`}
          />

          <header className="sample-identity">
            <h2>{readout.displayName}</h2>
            <span className="sample-hex">{hex.toUpperCase()}</span>
          </header>

          <section className="sample-character" aria-label="Color character">
            <div>
              <span>Value</span>
              <strong>{readout.displayedValue}%</strong>
              <i style={{ backgroundColor: readout.grayscaleHex }} aria-hidden="true" />
            </div>
            <div>
              <span>Temperature</span>
              <strong>{readout.temperatureLabel}</strong>
            </div>
            <div>
              <span>Chroma</span>
              <strong>{readout.chroma.label}</strong>
            </div>
          </section>

          <section className="sample-mix-preview" aria-label="Practical paint mix">
            <div className="sample-section-heading">
              <h3>Practical mix</h3>
              <span>{activePalette.isDefault ? 'Core 6' : activePalette.name}</span>
            </div>
            <PaintRecipe
              hsl={hsl}
              targetHex={hex}
              activePalette={activePalette}
              variant="compact"
              showExportButton={false}
              hideHeader
              hideFooter
              previewOnly
            />
          </section>

          <div className="sample-actions" aria-label="Color actions">
            <button type="button" className="primary" onClick={onOpenMix}>Mix color</button>
            <button type="button" onClick={onOpenThreads}>Match threads</button>
            <button type="button" onClick={handlePin} disabled={isPinning || isPinned}>
              {isPinning ? 'Saving…' : isPinned ? 'Saved' : 'Save'}
            </button>
          </div>

          <details className="sample-details group">
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
                Details
              </span>
            </summary>
            <div className="sample-detail-values">
              <button type="button" onClick={() => copy(hex, 'hex')}>
                <span>HEX</span><strong>{copied === 'hex' ? 'Copied' : hex.toUpperCase()}</strong>
              </button>
              <button type="button" onClick={() => copy(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, 'rgb')}>
                <span>RGB</span><strong>{copied === 'rgb' ? 'Copied' : `${rgb.r} ${rgb.g} ${rgb.b}`}</strong>
              </button>
              <button type="button" onClick={() => copy(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, 'hsl')}>
                <span>HSL</span><strong>{copied === 'hsl' ? 'Copied' : `${hsl.h}° ${hsl.s}% ${hsl.l}%`}</strong>
              </button>
              {labValue && (
                <button type="button" onClick={() => copy(`lab(${labValue})`, 'lab')}>
                  <span>LAB</span><strong>{copied === 'lab' ? 'Copied' : labValue}</strong>
                </button>
              )}
            </div>

            <label className="sample-value-band">
              <span>Canvas value band</span>
              <input
                type="range"
                min={0}
                max={Math.max(0, valueScaleSettings.steps - 1)}
                value={activeValueBandIndex}
                onChange={(event) => setActiveValueBandIndex(Number(event.target.value))}
              />
              <output>{activeValueBandIndex + 1}/{valueScaleSettings.steps}</output>
            </label>

            <div className="sample-secondary-actions">
              {onAddToSession && <button type="button" onClick={() => onAddToSession({ hex, rgb })}>Add to session</button>}
              {!simpleMode && <button type="button" onClick={handleCreateCard} disabled={isCreatingCard}>{isCreatingCard ? 'Making…' : 'Make color card'}</button>}
            </div>
            <p>{PICKED_COLOR_DISCLAIMER}</p>
          </details>
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
