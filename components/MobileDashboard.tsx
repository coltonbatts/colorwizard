'use client'

import { useMemo, useState } from 'react'
import PaintRecipe from './PaintRecipe'
import type { Palette } from '@/lib/types/palette'
import type { PinnedColor } from '@/lib/types/pinnedColor'
import { usePaintPaletteStore } from '@/lib/store/usePaintPaletteStore'
import { createPinnedColor } from '@/lib/colorArtifacts'
import { useCanvasStore } from '@/lib/store/useCanvasStore'
import { useSampleReadout } from '@/lib/hooks/useSampleReadout'

interface MobileDashboardProps {
  sampledColor: {
    hex: string
    rgb: { r: number; g: number; b: number }
    hsl: { h: number; s: number; l: number }
    label?: string
    valueMetadata?: { y: number; step: number; range: [number, number]; percentile: number }
  } | null
  activePalette?: Palette
  onPin?: (newPin: PinnedColor) => void
  isPinned?: boolean
  onSwitchToMatches?: () => void
  onSwitchToMix?: () => void
  onChoosePaints?: () => void
  forceCorePalette?: boolean
  layout?: 'sheet' | 'inline'
}

type SheetState = 'collapsed' | 'medium' | 'expanded'
const NEXT_STATE: Record<SheetState, SheetState> = { collapsed: 'medium', medium: 'expanded', expanded: 'collapsed' }

export default function MobileDashboard({
  sampledColor,
  activePalette,
  onPin,
  isPinned = false,
  onSwitchToMatches,
  onSwitchToMix,
  onChoosePaints,
  forceCorePalette = false,
}: MobileDashboardProps) {
  const [sheetState, setSheetState] = useState<SheetState>('collapsed')
  const [isPinning, setIsPinning] = useState(false)
  const { getSelectedPaintIds, isUsingPaintPalette } = usePaintPaletteStore()
  const selectedPaintIds = getSelectedPaintIds()
  const hasPaintPalette = !forceCorePalette && isUsingPaintPalette()
  const valueScaleSettings = useCanvasStore((state) => state.valueScaleSettings)
  const valueModeSteps = ([5, 7, 9, 11] as const).find((step) => step === valueScaleSettings.steps) ?? 7
  const readout = useSampleReadout({
    sampledColor,
    valueModeEnabled: valueScaleSettings.enabled,
    valueModeSteps,
    preferredName: sampledColor?.label,
  })

  const solveOptions = useMemo(() => {
    if (hasPaintPalette && selectedPaintIds.length) return { useCatalog: true as const, paintIds: selectedPaintIds }
    if (!activePalette || activePalette.isDefault) return undefined
    return { paletteColorIds: activePalette.colors.map((color) => color.id) }
  }, [activePalette, hasPaintPalette, selectedPaintIds])

  const handlePin = async () => {
    if (!sampledColor || !onPin || isPinned) return
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

  return (
    <section className="mobile-result-sheet" data-sheet-state={sheetState} data-testid="mobile-result-sheet" aria-label="Sample result">
      <button
        type="button"
        className="mobile-sheet-handle"
        onClick={() => setSheetState(NEXT_STATE[sheetState])}
        aria-label={sheetState === 'collapsed' ? 'Show Result' : sheetState === 'medium' ? 'More Details' : 'Collapse'}
        aria-expanded={sheetState !== 'collapsed'}
      >
        <span aria-hidden="true" />
      </button>

      {sampledColor ? (
        <>
          <div className="mobile-sample-summary">
            <i style={{ backgroundColor: valueScaleSettings.enabled ? readout.grayscaleHex : sampledColor.hex }} aria-hidden="true" />
            <div>
              <strong aria-live="polite">{readout.isLoadingName ? 'Reading color…' : readout.displayName}</strong>
              <code>{sampledColor.hex.toUpperCase()}</code>
            </div>
            <button type="button" onClick={() => setSheetState(NEXT_STATE[sheetState])}>
              {sheetState === 'collapsed' ? 'Show Result' : sheetState === 'medium' ? 'More Details' : 'Collapse'}
            </button>
          </div>

          {sheetState !== 'collapsed' && readout.chroma && (
            <div className="mobile-result-body">
              <div className="mobile-character" aria-label="Color character">
                <span><small>Value</small><strong aria-label={`Value ${readout.painterValue.toFixed(1)} of 10, ${readout.valueBand}`}>{readout.painterValue.toFixed(1)}<em>/10</em></strong></span>
                <span><small>Temperature</small><strong>{readout.temperatureLabel}</strong></span>
                <span><small>Chroma</small><strong>{readout.chroma.label}</strong></span>
              </div>

              <div className="mobile-mix-preview">
                <h3>Practical mix</h3>
                <PaintRecipe
                  hsl={sampledColor.hsl}
                  targetHex={sampledColor.hex}
                  activePalette={activePalette}
                  useCatalog={hasPaintPalette}
                  paintIds={hasPaintPalette ? selectedPaintIds : undefined}
                  variant="compact"
                  showExportButton={false}
                  hideHeader
                  hideFooter
                  previewOnly
                  onChoosePaints={onChoosePaints}
                />
              </div>

              {sheetState === 'expanded' && (
                <div className="mobile-technical-details">
                  <div><span>RGB</span><code>{sampledColor.rgb.r} {sampledColor.rgb.g} {sampledColor.rgb.b}</code></div>
                  <div><span>HSL</span><code>{sampledColor.hsl.h}° {sampledColor.hsl.s}% {sampledColor.hsl.l}%</code></div>
                  <div><span>Source</span><strong>{hasPaintPalette ? `${selectedPaintIds.length} library paints` : activePalette?.isDefault ? 'Core six-color mix' : activePalette?.name}</strong></div>
                </div>
              )}
            </div>
          )}

          {sheetState !== 'collapsed' && (
            <div className="mobile-result-actions" aria-label="Sample actions" aria-live="polite">
              <button type="button" className="primary" onClick={onSwitchToMix}>Mix</button>
              <button type="button" onClick={onSwitchToMatches}>Threads</button>
              <button type="button" onClick={handlePin} disabled={isPinning || isPinned}>
                {isPinning ? 'Saving…' : isPinned ? 'Saved' : 'Save'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="mobile-sample-summary mobile-sample-summary--empty">
          <div><strong>Tap the image to sample.</strong><span>Results appear here.</span></div>
        </div>
      )}
    </section>
  )
}
