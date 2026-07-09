'use client'

/**
 * DesktopSampleHud — the color inspector.
 * Quiet, flat, tabular. The swatch is shown honestly (no gradients or
 * overlays on top of a sampled color). One surface, hairline rules.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { lab as culoriLab } from 'culori'
import ColorCardModal from '@/components/ColorCardModal'
import FullScreenOverlay from '@/components/FullScreenOverlay'
import PaintRecipe, { type DisplayRecipe } from '@/components/PaintRecipe'
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

const LABEL_CLASS = 'text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted'

function ValueRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      title={`Copy ${label}`}
      className="group flex w-full items-baseline justify-between gap-4 border-b border-ink-hairline py-2.5 text-left transition-colors last:border-b-0 hover:bg-paper-recessed/60"
    >
      <span className={LABEL_CLASS}>{label}</span>
      <span className="font-mono text-sm tabular-nums text-ink">
        {copied ? (
          <span className="text-ink-muted">Copied</span>
        ) : (
          value
        )}
      </span>
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
  const [copied, setCopied] = useState<string | null>(null)
  const [isPinning, setIsPinning] = useState(false)
  const [isCreatingCard, setIsCreatingCard] = useState(false)
  const [showColorPreview, setShowColorPreview] = useState(false)
  const [pendingCard, setPendingCard] = useState<ColorCard | null>(null)
  const [showCardModal, setShowCardModal] = useState(false)
  const [recipeSummary, setRecipeSummary] = useState<string | null>(null)
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
    setRecipeSummary(null)
    if (!sampledColor) {
      setShowColorPreview(false)
      setShowCardModal(false)
      setPendingCard(null)
    }
  }, [sampledColor])

  const recipeOptions = getPaletteRecipeOptions(activePalette)

  const labValue = useMemo(() => {
    if (!sampledColor) return null
    const parsed = culoriLab(sampledColor.hex)
    if (!parsed) return null
    return `${parsed.l.toFixed(1)}  ${(parsed.a ?? 0).toFixed(1)}  ${(parsed.b ?? 0).toFixed(1)}`
  }, [sampledColor])

  const handleRecipeResolved = useCallback((recipe: DisplayRecipe) => {
    const summary = recipe.ingredients
      .slice()
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map((ingredient) => `${ingredient.pigment.name} ${ingredient.percentage}`)
      .join(' / ')

    setRecipeSummary(summary || null)
  }, [])

  if (!sampledColor) {
    return (
      <aside className="workbench-floating-panel workbench-sample-hud flex h-full min-h-0 w-full min-w-0 flex-col">
        <div className={LABEL_CLASS}>Sample</div>
        <h2 className="mt-5 font-display text-2xl leading-tight text-ink">
          Click the image to sample a color
        </h2>
        <p className="mt-3 max-w-[22rem] text-base leading-7 text-ink-secondary">
          The sampled color, its value, and its paint mixture will appear here.
        </p>
      </aside>
    )
  }

  const { hex, rgb, hsl } = sampledColor
  if (!harmonies || !chroma) return null

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    window.setTimeout(() => setCopied(null), 1200)
  }

  const handlePin = async () => {
    if (isPinned) return
    setIsPinning(true)
    try {
      const pinnedColor = await createPinnedColor(
        { hex, rgb, hsl },
        {
          label: colorName || `Color ${hex}`,
          solveOptions: recipeOptions,
        }
      )
      onPin(pinnedColor)
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
          name: colorName || `Color ${hex}`,
          colorName: colorName || undefined,
          valueStep: valueModeMeta?.step ?? sampledColor.valueMetadata?.step,
          recipeLabel: activePalette.isDefault ? 'Core six-color mix' : activePalette.name,
          solveOptions: recipeOptions,
        }
      )
      setPendingCard(newCard)
      setShowColorPreview(false)
      setShowCardModal(true)
    } finally {
      setIsCreatingCard(false)
    }
  }

  const actionButtonClass =
    'flex-1 border border-ink-hairline bg-transparent px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-ink-secondary transition-colors hover:bg-paper-recessed hover:text-ink disabled:opacity-45 rounded-md'

  return (
    <>
      <aside
        className="workbench-floating-panel workbench-sample-hud flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden"
        data-layout={layoutMode}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          {/* Swatch — honest, flat, uncovered */}
          <section className="shrink-0">
            <button
              type="button"
              aria-label={`Open full-screen preview of sampled color ${hex}`}
              onClick={() => {
                setShowCardModal(false)
                setShowColorPreview(true)
              }}
              className="block w-full rounded-lg border border-ink-hairline p-0 transition-shadow hover:shadow-[inset_0_0_0_1px_rgba(26,26,26,0.25)]"
              style={{ backgroundColor: hex, minHeight: isWideLayout ? '8.5rem' : '7.5rem' }}
            />
            <div className="mt-3 flex items-start justify-between gap-4">
              <h2 className="min-w-0 font-display text-2xl leading-tight text-ink">
                {displayName}
              </h2>
              <span className="shrink-0 rounded-md border border-ink-hairline bg-paper px-2.5 py-1 font-mono text-sm text-ink-secondary">{hex.toUpperCase()}</span>
            </div>
          </section>

          {/* Color values — tabular, click to copy */}
          <section className="shrink-0">
            <ValueRow
              label="Hex"
              value={hex.toUpperCase()}
              copied={copied === 'hex'}
              onCopy={() => copyToClipboard(hex, 'hex')}
            />
            <ValueRow
              label="RGB"
              value={`${rgb.r}  ${rgb.g}  ${rgb.b}`}
              copied={copied === 'rgb'}
              onCopy={() => copyToClipboard(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, 'rgb')}
            />
            <ValueRow
              label="HSL"
              value={`${hsl.h}°  ${hsl.s}%  ${hsl.l}%`}
              copied={copied === 'hsl'}
              onCopy={() => copyToClipboard(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, 'hsl')}
            />
            {labValue && (
              <ValueRow
                label="Lab"
                value={labValue}
                copied={copied === 'lab'}
                onCopy={() => copyToClipboard(`lab(${labValue.split(/\s+/).join(' ')})`, 'lab')}
              />
            )}
          </section>

          {/* Character — value, temperature, chroma in one quiet row */}
          <section className="grid shrink-0 grid-cols-3 gap-px overflow-hidden rounded-md border border-ink-hairline bg-ink-hairline">
            <div className="bg-paper-elevated px-4 py-3">
              <div className={LABEL_CLASS}>Value</div>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-mono text-lg tabular-nums text-ink">{displayedValue}%</span>
                <span
                  className="h-4 w-4 rounded-sm border border-ink-hairline"
                  style={{ backgroundColor: grayscaleHex }}
                  aria-hidden
                />
              </div>
              <div className="mt-1 text-sm leading-snug text-ink-secondary">{valueBand}</div>
            </div>
            <div className="bg-paper-elevated px-4 py-3">
              <div className={LABEL_CLASS}>Temp</div>
              <div className="mt-2 text-base text-ink">{temperatureLabel}</div>
              <div className="mt-1 text-sm leading-snug text-ink-secondary">{harmonies.base.name}</div>
            </div>
            <div className="bg-paper-elevated px-4 py-3">
              <div className={LABEL_CLASS}>Chroma</div>
              <div className="mt-2 text-base text-ink">{chroma.label}</div>
              <div className="mt-1 font-mono text-sm tabular-nums leading-snug text-ink-secondary">
                {chroma.value.toFixed(3)}
              </div>
            </div>
          </section>

          {/* Value band control */}
          <section className="shrink-0 border-t border-ink-hairline pt-3">
            <div className="flex items-center gap-3">
              <div
                className="relative h-4 w-20 shrink-0 overflow-hidden rounded-sm border border-ink-hairline"
                aria-label={`Sample lightness near ${displayedValue} percent`}
              >
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to right, #0c0a09 0%, #78716c 50%, #fafaf9 100%)' }}
                />
                <div
                  className="pointer-events-none absolute top-0 z-10 h-full w-[2px] -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
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
                className="h-1 min-w-0 flex-1 cursor-pointer accent-ink"
              />
              <span className="shrink-0 font-mono text-sm tabular-nums text-ink-secondary">
                {activeValueBandIndex + 1}/{referenceBandSteps}
              </span>
            </div>
            {valueModeMeta ? (
              <div className="mt-2 font-mono text-sm text-ink-secondary">
                Value mode step {valueModeMeta.step}/{valueModeSteps}
              </div>
            ) : null}
          </section>

          {/* Paint recipe — subtractive mixture toward this color */}
          <section className="shrink-0 border-t border-ink-hairline pt-3">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <div className={LABEL_CLASS}>Practical mix</div>
                <div className="mt-1 text-base leading-snug text-ink">
                  {activePalette.isDefault ? 'Core six-color mix' : activePalette.name}
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-ink-hairline bg-paper px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Preview
              </span>
            </div>
            {recipeSummary && (
              <div
                className="mb-3 rounded-md border border-ink-hairline bg-paper px-3 py-2 font-mono text-[11px] leading-5 text-ink-secondary"
                aria-live="polite"
              >
                {recipeSummary}
              </div>
            )}
            <PaintRecipe
              hsl={hsl}
              targetHex={hex}
              activePalette={activePalette}
              variant="compact"
              showExportButton={false}
              hideHeader
              hideFooter
              previewOnly
              onRecipeResolved={handleRecipeResolved}
            />
          </section>

          {/* Actions */}
          <section className="flex shrink-0 items-stretch gap-2">
            <button
              type="button"
              onClick={handlePin}
              disabled={isPinning || isPinned}
              aria-label={isPinned ? 'Pinned color' : 'Pin color with recipe'}
              className={`flex-1 rounded-md border px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] transition-colors disabled:opacity-45 ${
                isPinned
                  ? 'border-ink-hairline bg-paper-recessed text-ink-muted'
                  : 'border-ink bg-ink text-paper-elevated hover:bg-[#2a241d]'
              }`}
            >
              {isPinning ? 'Pinning…' : isPinned ? 'Pinned Color' : 'Pin Color'}
            </button>
            {!simpleMode && (
              <button
                type="button"
                onClick={handleCreateCard}
                disabled={isCreatingCard}
                aria-label="Make color card"
                className={actionButtonClass}
              >
                {isCreatingCard ? 'Making Card…' : 'Make Card'}
              </button>
            )}
            {onAddToSession && (
              <button
                type="button"
                onClick={() => onAddToSession({ hex, rgb })}
                aria-label="Save swatch to session"
                className={actionButtonClass}
              >
                Save Swatch
              </button>
            )}
          </section>

          <p className="shrink-0 text-xs leading-5 text-ink-faint">{PICKED_COLOR_DISCLAIMER}</p>
        </div>
      </aside>

      <FullScreenOverlay
        isOpen={showColorPreview}
        onClose={() => setShowColorPreview(false)}
        backgroundColor={hex}
      />

      {showCardModal && (
        <ColorCardModal
          isOpen={showCardModal}
          onClose={() => {
            setShowCardModal(false)
            setPendingCard(null)
          }}
          card={pendingCard}
          isNewCard={true}
          onCardSaved={() => undefined}
        />
      )}
    </>
  )
}
