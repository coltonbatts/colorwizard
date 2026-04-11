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
  onAddToSession?: (color: { hex: string; rgb: { r: number; g: number; b: number } }) => void
}

const panelTransition = {
  type: 'spring',
  stiffness: 280,
  damping: 28,
  mass: 0.92,
} as const

function MetricTile({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="rounded-[18px] border border-ink-hairline bg-[rgba(255,252,247,0.88)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.64)]">
      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-ink-faint">{label}</div>
      <div className={`mt-2 font-mono text-[13px] font-bold tracking-tight text-ink ${accent ?? ''}`}>
        {value}
      </div>
    </div>
  )
}

function ActionButton({
  label,
  onClick,
  tone = 'paper',
  disabled = false,
}: {
  label: string
  onClick: () => void
  tone?: 'paper' | 'signal' | 'subsignal'
  disabled?: boolean
}) {
  const toneClasses =
    tone === 'signal'
      ? 'border-transparent bg-signal text-white hover:bg-signal-hover'
      : tone === 'subsignal'
        ? 'border-transparent bg-subsignal text-white hover:bg-subsignal-hover'
        : 'border-ink-hairline bg-[rgba(255,252,247,0.82)] text-ink-secondary hover:bg-paper hover:text-ink'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-full border px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-[background-color,color,transform,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-55 ${toneClasses}`}
    >
      {label}
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
  onAddToSession,
}: DesktopSampleHudProps) {
  const [label, setLabel] = useState('')
  const [colorName, setColorName] = useState('')
  const [copied, setCopied] = useState(false)
  const [isPinning, setIsPinning] = useState(false)
  const [isCreatingCard, setIsCreatingCard] = useState(false)
  const [showColorPreview, setShowColorPreview] = useState(false)
  const [pendingCard, setPendingCard] = useState<ColorCard | null>(null)
  const [showCardModal, setShowCardModal] = useState(false)

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
      <aside className="workbench-floating-panel workbench-sample-hud flex h-full w-[min(22rem,30vw)] min-w-[18.5rem] flex-col justify-between">
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
  const grayscaleHex = valueModeMeta
    ? luminanceToGrayHex(valueModeMeta.y)
    : `#${Math.round(displayedValue * 2.55).toString(16).padStart(2, '0').repeat(3)}`
  const swatchHasDarkSurface = getBestContrast(hex) === 'white'
  const swatchTextColor = swatchHasDarkSurface ? '#ffffff' : '#171311'
  const swatchMutedTextColor = swatchHasDarkSurface ? 'rgba(255,255,255,0.8)' : 'rgba(23,19,17,0.72)'
  const swatchBadgeStyle = swatchHasDarkSurface
    ? {
        color: '#ffffff',
        borderColor: 'rgba(255,255,255,0.28)',
        backgroundColor: 'rgba(255,255,255,0.14)',
      }
    : {
        color: '#171311',
        borderColor: 'rgba(23,19,17,0.14)',
        backgroundColor: 'rgba(255,252,247,0.58)',
      }

  const copyHex = () => {
    navigator.clipboard.writeText(hex.toUpperCase())
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
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

  return (
    <>
      <aside className="workbench-floating-panel workbench-sample-hud flex h-full w-[min(23rem,31vw)] min-w-[19rem] flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-ink-faint">
              Live Sample
            </div>
            <h2 className="mt-3 truncate font-display text-[2.2rem] leading-none tracking-[-0.045em] text-ink">
              {displayName}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">
              <span>{valueBand}</span>
              <span className="h-1 w-1 rounded-full bg-ink-faint" />
              <span>{chroma.label}</span>
              {valueModeMeta && (
                <>
                  <span className="h-1 w-1 rounded-full bg-ink-faint" />
                  <span>Step {valueModeMeta.step}/{valueModeSteps}</span>
                </>
              )}
            </div>
          </div>

          <ActionButton label={copied ? 'Copied' : 'Copy'} onClick={copyHex} />
        </div>

        <motion.button
          key={hex}
          type="button"
          onClick={() => {
            setShowCardModal(false)
            setShowColorPreview(true)
          }}
          initial={{ opacity: 0, y: 14, scale: 0.94, rotate: -1 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
          transition={panelTransition}
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="workbench-swatch-object group relative aspect-[1.02/1] overflow-hidden rounded-[32px] border border-black/8 p-0 text-left shadow-[0_28px_70px_rgba(33,24,14,0.24)]"
          style={{ backgroundColor: hex, color: swatchTextColor }}
        >
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em]" style={swatchBadgeStyle}>
            <span
              className="inline-flex h-2 w-2 rounded-full"
              style={{ backgroundColor: swatchHasDarkSurface ? 'rgba(255,255,255,0.82)' : 'rgba(23,19,17,0.64)' }}
            />
            Captured
          </div>

          <div className="absolute right-4 top-4 rounded-full border px-3 py-1.5 font-mono text-[11px] font-bold" style={swatchBadgeStyle}>
            {hex.toUpperCase()}
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-display text-[1.65rem] leading-none tracking-[-0.04em] text-current">
                {displayName}
              </div>
              <div className="mt-2 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: swatchMutedTextColor }}>
                {activePalette.isDefault ? 'Core six-color mix' : activePalette.name}
              </div>
            </div>

            {valueModeEnabled && (
              <div className="rounded-[18px] border px-3 py-2" style={swatchBadgeStyle}>
                <div className="text-[8px] font-black uppercase tracking-[0.18em]" style={{ color: swatchMutedTextColor }}>
                  Value
                </div>
                <div className="mt-1 flex items-center gap-2 font-mono text-sm font-bold text-current">
                  <div
                    className="h-3.5 w-3.5 rounded-[5px] border"
                    style={{
                      backgroundColor: grayscaleHex,
                      borderColor: swatchHasDarkSurface ? 'rgba(255,255,255,0.28)' : 'rgba(23,19,17,0.14)',
                    }}
                  />
                  {displayedValue}%
                </div>
              </div>
            )}
          </div>
        </motion.button>

        <div className="grid grid-cols-3 gap-2">
          <MetricTile label="HEX" value={hex.toUpperCase()} />
          <MetricTile label="Value" value={`${displayedValue}%`} accent={valueModeEnabled ? 'text-signal' : undefined} />
          <MetricTile label="Chroma" value={chroma.label} />
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton
            label={isPinning ? 'Pinning' : isPinned ? 'Pinned' : 'Pin'}
            onClick={handlePin}
            tone={isPinned ? 'subsignal' : 'signal'}
            disabled={isPinning || isPinned}
          />
          {!simpleMode && (
            <ActionButton
              label={isCreatingCard ? 'Saving' : 'Card'}
              onClick={handleCreateCard}
              tone="subsignal"
              disabled={isCreatingCard}
            />
          )}
          {onAddToSession && (
            <ActionButton label="Dock" onClick={() => onAddToSession({ hex, rgb })} />
          )}
        </div>

        {!simpleMode && (
          <label className="block">
            <span className="sr-only">Optional sample label</span>
            <input
              type="text"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Optional note for pin or card"
              className="studio-input w-full rounded-full bg-[rgba(255,252,247,0.78)] px-4 py-3 text-sm"
            />
          </label>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-ink-hairline bg-[linear-gradient(180deg,rgba(255,252,247,0.96),rgba(245,239,229,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <div className="flex items-start justify-between gap-3 border-b border-ink-hairline px-4 py-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-ink-faint">Mix Path</div>
              <div className="mt-1 text-sm font-semibold text-ink">
                {activePalette.isDefault ? 'Core six-color mix' : activePalette.name}
              </div>
            </div>
            <div className="rounded-full border border-ink-hairline bg-[rgba(255,252,247,0.8)] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-secondary">
              Process
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
        </div>
      </aside>

      <FullScreenOverlay
        isOpen={showColorPreview}
        onClose={() => setShowColorPreview(false)}
        backgroundColor={hex}
      />

      <AnimatePresence>
        {showCardModal && (
          <motion.div
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
