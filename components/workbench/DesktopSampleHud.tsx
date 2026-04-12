'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ColorCardModal from '@/components/ColorCardModal'
import FullScreenOverlay from '@/components/FullScreenOverlay'
import PaintRecipe from '@/components/PaintRecipe'
import { getBestContrast } from '@/lib/color/a11y'
import { getColorName } from '@/lib/colorNaming'
import { createColorCard, createPinnedColor } from '@/lib/colorArtifacts'
import { getPainterChroma, getLuminance, getValueBand } from '@/lib/paintingMath'
import type { ColorCard } from '@/lib/types/colorCard'
import type { Palette } from '@/lib/types/palette'
import type { PinnedColor } from '@/lib/types/pinnedColor'
import { getValueModeMetadataFromRgb, luminanceToGrayHex } from '@/lib/valueMode'
import { useCanvasStore } from '@/lib/store/useCanvasStore'

interface SampledColor {
  hex: string
  rgb: { r: number; g: number; b: number }
  hsl: { h: number; s: number; l: number }
  valueMetadata?: {
    y: number
    step: number
    range: [number, number]
    percentile: number
  }
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
}

const panelTransition = {
  type: 'spring',
  stiffness: 280,
  damping: 28,
  mass: 0.92,
} as const

function CopyAction({
  label,
  copied,
  onClick,
}: {
  label: string
  copied: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-colors ${
        copied
          ? 'border-subsignal bg-subsignal text-white'
          : 'border-ink-hairline bg-paper text-ink-secondary hover:bg-paper-recessed hover:text-ink'
      }`}
    >
      {copied ? 'OK' : label}
    </button>
  )
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
}: DesktopSampleHudProps) {
  const [label, setLabel] = useState('')
  const [colorName, setColorName] = useState('')
  const [copied, setCopied] = useState<'hex' | 'rgb' | 'hsl' | null>(null)
  const [isPinning, setIsPinning] = useState(false)
  const [isCreatingCard, setIsCreatingCard] = useState(false)
  const [showColorPreview, setShowColorPreview] = useState(false)
  const [pendingCard, setPendingCard] = useState<ColorCard | null>(null)
  const [showCardModal, setShowCardModal] = useState(false)
  const [narrowPanelView, setNarrowPanelView] = useState<'details' | 'mix'>('details')
  const isNarrowLayout = layoutMode === 'narrow'

  const valueScaleSettings = useCanvasStore((s) => s.valueScaleSettings)
  const activeValueBandIndex = useCanvasStore((s) => s.activeValueBandIndex)
  const setActiveValueBandIndex = useCanvasStore((s) => s.setActiveValueBandIndex)

  const referenceBandSteps = valueScaleSettings.steps

  const recipeOptions = useMemo(() => {
    if (activePalette.isDefault) return undefined
    return {
      paletteColorIds: activePalette.colors.map((color) => color.id),
    }
  }, [activePalette])

  useEffect(() => {
    if (!sampledColor) {
      setColorName('')
      return
    }

    let cancelled = false

    getColorName(sampledColor.hex)
      .then((result) => {
        if (!cancelled) {
          setColorName(result.name)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setColorName('')
        }
      })

    return () => {
      cancelled = true
    }
  }, [sampledColor])

  if (!sampledColor) {
    return (
      <aside className="workbench-floating-panel workbench-sample-hud flex h-full min-h-0 w-full min-w-0 flex-col justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-ink-faint">
            Live Sample
          </div>
          <h2 className="mt-3 font-display text-[2rem] leading-none tracking-[-0.04em] text-ink">
            Waiting
          </h2>
          <p className="mt-3 max-w-[18rem] text-sm leading-6 text-ink-secondary">
            Touch the canvas. The selected color lands here as a full paint sample instead of a small inspector readout.
          </p>
        </div>

        <div className="rounded-[26px] border border-dashed border-ink-hairline bg-[rgba(255,252,247,0.72)] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-ink-hairline bg-paper-recessed text-ink-faint">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4" />
                <path d="M12 18v4" />
                <path d="M2 12h4" />
                <path d="M18 12h4" />
              </svg>
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-ink-faint">Canvas First</div>
              <div className="mt-1 text-sm font-semibold text-ink">Sample to begin</div>
            </div>
          </div>
        </div>
      </aside>
    )
  }

  const { hex, rgb, hsl } = sampledColor
  const displayName = colorName || hex.toUpperCase()
  const valuePercent = getLuminance(rgb.r, rgb.g, rgb.b)
  const valueBand = getValueBand(valuePercent)
  const chroma = getPainterChroma(hex)
  const valueModeMeta = valueModeEnabled ? getValueModeMetadataFromRgb(rgb, valueModeSteps) : null
  const displayedValue = valueModeEnabled && valueModeMeta
    ? Math.round(valueModeMeta.y * 100)
    : sampledColor.valueMetadata
      ? Math.round(sampledColor.valueMetadata.y * 100)
      : valuePercent
  const swatchHasDarkSurface = getBestContrast(hex) === 'white'
  const swatchTextColor = swatchHasDarkSurface ? '#ffffff' : '#171311'
  const grayscaleHex = luminanceToGrayHex(displayedValue / 100)

  const copyToClipboard = (text: string, type: 'hex' | 'rgb' | 'hsl') => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    window.setTimeout(() => setCopied(null), 1400)
  }

  const handlePin = async () => {
    if (isPinned) return

    setIsPinning(true)
    try {
      const pinnedColor = await createPinnedColor(
        { hex, rgb, hsl },
        {
          label: label.trim() || colorName || `Color ${hex}`,
          solveOptions: recipeOptions,
        }
      )

      onPin(pinnedColor)
      setLabel('')
    } finally {
      setIsPinning(false)
    }
  }

  const handleCreateCard = async () => {
    setIsCreatingCard(true)
    try {
      const newCard = await createColorCard(
        { hex, rgb, hsl },
        {
          name: label.trim() || colorName || `Color ${hex}`,
          colorName: colorName || undefined,
          valueStep: valueModeMeta?.step ?? sampledColor.valueMetadata?.step,
          recipeLabel: activePalette.isDefault ? 'Core six-color mix' : activePalette.name,
          solveOptions: recipeOptions,
        }
      )

      setPendingCard(newCard)
      setShowColorPreview(false)
      setShowCardModal(true)
      setLabel('')
    } finally {
      setIsCreatingCard(false)
    }
  }

  // ── Header row: distance-readable studio identity ──
  const headerRow = (
    <section className="shrink-0 rounded-[28px] border border-ink-hairline bg-[rgba(255,252,247,0.9)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <div className="space-y-4">
        <motion.button
          key={hex}
          type="button"
          aria-label={`Open full-screen preview of sampled color ${hex}`}
          onClick={() => {
            setShowCardModal(false)
            setShowColorPreview(true)
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={panelTransition}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="group relative block w-full overflow-hidden rounded-[26px] border border-black/8 p-0 text-left shadow-[0_18px_40px_rgba(33,24,14,0.16)] transition-shadow hover:shadow-[0_22px_46px_rgba(33,24,14,0.22)]"
          style={{ backgroundColor: hex, color: swatchTextColor, minHeight: '10rem' }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/10" />
          <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
            <div className="rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]" style={{
              color: swatchTextColor,
              borderColor: swatchHasDarkSurface ? 'rgba(255,255,255,0.28)' : 'rgba(23,19,17,0.12)',
              backgroundColor: swatchHasDarkSurface ? 'rgba(255,255,255,0.12)' : 'rgba(255,252,247,0.5)',
            }}>
              Target
            </div>
            <div
              className="rounded-full border px-3 py-1 font-mono text-[11px] font-bold"
              style={{
                color: swatchTextColor,
                borderColor: swatchHasDarkSurface ? 'rgba(255,255,255,0.28)' : 'rgba(23,19,17,0.12)',
                backgroundColor: swatchHasDarkSurface ? 'rgba(255,255,255,0.12)' : 'rgba(255,252,247,0.5)',
              }}
            >
              {hex.toUpperCase()}
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="font-mono text-xs font-black uppercase tracking-[0.18em] opacity-80" style={{ color: swatchTextColor }}>
                  {displayedValue}% value
                </div>
                <div className="mt-1 text-[2.2rem] font-black leading-none tracking-[-0.06em]" style={{ color: swatchTextColor }}>
                  {valueBand}
                </div>
              </div>
              <div
                className="h-10 w-10 rounded-[14px] border"
                style={{
                  backgroundColor: grayscaleHex,
                  borderColor: swatchHasDarkSurface ? 'rgba(255,255,255,0.3)' : 'rgba(23,19,17,0.14)',
                }}
              />
            </div>
          </div>
        </motion.button>

        <div className="space-y-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-ink-faint">
              Color To Mix
            </div>
            <h2 className="mt-2 font-display text-[2rem] leading-none tracking-[-0.05em] text-ink">
              {displayName}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.95rem] font-bold tabular-nums text-ink-secondary">
              <span className="text-ink">{hex.toUpperCase()}</span>
              <span className="text-ink-faint">•</span>
              <span>{chroma.label}</span>
              {valueModeMeta ? (
                <>
                  <span className="text-ink-faint">•</span>
                  <span>Step {valueModeMeta.step}/{valueModeSteps}</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[20px] border border-ink-hairline bg-[rgba(255,252,247,0.82)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.64)]">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">
                Palette
              </div>
              <div className="mt-1 text-base font-semibold leading-tight text-ink">
                {activePalette.isDefault ? 'Core mix' : activePalette.name}
              </div>
            </div>
            <div className="rounded-[20px] border border-ink-hairline bg-[rgba(255,252,247,0.82)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.64)]">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">
                Value Band
              </div>
              <div className="mt-1 text-base font-semibold leading-tight text-ink">
                {activeValueBandIndex + 1}/{referenceBandSteps}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePin}
              disabled={isPinning || isPinned}
              className={`inline-flex items-center justify-center rounded-full border px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all disabled:opacity-55 ${
                isPinned
                  ? 'border-subsignal bg-subsignal text-white'
                  : 'border-transparent bg-signal text-white hover:bg-signal-hover'
              }`}
            >
              {isPinning ? '…' : isPinned ? 'Pinned' : 'Pin'}
            </button>
            {!simpleMode && (
              <button
                type="button"
                onClick={handleCreateCard}
                disabled={isCreatingCard}
                className="inline-flex items-center justify-center rounded-full border border-transparent bg-subsignal px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-all hover:bg-subsignal-hover disabled:opacity-55"
              >
                {isCreatingCard ? '…' : 'Card'}
              </button>
            )}
            {onAddToSession && (
              <button
                type="button"
                onClick={() => onAddToSession({ hex, rgb })}
                className="inline-flex items-center justify-center rounded-full border border-ink-hairline bg-[rgba(255,252,247,0.82)] px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-ink-secondary transition-colors hover:bg-paper hover:text-ink"
              >
                Dock
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )

  // ── Hero mix section — full width, takes all remaining space ──
  const mixHero = (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-ink-hairline bg-[linear-gradient(180deg,rgba(255,252,247,0.96),rgba(245,239,229,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <div className="border-b border-ink-hairline px-5 py-4">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-ink-faint">
          Studio Recipe
        </div>
        <div className="mt-1 font-display text-[1.35rem] leading-none tracking-[-0.03em] text-ink">
          Mix this color
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <PaintRecipe
          hsl={hsl}
          targetHex={hex}
          activePalette={activePalette}
          variant="board"
          showExportButton={false}
          hideHeader
          hideFooter
        />
      </div>
    </section>
  )

  // ── Footer copy strip ──
  const copyFooter = (
    <div className="flex shrink-0 items-center gap-2 rounded-[16px] border border-ink-hairline bg-[rgba(255,252,247,0.72)] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-ink-faint">Tools</span>
      <div className="h-3 w-px bg-ink-hairline" />
      <CopyAction label="HEX" copied={copied === 'hex'} onClick={() => copyToClipboard(hex, 'hex')} />
      <CopyAction label="RGB" copied={copied === 'rgb'} onClick={() => copyToClipboard(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, 'rgb')} />
      <CopyAction label="HSL" copied={copied === 'hsl'} onClick={() => copyToClipboard(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, 'hsl')} />
    </div>
  )

  // ── Narrow layout: stacks vertically with a tab switch ──
  const narrowPanel = (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      {/* Compact header for narrow */}
      <section className="shrink-0 rounded-[22px] border border-ink-hairline bg-[rgba(255,252,247,0.82)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.64)]">
        <div className="flex items-center gap-3">
          <motion.button
            key={hex}
            type="button"
            aria-label={`Open full-screen preview of sampled color ${hex}`}
            onClick={() => {
              setShowCardModal(false)
              setShowColorPreview(true)
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={panelTransition}
            className="shrink-0 overflow-hidden rounded-[16px] shadow-[0_6px_20px_rgba(33,24,14,0.18)]"
            style={{ backgroundColor: hex, color: swatchTextColor, width: '3.5rem', height: '3.5rem' }}
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-base font-semibold leading-tight tracking-[-0.03em] text-ink">
              {displayName}
            </h2>
            <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] tabular-nums text-ink-secondary">
              <span className="font-semibold text-ink">{hex.toUpperCase()}</span>
              <span className="text-ink-faint">·</span>
              <span className={valueModeEnabled ? 'text-signal font-semibold' : ''}>{displayedValue}%</span>
              <span className="text-ink-faint">·</span>
              <span>{chroma.label}</span>
            </div>
          </div>
        </div>

        {/* Target band */}
        <div className="mt-3 flex items-center gap-2">
          <div
            className="relative h-4 w-16 shrink-0 overflow-hidden rounded-md border border-ink-hairline"
            aria-label={`Sample lightness near ${displayedValue} percent`}
          >
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to right, #0c0a09 0%, #78716c 50%, #fafaf9 100%)' }}
            />
            <div
              className="pointer-events-none absolute top-0 z-10 h-full w-[3px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
              style={{ left: `${displayedValue}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, referenceBandSteps - 1)}
            value={activeValueBandIndex}
            onChange={(e) => setActiveValueBandIndex(Number(e.target.value))}
            aria-label="Canvas value overlay band"
            className="h-1.5 min-w-0 flex-1 cursor-pointer accent-signal"
          />
          <span className="shrink-0 font-mono text-[9px] tabular-nums text-ink-secondary">
            {activeValueBandIndex + 1}/{referenceBandSteps}
          </span>
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-ink-hairline/50 pt-3">
          <button
            type="button"
            onClick={handlePin}
            disabled={isPinning || isPinned}
            className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] transition-all disabled:opacity-55 ${
              isPinned
                ? 'border-subsignal bg-subsignal text-white'
                : 'border-transparent bg-signal text-white hover:bg-signal-hover'
            }`}
          >
            {isPinning ? '…' : isPinned ? 'Pinned' : 'Pin'}
          </button>
          {!simpleMode && (
            <button
              type="button"
              onClick={handleCreateCard}
              disabled={isCreatingCard}
              className="inline-flex items-center justify-center rounded-full border border-transparent bg-subsignal px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-white transition-all hover:bg-subsignal-hover disabled:opacity-55"
            >
              {isCreatingCard ? '…' : 'Card'}
            </button>
          )}
          {onAddToSession && (
            <button
              type="button"
              onClick={() => onAddToSession({ hex, rgb })}
              className="inline-flex items-center justify-center rounded-full border border-ink-hairline bg-[rgba(255,252,247,0.82)] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-ink-secondary transition-colors hover:bg-paper hover:text-ink"
            >
              Dock
            </button>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <CopyAction label="HEX" copied={copied === 'hex'} onClick={() => copyToClipboard(hex, 'hex')} />
            <CopyAction label="RGB" copied={copied === 'rgb'} onClick={() => copyToClipboard(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, 'rgb')} />
            <CopyAction label="HSL" copied={copied === 'hsl'} onClick={() => copyToClipboard(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, 'hsl')} />
          </div>
        </div>
      </section>

      <div className="rounded-[18px] border border-ink-hairline bg-[rgba(255,252,247,0.78)] px-3 py-2">
        <div className="inline-flex overflow-hidden rounded-full border border-ink-hairline bg-paper-elevated p-1 text-[10px] font-black uppercase tracking-[0.16em] text-ink-secondary">
          <button
            type="button"
            onClick={() => setNarrowPanelView('details')}
            className={`rounded-full px-3 py-1.5 transition-colors ${narrowPanelView === 'details' ? 'bg-ink text-paper' : 'hover:text-ink'}`}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => setNarrowPanelView('mix')}
            className={`rounded-full px-3 py-1.5 transition-colors ${narrowPanelView === 'mix' ? 'bg-ink text-paper' : 'hover:text-ink'}`}
          >
            Mix
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {narrowPanelView === 'details' ? (
          <section className="flex min-h-0 min-w-0 flex-1 flex-col rounded-[22px] border border-ink-hairline bg-[rgba(255,252,247,0.82)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.64)]">
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              {!simpleMode && (
                <label className="block shrink-0">
                  <span className="sr-only">Optional sample label</span>
                  <input
                    type="text"
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder="Note (optional)"
                    className="studio-input w-full rounded-2xl bg-[rgba(255,252,247,0.78)] px-4 py-3.5 text-sm"
                  />
                </label>
              )}
              <div className="text-[13px] tabular-nums text-ink">
                <span className={valueModeEnabled ? 'text-signal font-semibold' : ''}>{displayedValue}%</span>
                <span className="mx-2 text-ink-faint">·</span>
                <span>{chroma.label}</span>
                {valueModeMeta ? (
                  <>
                    <span className="mx-2 text-ink-faint">·</span>
                    <span>Step {valueModeMeta.step}/{valueModeSteps}</span>
                  </>
                ) : null}
              </div>
              <p className="text-sm text-ink-secondary">
                Palette: <span className="font-semibold text-ink">{activePalette.isDefault ? 'Core mix' : activePalette.name}</span>
              </p>
              <p className="text-sm text-ink-secondary">
                RGB <span className="font-mono text-[12px] font-bold text-ink">{rgb.r}, {rgb.g}, {rgb.b}</span>
                <span className="mx-2 text-ink-faint">·</span>
                HSL <span className="font-mono text-[12px] font-bold text-ink">{hsl.h}°, {hsl.s}%, {hsl.l}%</span>
              </p>
            </div>
          </section>
        ) : (
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-ink-hairline bg-[linear-gradient(180deg,rgba(255,252,247,0.96),rgba(245,239,229,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <div className="border-b border-ink-hairline px-4 py-3">
              <div className="font-display text-base leading-tight tracking-[-0.02em] text-ink">
                {activePalette.isDefault ? 'Core six-color mix' : activePalette.name}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <PaintRecipe
                hsl={hsl}
                targetHex={hex}
                activePalette={activePalette}
                variant="compact"
                showExportButton={false}
                hideHeader
                hideFooter
              />
            </div>
          </section>
        )}
      </div>
    </div>
  )

  return (
    <>
      <aside
        className="workbench-floating-panel workbench-sample-hud flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden"
        data-layout={layoutMode}
      >
        {isNarrowLayout ? (
          narrowPanel
        ) : (
          <div className={`flex min-h-0 flex-1 flex-col gap-3 ${layoutMode === 'wide' ? 'p-4' : 'p-3'}`}>
            {headerRow}
            {mixHero}
            {copyFooter}
          </div>
        )}
      </aside>

      <FullScreenOverlay
        isOpen={showColorPreview}
        onClose={() => setShowColorPreview(false)}
        backgroundColor={hex}
      />

      <AnimatePresence>
        {showCardModal && (
          <motion.div
            key="color-card-modal-shell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
