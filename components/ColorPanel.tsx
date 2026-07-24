'use client'

import { useState, useCallback, useId } from 'react'
import { rgb as culoriRgb } from 'culori'
import PaintRecipe from './PaintRecipe'
import MixLab from './MixLab'
import DMCFlossMatch from './DMCFlossMatch'
import FullScreenOverlay from './FullScreenOverlay'
import PhotoshopColorWheel from './PhotoshopColorWheel'
import ColorHarmonies from './ColorHarmonies'
import ValueHistogram from './ValueHistogram'
import ValueChromaGraph from './ValueChromaGraph'
import ColorCardModal from './ColorCardModal'
import CollapsibleSection from './ui/CollapsibleSection'
import { getPainterChroma, getLuminance, getValueBand } from '@/lib/paintingMath'
import { PinnedColor } from '@/lib/types/pinnedColor'
import { ColorCard } from '@/lib/types/colorCard'
import { ValueScaleSettings } from '@/lib/types/valueScale'
import { Palette } from '@/lib/types/palette'
import { generatePaintRecipe } from '@/lib/colorMixer'
import { solveRecipe } from '@/lib/paint/solveRecipe'
import { findClosestDMCColors } from '@/lib/dmcFloss'
import { ValueScaleResult } from '@/lib/valueScale'
import ColorNamingDisplay from './ColorNamingDisplay'
import { getColorName } from '@/lib/colorNaming'
import { createColorCard } from '@/lib/colorArtifacts'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import ColorDeckPanel from './ColorDeckPanel'

type MixSection = 'recipe' | 'mixlab' | 'harmonies' | 'value'


interface ColorPanelProps {
  sampledColor: {
    hex: string
    rgb: { r: number; g: number; b: number }
    hsl: { h: number; s: number; l: number }
    valueMetadata?: {
      y: number
      step: number
      range: [number, number]
      percentile: number
    }
  } | null
  onColorSelect: (rgb: { r: number; g: number; b: number }) => void
  onPin: (newPin: PinnedColor) => void
  isPinned: boolean
  valueScaleSettings?: ValueScaleSettings
  onValueScaleChange?: (settings: ValueScaleSettings) => void
  activePalette?: Palette
  histogramBins?: number[]
  valueScaleResult?: ValueScaleResult | null
  lastSampleTime?: number
}

type Tab = 'painter' | 'thread' | 'deck'

export default function ColorPanel({ sampledColor, onColorSelect, onPin, isPinned, valueScaleSettings, onValueScaleChange, activePalette, histogramBins, valueScaleResult, lastSampleTime }: ColorPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('painter')
  const [openSections, setOpenSections] = useState<Set<MixSection>>(new Set(['recipe']))
  const [label, setLabel] = useState('')
  const [isPinning, setIsPinning] = useState(false)
  const [isCreatingCard, setIsCreatingCard] = useState(false)
  const [showColorFullScreen, setShowColorFullScreen] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const [pendingCard, setPendingCard] = useState<ColorCard | null>(null)
  const isShortViewport = useMediaQuery('(max-height: 900px)')
  const noteInputId = useId()

  const ExpandIcon = () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
    </svg>
  )

  // Section toggle handlers
  const toggleSection = useCallback((section: MixSection) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setOpenSections(new Set(['recipe', 'mixlab', 'harmonies', 'value']))
  }, [])

  const collapseAll = useCallback(() => {
    setOpenSections(new Set())
  }, [])


  if (!sampledColor) {
    return (
      <div className="h-full p-6 flex flex-col items-center justify-center bg-white text-studio-secondary">
        <div className="w-16 h-16 rounded-full border-2 border-gray-100 flex items-center justify-center mb-4">
          <span className="text-2xl text-studio-dim">?</span>
        </div>
        <p className="text-center font-semibold text-studio">Click image to sample</p>
        <p className="text-sm text-studio-muted mt-2">Pick a color to analyze</p>
      </div>
    )
  }

  const { hex, rgb, hsl } = sampledColor
  const chroma = getPainterChroma(hex)
  const recipeVariant = isShortViewport ? 'compact' : 'standard'

  // Value First Data
  const valuePercent = getLuminance(rgb.r, rgb.g, rgb.b)
  const valueBand = getValueBand(valuePercent)

  return (
    <div className="min-h-full bg-paper-shell font-sans text-ink">

      {/* BENTO HERO SWATCH & NAMING AREA */}
      <div className="border-b border-ink-hairline bg-paper-elevated p-4 lg:p-6 shadow-sm">
        <div className="flex flex-col gap-4">

          {/* Giant Hero Swatch */}
          <div className="group relative aspect-[2/1] w-full overflow-hidden rounded-2xl border border-ink-hairline shadow-md transition-shadow lg:aspect-video"
            style={{ backgroundColor: hex }}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent pointer-events-none" />
            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10" />
            {/* Expand button */}
            <button
              type="button"
              onClick={() => {
                setShowCardModal(false)
                setShowColorFullScreen(true)
              }}
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-xl bg-black/25 text-white/80 opacity-0 backdrop-blur-sm transition-all duration-200 hover:bg-black/50 hover:text-white group-hover:opacity-100"
              title="Open full-screen preview"
              aria-label="View color swatch full screen"
            >
              <ExpandIcon />
            </button>
          </div>

          {/* Color Naming Display */}
          <div className="w-full">
            <ColorNamingDisplay hex={hex} key={lastSampleTime} />
          </div>

          {/* Hero Actions & Values */}
          <div className="flex flex-col items-center justify-center pt-1">
            <div className="mb-3 flex flex-wrap items-center justify-center gap-3">
              <h2 className="font-mono text-3xl font-bold tracking-tight text-ink tabular-nums lg:text-4xl">{hex.toUpperCase()}</h2>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (isPinned) return
                    setIsPinning(true)
                    try {
                      const spectral = await solveRecipe(hex)
                      const fallback = generatePaintRecipe(hsl)
                      const dmc = await findClosestDMCColors(rgb, 5)

                      onPin({
                        id: crypto.randomUUID(),
                        hex,
                        rgb,
                        hsl,
                        label: label.trim() || `Color ${hex}`,
                        timestamp: Date.now(),
                        spectralRecipe: spectral,
                        fallbackRecipe: fallback,
                        dmcMatches: dmc
                      })
                      setLabel('')
                    } catch (e) {
                      console.error('Failed to pin color', e)
                    } finally {
                      setIsPinning(false)
                    }
                  }}
                  disabled={isPinning || isPinned}
                  className={`flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold uppercase tracking-[0.08em] transition-all active:scale-95 ${
                    isPinned
                      ? 'border-subsignal/30 bg-subsignal-muted text-subsignal'
                      : 'border-ink-hairline bg-paper text-ink shadow-sm hover:bg-paper-recessed'
                  }`}
                  aria-label={isPinned ? 'Color pinned' : 'Pin color'}
                >
                  {isPinning ? (
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 animate-spin rounded-full border-2 border-ink-muted border-t-ink" />
                      Pinning…
                    </span>
                  ) : isPinned ? (
                    <><span>✓</span> Pinned</>
                  ) : (
                    <><span>📌</span> Pin</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setIsCreatingCard(true)
                    try {
                      const dmc = await findClosestDMCColors(rgb, 5)
                      const luminance = getLuminance(rgb.r, rgb.g, rgb.b) / 100

                      let descriptiveName = ''
                      try {
                        const nameMatch = await getColorName(hex)
                        descriptiveName = nameMatch.name
                      } catch (e) {
                        console.error('Failed to get color name for card', e)
                      }

                      const newCard = await createColorCard(
                        { hex, rgb, hsl },
                        {
                          name: label.trim() || descriptiveName || `Color ${hex}`,
                          colorName: descriptiveName || undefined,
                          valueStep: sampledColor.valueMetadata?.step,
                          recipeLabel: activePalette?.isDefault ? 'Core six-color mix' : activePalette?.name || 'Active palette',
                          solveOptions: activePalette && !activePalette.isDefault ? { paletteColorIds: activePalette.colors.map(color => color.id) } : undefined,
                        }
                      )

                      setPendingCard({
                        ...newCard,
                        color: {
                          ...newCard.color,
                          luminance,
                        },
                        matches: {
                          ...newCard.matches,
                          dmc,
                        },
                      })
                      setShowColorFullScreen(false)
                      setShowCardModal(true)
                    } catch (e) {
                      console.error('Failed to create color card', e)
                    } finally {
                      setIsCreatingCard(false)
                    }
                  }}
                  disabled={isCreatingCard}
                  className="flex min-h-10 items-center gap-1.5 rounded-xl border border-ink-hairline bg-paper px-3 text-xs font-semibold uppercase tracking-[0.08em] text-ink shadow-sm transition-all hover:bg-paper-recessed active:scale-95 disabled:opacity-50"
                  aria-label="Create color card"
                >
                  {isCreatingCard ? (
                    <>
                      <span className="h-2 w-2 animate-spin rounded-full border-2 border-ink-muted border-t-ink" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <span>🎴</span> Make Card
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mb-3 w-full max-w-xs">
              <label htmlFor={noteInputId} className="sr-only">
                Color note
              </label>
              <input
                id={noteInputId}
                name="color-note"
                type="text"
                placeholder="Add swatch note…"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-ink-hairline bg-paper px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
              />
            </div>

            {/* Quick Readout Pills */}
            <div className="grid w-full grid-cols-2 gap-3 pt-1">
              <div className="flex flex-col items-center rounded-xl border border-ink-hairline bg-paper p-2.5">
                <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-ink-muted">Value %</span>
                <span className="font-mono text-xl font-bold tabular-nums text-ink">
                  {sampledColor.valueMetadata ? Math.round(sampledColor.valueMetadata.y * 100) : Math.round(valuePercent)}%
                </span>
                <span className="text-[10px] text-ink-secondary">{valueBand}</span>
              </div>
              <div className="flex flex-col items-center rounded-xl border border-ink-hairline bg-paper p-2.5">
                <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-ink-muted">Chroma</span>
                <span className="font-mono text-xl font-bold uppercase text-ink">{chroma.label}</span>
                <span className="font-mono text-[10px] text-ink-secondary">{chroma.value.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WORKBENCH TAB BAR */}
      <div className="flex border-b border-ink-hairline bg-paper-recessed p-1">
        <button
          onClick={() => setActiveTab('painter')}
          className={`flex-1 rounded-lg py-2.5 text-xs font-semibold uppercase tracking-[0.08em] transition-all ${
            activeTab === 'painter'
              ? 'bg-paper-elevated text-ink shadow-sm ring-1 ring-ink-hairline'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          Painter
        </button>
        <button
          onClick={() => setActiveTab('thread')}
          className={`flex-1 rounded-lg py-2.5 text-xs font-semibold uppercase tracking-[0.08em] transition-all ${
            activeTab === 'thread'
              ? 'bg-paper-elevated text-ink shadow-sm ring-1 ring-ink-hairline'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          Threads
        </button>
        <button
          onClick={() => setActiveTab('deck')}
          className={`flex-1 rounded-lg py-2.5 text-xs font-semibold uppercase tracking-[0.08em] transition-all ${
            activeTab === 'deck'
              ? 'bg-paper-elevated text-ink shadow-sm ring-1 ring-ink-hairline'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          Deck
        </button>
      </div>

      {/* CONTENT AREA */}
      <div className="p-4 lg:p-6">

        {activeTab === 'painter' && (
          <div className="space-y-4">

            {/* Perceptual Value & Chroma Graph Bento Card */}
            <ValueChromaGraph color={hex} />

            {/* Visualizer Color Wheel */}
            <section className="rounded-2xl border border-ink-hairline bg-paper-elevated p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-muted">
                  Interactive Hue Wheel
                </span>
                <span className="font-mono text-[10px] text-ink-secondary">HSL {hsl.h}°</span>
              </div>
              <PhotoshopColorWheel
                color={hex}
                onChange={(newHex) => {
                  const parsed = culoriRgb(newHex)
                  if (parsed) {
                    onColorSelect({
                      r: Math.round(parsed.r * 255),
                      g: Math.round(parsed.g * 255),
                      b: Math.round(parsed.b * 255)
                    })
                  }
                }}
              />
            </section>

            {/* Expand/Collapse All Control */}
            <div className="flex items-center justify-between py-1 px-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-muted">Inspector Sections</span>
              <div className="flex items-center gap-2 text-[10px]">
                <button
                  onClick={expandAll}
                  className="font-medium uppercase tracking-wider text-ink-secondary hover:text-ink"
                >
                  Expand all
                </button>
                <span className="text-ink-hairline">|</span>
                <button
                  onClick={collapseAll}
                  className="font-medium uppercase tracking-wider text-ink-secondary hover:text-ink"
                >
                  Collapse all
                </button>
              </div>
            </div>

            {/* Collapsible Sections */}
            <div className="space-y-3">

              {/* 1. Paint Recipe */}
              <CollapsibleSection
                title="Paint Recipe"
                icon="🎨"
                accentColor="blue"
                isOpen={openSections.has('recipe')}
                onToggle={() => toggleSection('recipe')}
              >
                <PaintRecipe hsl={hsl} targetHex={hex} activePalette={activePalette} variant={recipeVariant} />
              </CollapsibleSection>

              {/* 2. Mix Lab */}
              <CollapsibleSection
                title="Mix Lab"
                icon="🧪"
                accentColor="purple"
                isOpen={openSections.has('mixlab')}
                onToggle={() => toggleSection('mixlab')}
              >
                <MixLab targetHex={hex} />
              </CollapsibleSection>

              {/* 3. Color Harmonies */}
              <CollapsibleSection
                title="Color Harmonies"
                icon="🌈"
                accentColor="teal"
                isOpen={openSections.has('harmonies')}
                onToggle={() => toggleSection('harmonies')}
              >
                <ColorHarmonies rgb={rgb} onColorSelect={onColorSelect} />
              </CollapsibleSection>

              {/* 4. Value Scale */}
              <CollapsibleSection
                title="Value Scale"
                icon="◐"
                accentColor="yellow"
                isOpen={openSections.has('value')}
                onToggle={() => toggleSection('value')}
              >
                <div className="space-y-4">
                  {/* Value Distribution Histogram */}
                  {histogramBins && (
                    <div className="space-y-2">
                      <h4 className="font-serif text-xs font-semibold text-ink">Value Distribution</h4>
                      <ValueHistogram
                        bins={histogramBins}
                        thresholds={valueScaleResult?.thresholds}
                        currentValue={sampledColor ? getLuminance(sampledColor.rgb.r, sampledColor.rgb.g, sampledColor.rgb.b) / 100 : undefined}
                      />
                    </div>
                  )}

                  {/* Overlay Toggle */}
                  <div className="flex items-center justify-between py-2 border-t border-ink-hairline">
                    <span className="text-xs font-medium text-ink-secondary">Value Overlay</span>
                    <button
                      onClick={() => onValueScaleChange?.({ ...valueScaleSettings!, enabled: !valueScaleSettings?.enabled })}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                        valueScaleSettings?.enabled
                          ? 'border border-ink bg-ink text-paper'
                          : 'border border-ink-hairline bg-paper text-ink-secondary hover:bg-paper-recessed'
                      }`}
                    >
                      {valueScaleSettings?.enabled ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Settings Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.08em] text-ink-muted">Steps</span>
                      <select
                        value={valueScaleSettings?.steps}
                        onChange={(e) => onValueScaleChange?.({ ...valueScaleSettings!, steps: parseInt(e.target.value) })}
                        className="w-full rounded-xl border border-ink-hairline bg-paper px-2.5 py-1.5 text-xs font-mono text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                      >
                        <option value="5">5 Steps</option>
                        <option value="7">7 Steps</option>
                        <option value="9">9 Steps</option>
                        <option value="11">11 Steps</option>
                      </select>
                    </div>
                    <div>
                      <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.08em] text-ink-muted">Mode</span>
                      <select
                        value={valueScaleSettings?.mode}
                        onChange={(e) => onValueScaleChange?.({ ...valueScaleSettings!, mode: e.target.value as 'Even' | 'Percentile' })}
                        className="w-full rounded-xl border border-ink-hairline bg-paper px-2.5 py-1.5 text-xs font-mono text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                      >
                        <option value="Even">Even</option>
                        <option value="Percentile">Percentile</option>
                      </select>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        const canvas = document.getElementById('value-map-canvas') as HTMLCanvasElement;
                        if (!canvas) {
                          alert('Value map canvas not found. Please enable the overlay first.');
                          return;
                        }
                        canvas.toBlob((blob) => {
                          if (!blob) {
                            alert('Failed to generate PNG');
                            return;
                          }
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `value-map-${Date.now()}.png`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                        }, 'image/png');
                      }}
                      className="flex-1 rounded-xl border border-ink-hairline bg-paper py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:bg-paper-recessed"
                    >
                      Download PNG
                    </button>
                    <button
                      onClick={() => {
                        const data = JSON.stringify(valueScaleSettings, null, 2);
                        navigator.clipboard.writeText(data);
                        alert('Value Scale settings copied to clipboard!');
                      }}
                      className="flex-1 rounded-xl border border-ink-hairline bg-paper py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:bg-paper-recessed"
                    >
                      Copy JSON
                    </button>
                  </div>
                </div>
              </CollapsibleSection>

            </div>

            {/* Technical Readout Card */}
            <section className="rounded-2xl border border-ink-hairline bg-paper-elevated p-4 shadow-sm">
              <h3 className="mb-3 font-serif text-xs font-semibold text-ink">Technical Color Data</h3>
              <div className="grid grid-cols-2 gap-3 font-mono text-xs tabular-nums text-ink">
                <div className="rounded-xl border border-ink-hairline bg-paper p-2.5">
                  <span className="block text-[9px] font-medium uppercase tracking-[0.08em] text-ink-muted">RGB</span>
                  <span>{rgb.r}, {rgb.g}, {rgb.b}</span>
                </div>
                <div className="rounded-xl border border-ink-hairline bg-paper p-2.5">
                  <span className="block text-[9px] font-medium uppercase tracking-[0.08em] text-ink-muted">HSL</span>
                  <span>{hsl.h}°, {hsl.s}%, {hsl.l}%</span>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'thread' && (
          <div>
            <DMCFlossMatch rgb={rgb} onColorSelect={onColorSelect} />
          </div>
        )}

        {activeTab === 'deck' && (
          <div>
            <ColorDeckPanel
              sampledColor={sampledColor}
              activePaletteName={activePalette?.name}
              onGoToSample={() => setActiveTab('painter')}
            />
          </div>
        )}

      </div>

      {/* Full Screen Color Overlay */}
      <FullScreenOverlay
        isOpen={showColorFullScreen}
        onClose={() => setShowColorFullScreen(false)}
        backgroundColor={hex}
      />

      {/* Color Card Modal */}
      <ColorCardModal
        isOpen={showCardModal}
        onClose={() => {
          setShowCardModal(false)
          setPendingCard(null)
        }}
        card={pendingCard}
        isNewCard={true}
        onCardSaved={() => setLabel('')}
      />
    </div>
  )
}
