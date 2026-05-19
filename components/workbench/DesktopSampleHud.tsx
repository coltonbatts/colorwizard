'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ColorCardModal from '@/components/ColorCardModal'
import FullScreenOverlay from '@/components/FullScreenOverlay'
import PaintRecipe from '@/components/PaintRecipe'
import { getBestContrast } from '@/lib/color/a11y'
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
      className={`inline-flex h-8 items-center justify-center rounded-full border px-3 text-[10px] font-black uppercase tracking-[0.14em] transition-colors ${
        copied
          ? 'border-subsignal bg-subsignal text-white'
          : 'border-ink-hairline bg-[rgba(255,252,247,0.72)] text-ink-secondary hover:bg-paper hover:text-ink'
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
  const [copied, setCopied] = useState<'hex' | 'rgb' | 'hsl' | null>(null)
  const [isPinning, setIsPinning] = useState(false)
  const [isCreatingCard, setIsCreatingCard] = useState(false)
  const [showColorPreview, setShowColorPreview] = useState(false)
  const [pendingCard, setPendingCard] = useState<ColorCard | null>(null)
  const [showCardModal, setShowCardModal] = useState(false)
  const isNarrowLayout = layoutMode === 'narrow'
  const isWideLayout = layoutMode === 'wide'

  const valueScaleSettings = useCanvasStore((s) => s.valueScaleSettings)
  const activeValueBandIndex = useCanvasStore((s) => s.activeValueBandIndex)
  const setActiveValueBandIndex = useCanvasStore((s) => s.setActiveValueBandIndex)
  const {
    colorName,
    displayName,
    harmonies,
    temperatureLabel,
    chroma,
    valueBand,
    valueModeMeta,
    grayscaleHex,
    displayedValue,
  } = useSampleReadout({
    sampledColor,
    valueModeEnabled,
    valueModeSteps,
  })

  const referenceBandSteps = valueScaleSettings.steps

  useEffect(() => {
    if (!sampledColor) {
      setShowColorPreview(false)
      setShowCardModal(false)
      setPendingCard(null)
    }
  }, [sampledColor])
  const recipeOptions = getPaletteRecipeOptions(activePalette)

  if (!sampledColor) {
    return (
      <aside className="workbench-floating-panel workbench-sample-hud flex h-full min-h-0 w-full min-w-0 flex-col justify-between gap-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-ink-faint">Live sample</div>
          <h2 className="mt-3 font-display text-[2.1rem] leading-none tracking-[-0.04em] text-ink">Pick a color</h2>
          <p className="mt-3 max-w-[18rem] text-sm leading-6 text-ink-secondary">
            Click the canvas. The panel will stay focused on the color, value, and next action.
          </p>
        </div>

        <div className="rounded-[24px] border border-ink-hairline bg-[rgba(255,252,247,0.62)] p-4 shadow-[var(--shadow-pressed)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-ink-hairline bg-paper-elevated text-ink-faint shadow-[var(--shadow-sm)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4" />
                <path d="M12 18v4" />
                <path d="M2 12h4" />
                <path d="M18 12h4" />
              </svg>
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-ink-faint">Canvas first</div>
              <div className="mt-1 text-sm font-semibold text-ink">Click to sample</div>
            </div>
          </div>
        </div>
      </aside>
    )
  }

  const { hex, rgb, hsl } = sampledColor
  if (!harmonies || !chroma) return null

  const swatchHasDarkSurface = getBestContrast(hex) === 'white'
  const swatchTextColor = swatchHasDarkSurface ? '#ffffff' : '#171311'

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

  const actionRow = (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        onClick={handlePin}
        disabled={isPinning || isPinned}
        className={`inline-flex h-10 flex-1 items-center justify-center rounded-[14px] border px-3 text-[10px] font-black uppercase tracking-[0.14em] transition-all disabled:opacity-55 ${
          isPinned
            ? 'border-subsignal bg-subsignal text-white'
            : 'border-transparent bg-signal text-white shadow-[0_10px_20px_rgba(200,35,25,0.18)] hover:bg-signal-hover'
        }`}
      >
        {isPinning ? 'Saving' : isPinned ? 'Pinned' : 'Pin'}
      </button>
      {!simpleMode && (
        <button
          type="button"
          onClick={handleCreateCard}
          disabled={isCreatingCard}
          className="inline-flex h-10 flex-1 items-center justify-center rounded-[14px] border border-ink-hairline bg-[rgba(255,252,247,0.76)] px-3 text-[10px] font-black uppercase tracking-[0.14em] text-ink-secondary transition-colors hover:bg-paper hover:text-ink disabled:opacity-55"
        >
          {isCreatingCard ? 'Making' : 'Card'}
        </button>
      )}
      {onAddToSession && (
        <button
          type="button"
          onClick={() => onAddToSession({ hex, rgb })}
          className="inline-flex h-10 flex-1 items-center justify-center rounded-[14px] border border-ink-hairline bg-[rgba(255,252,247,0.76)] px-3 text-[10px] font-black uppercase tracking-[0.14em] text-ink-secondary transition-colors hover:bg-paper hover:text-ink"
        >
          Dock
        </button>
      )}
    </div>
  )

  const sampleCard = (
    <section className="shrink-0 overflow-hidden rounded-[28px] border border-ink-hairline bg-[rgba(255,252,247,0.76)] shadow-[var(--shadow-tactile)]">
      <div className="p-3">
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
          className="group relative block w-full overflow-hidden rounded-[22px] border border-black/8 p-0 text-left shadow-[0_18px_40px_rgba(33,24,14,0.16)] transition-shadow hover:shadow-[0_22px_46px_rgba(33,24,14,0.22)]"
          style={{ backgroundColor: hex, color: swatchTextColor, minHeight: isWideLayout ? '9.2rem' : '7.8rem' }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/14 via-transparent to-white/12" />
          <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
            <span
              className="rounded-full border px-3 py-1 font-mono text-[11px] font-black uppercase tracking-[0.04em]"
              style={{
                color: swatchTextColor,
                borderColor: swatchHasDarkSurface ? 'rgba(255,255,255,0.28)' : 'rgba(23,19,17,0.12)',
                backgroundColor: swatchHasDarkSurface ? 'rgba(255,255,255,0.12)' : 'rgba(255,252,247,0.52)',
              }}
            >
              {hex.toUpperCase()}
            </span>
            <span
              className="rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
              style={{
                color: swatchTextColor,
                borderColor: swatchHasDarkSurface ? 'rgba(255,255,255,0.28)' : 'rgba(23,19,17,0.12)',
                backgroundColor: swatchHasDarkSurface ? 'rgba(255,255,255,0.12)' : 'rgba(255,252,247,0.52)',
              }}
            >
              Photo sample
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
            <div className="font-display text-[clamp(1.7rem,3vw,2.25rem)] leading-none tracking-[-0.04em]" style={{ color: swatchTextColor }}>
              {displayName}
            </div>
          </div>
        </motion.button>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.04em] text-ink-secondary">
            RGB {rgb.r}, {rgb.g}, {rgb.b}
          </div>
          <div className="flex items-center gap-1.5">
            <CopyAction label="HEX" copied={copied === 'hex'} onClick={() => copyToClipboard(hex, 'hex')} />
            <CopyAction label="RGB" copied={copied === 'rgb'} onClick={() => copyToClipboard(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, 'rgb')} />
          </div>
          <p className="w-full px-1 text-[10px] leading-4 text-ink-faint">
            {PICKED_COLOR_DISCLAIMER}
          </p>
        </div>
      </div>
    </section>
  )

  const essentials = (
    <section className="grid shrink-0 grid-cols-3 gap-2">
      <div className="rounded-[20px] border border-ink-hairline bg-[rgba(255,252,247,0.7)] px-3 py-3 shadow-[var(--shadow-pressed)]">
        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-ink-faint">Value</div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div>
            <div className="font-mono text-xl font-black tabular-nums leading-none text-ink">{displayedValue}%</div>
            <div className="mt-1 text-[11px] font-semibold leading-tight text-ink-secondary">{valueBand}</div>
          </div>
          <div className="h-8 w-8 rounded-[11px] border border-ink-hairline" style={{ backgroundColor: grayscaleHex }} aria-hidden />
        </div>
      </div>

      <div className="rounded-[20px] border border-ink-hairline bg-[rgba(255,252,247,0.7)] px-3 py-3 shadow-[var(--shadow-pressed)]">
        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-ink-faint">Temp</div>
        <div className="mt-2 text-sm font-black leading-tight text-ink">{temperatureLabel}</div>
        <div className="mt-1 truncate text-[11px] font-semibold text-ink-secondary">{harmonies.base.name}</div>
      </div>

      <div className="rounded-[20px] border border-ink-hairline bg-[rgba(255,252,247,0.7)] px-3 py-3 shadow-[var(--shadow-pressed)]">
        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-ink-faint">Chroma</div>
        <div className="mt-2 text-sm font-black leading-tight text-ink">{chroma.label}</div>
        <div className="mt-1 font-mono text-[11px] tabular-nums text-ink-secondary">c {chroma.value.toFixed(3)}</div>
      </div>
    </section>
  )

  const valueBandControl = (
    <section className="shrink-0 rounded-[20px] border border-ink-hairline bg-[rgba(255,252,247,0.58)] px-3 py-3 shadow-[var(--shadow-pressed)]">
      <div className="flex items-center gap-3">
        <div
          className="relative h-4 w-16 shrink-0 overflow-hidden rounded-full border border-ink-hairline"
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
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-ink-secondary">
          {activeValueBandIndex + 1}/{referenceBandSteps}
        </span>
      </div>
      {valueModeMeta ? (
        <div className="mt-2 font-mono text-[10px] font-bold text-signal">
          Value mode step {valueModeMeta.step}/{valueModeSteps}
        </div>
      ) : null}
    </section>
  )

  const mixPanel = (
    <details className="group min-h-0 shrink-0 overflow-hidden rounded-[22px] border border-ink-hairline bg-[rgba(255,252,247,0.62)] shadow-[var(--shadow-pressed)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-ink-faint">Starting mix</div>
          <div className="mt-1 truncate text-sm font-black text-ink">
            {activePalette.isDefault ? 'Core six-color mix' : activePalette.name}
          </div>
        </div>
        <div className="inline-flex h-8 shrink-0 items-center gap-2 rounded-full border border-ink-hairline bg-[rgba(255,252,247,0.74)] px-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-secondary">
          Recipe
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform group-open:rotate-180"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </summary>
      <div className="border-t border-ink-hairline p-3">
        <PaintRecipe
          hsl={hsl}
          targetHex={hex}
          activePalette={activePalette}
          variant="compact"
          showExportButton={false}
          hideFooter
        />
      </div>
    </details>
  )

  const panelBody = (
    <div className={`flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto ${isNarrowLayout ? 'p-3' : isWideLayout ? 'p-4' : 'p-3'}`}>
      {sampleCard}
      {essentials}
      {valueBandControl}
      {actionRow}
      {mixPanel}
      <div className="flex shrink-0 items-center justify-end gap-1.5 px-1">
        <CopyAction label="HSL" copied={copied === 'hsl'} onClick={() => copyToClipboard(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, 'hsl')} />
      </div>
    </div>
  )

  return (
    <>
      <aside
        className="workbench-floating-panel workbench-sample-hud flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden"
        data-layout={layoutMode}
      >
        {panelBody}
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
