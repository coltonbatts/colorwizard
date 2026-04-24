'use client'

import { useState, useEffect, type ReactNode } from 'react'
import FullScreenOverlay from '../FullScreenOverlay'
import ColorCardModal from '../ColorCardModal'
import PaintRecipe from '../PaintRecipe'
import { PinnedColor } from '@/lib/types/pinnedColor'
import { ColorCard } from '@/lib/types/colorCard'
import { Palette } from '@/lib/types/palette'
import { getColorName } from '@/lib/colorNaming'
import { useIsMobile, useMediaQuery } from '@/hooks/useMediaQuery'
import { createColorCard, createPinnedColor } from '@/lib/colorArtifacts'
import { getPaletteRecipeOptions, useSampleReadout } from '@/lib/hooks/useSampleReadout'

interface SampleTabProps {
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
  onPin: (newPin: PinnedColor) => void
  isPinned: boolean
  lastSampleTime?: number
  activePalette: Palette
  simpleMode: boolean
  valueModeEnabled: boolean
  valueModeSteps: 5 | 7 | 9 | 11
  onAddToSession?: (color: { hex: string; rgb: { r: number; g: number; b: number } }) => void
  onSwitchToMatches?: () => void
  dismissPreviewSignal?: number
  suppressPreviewOverlay?: boolean
}

function InspectorSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="border-t border-ink-hairline py-3 first:border-t-0">
      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">
        {title}
      </div>
      {children}
    </section>
  )
}

function ReadoutChip({
  label,
  value,
  active = false,
}: {
  label: string
  value: string
  active?: boolean
}) {
  return (
    <div className={`rounded-lg border px-2.5 py-2 ${active ? 'border-signal bg-signal-muted text-signal' : 'border-ink-hairline bg-paper text-ink'}`}>
      <div className="text-[8px] font-black uppercase tracking-[0.2em] opacity-70">{label}</div>
      <div className="mt-1 font-mono text-sm font-bold tracking-tight">{value}</div>
    </div>
  )
}

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

export default function SampleTab({
  sampledColor,
  onPin,
  isPinned,
  activePalette,
  simpleMode,
  valueModeEnabled,
  valueModeSteps,
  onAddToSession,
  onSwitchToMatches,
  dismissPreviewSignal,
  suppressPreviewOverlay = false,
}: SampleTabProps) {
  const isMobile = useIsMobile()
  const isShortViewport = useMediaQuery('(max-height: 920px)')
  const [label, setLabel] = useState('')
  const [isPinning, setIsPinning] = useState(false)
  const [showColorFullScreen, setShowColorFullScreen] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const [pendingCard, setPendingCard] = useState<ColorCard | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [isCreatingCard, setIsCreatingCard] = useState(false)
  const {
    colorName,
    displayName,
    isLoadingName,
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

  useEffect(() => {
    if (dismissPreviewSignal === undefined) return
    setShowColorFullScreen(false)
    setShowCardModal(false)
  }, [dismissPreviewSignal])

  const recipeOptions = getPaletteRecipeOptions(activePalette)

  if (!sampledColor) {
    return (
      <div className="flex h-full min-h-full items-center justify-center bg-paper-elevated px-4 text-center">
        <div className="flex max-w-xs flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-ink-hairline bg-paper-recessed text-ink-faint">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4" />
              <path d="M12 18v4" />
              <path d="M2 12h4" />
              <path d="M18 12h4" />
            </svg>
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">
            Sample
          </div>
          <div className="text-sm font-semibold text-ink">
            Tap or click the image to sample.
          </div>
        </div>
      </div>
    )
  }

  const { hex, rgb, hsl } = sampledColor
  const recipeVariant = isShortViewport ? 'compact' : 'standard'
  const sampleName = colorName || (isLoadingName ? 'Analyzing...' : displayName)

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 1500)
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
      let descriptiveName = colorName
      if (!descriptiveName) {
        try {
          const nameMatch = await getColorName(hex)
          descriptiveName = nameMatch.name
        } catch (error) {
          console.error('Failed to get color name', error)
        }
      }

      const newCard = await createColorCard(
        { hex, rgb, hsl },
        {
          name: label.trim() || descriptiveName || `Color ${hex}`,
          colorName: descriptiveName || undefined,
          valueStep: valueModeEnabled && valueModeMeta ? valueModeMeta.step : sampledColor.valueMetadata?.step,
          solveOptions: recipeOptions,
          recipeLabel: activePalette.isDefault ? 'Core six-color mix' : activePalette.name,
        }
      )
      setShowColorFullScreen(false)
      setPendingCard(newCard)
      setShowCardModal(true)
    } catch (error) {
      console.error('Failed to create color card', error)
    } finally {
      setIsCreatingCard(false)
    }
  }

  const recipePanel = (
    <PaintRecipe
      hsl={hsl}
      targetHex={hex}
      activePalette={activePalette}
      variant={isMobile ? recipeVariant : 'compact'}
      showExportButton={false}
    />
  )

  if (isMobile) {
    return (
      <div className="flex min-h-full flex-col space-y-4 bg-paper-elevated p-4 text-ink font-sans">
        <div className="flex items-center gap-4">
          <div
            className="h-16 w-16 shrink-0 rounded-xl border border-ink-hairline shadow-inner"
            style={{ backgroundColor: valueModeEnabled ? grayscaleHex : hex }}
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold leading-tight text-ink">
              {sampleName}
            </h2>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              {displayedValue}% · {valueBand}
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm font-bold text-ink">{hex}</div>
          </div>
        </div>

        {harmonies && (
          <div className="rounded-xl border border-ink-hairline bg-paper-recessed p-3 text-[12px] leading-snug text-ink-secondary">
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-ink-faint">2–3 · Temp &amp; chroma</div>
            <div className="mt-1 font-semibold text-ink">
              {temperatureLabel} · {harmonies.base.name}
              <span className="font-normal text-ink-secondary"> vs {harmonies.complementary.name}</span>
            </div>
            <div className="mt-1 text-ink">
              Chroma: <span className="font-semibold">{chroma?.label}</span>{' '}
              <span className="font-mono text-[11px] text-ink-secondary">c {chroma?.value.toFixed(3)}</span>
            </div>
          </div>
        )}

        {valueModeEnabled && valueModeMeta && (
          <div className="flex items-center justify-between rounded-xl border border-ink-hairline bg-paper-recessed p-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-signal animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-signal">Value Step</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-ink">{valueModeMeta.step}</span>
              <span className="text-xs font-bold text-ink-faint">/ {valueModeSteps}</span>
            </div>
          </div>
        )}

        <div className="text-[8px] font-black uppercase tracking-[0.2em] text-ink-faint">4 · Starting mix</div>
        <div className="-mt-1">{recipePanel}</div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handlePin}
            disabled={isPinning || isPinned}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-bold transition-all ${
              isPinned
                ? 'border border-subsignal bg-subsignal-muted text-subsignal'
                : 'bg-signal text-white shadow-lg active:scale-95'
            }`}
          >
            {isPinning ? 'Pinning…' : isPinned ? 'Pinned' : 'Pin'}
          </button>

          {onSwitchToMatches && (
            <button
              onClick={onSwitchToMatches}
              className="flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-4 text-sm font-bold text-white shadow-lg transition-all active:scale-95"
            >
              Threads
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => copyToClipboard(hex, 'hex')}
            className="flex-1 rounded-lg border border-ink-hairline bg-paper-recessed py-2 text-[11px] font-bold text-ink-secondary transition-colors hover:text-ink"
          >
            {copied === 'hex' ? 'Copied' : 'Copy HEX'}
          </button>
          <button
            onClick={() => copyToClipboard(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, 'rgb')}
            className="flex-1 rounded-lg border border-ink-hairline bg-paper-recessed py-2 text-[11px] font-bold text-ink-secondary transition-colors hover:text-ink"
          >
            {copied === 'rgb' ? 'Copied' : 'Copy RGB'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-paper-elevated text-ink">
      <div className="sticky top-0 z-20 border-b border-ink-hairline bg-paper-elevated/96 px-4 py-3 backdrop-blur-md lg:px-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_4.75rem] xl:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-semibold tracking-tight text-ink">
                {sampleName}
              </h2>
              {valueModeEnabled && valueModeMeta && (
                <span className="rounded-full border border-signal bg-signal-muted px-2 py-1 font-mono text-[10px] font-bold text-signal">
                  {valueModeMeta.step}/{valueModeSteps}
                </span>
              )}
            </div>

            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">
              Painting readout
            </div>

            <div className="mt-3 space-y-2 text-[11px] leading-snug text-ink-secondary">
              <div className="rounded-xl border border-ink-hairline bg-paper-recessed px-3 py-2">
                <div className="text-[8px] font-black uppercase tracking-[0.2em] text-ink-faint">1 · Big shapes &amp; value</div>
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-base font-black text-ink">{displayedValue}%</span>
                  <span className="font-semibold text-ink-secondary">{valueBand}</span>
                  {valueModeEnabled && valueModeMeta && (
                    <span className="font-mono text-[10px] font-bold text-signal">
                      step {valueModeMeta.step}/{valueModeSteps}
                    </span>
                  )}
                </div>
              </div>
              {harmonies && (
                <div className="rounded-xl border border-ink-hairline bg-paper-recessed px-3 py-2">
                  <div className="text-[8px] font-black uppercase tracking-[0.2em] text-ink-faint">
                    2 · Temperature &amp; relativity
                  </div>
                  <div className="mt-1 text-ink">
                    <span className="rounded border border-ink-hairline bg-paper px-1.5 py-0.5 text-[10px] font-bold">
                      {temperatureLabel}
                    </span>
                    <span className="mx-1.5 text-ink-faint">·</span>
                    <span className="font-semibold">{harmonies.base.name}</span>
                    <span className="text-ink-faint"> vs </span>
                    <span className="font-semibold">{harmonies.complementary.name}</span>
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-ink-hairline bg-paper-recessed px-3 py-2">
                <div className="text-[8px] font-black uppercase tracking-[0.2em] text-ink-faint">3 · Chroma (this passage)</div>
                <div className="mt-1 font-semibold text-ink">
                  {chroma?.label}{' '}
                  <span className="font-mono text-[11px] font-normal text-ink-secondary">(c {chroma?.value.toFixed(3)})</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <ReadoutChip label="HEX" value={hex} active />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowCardModal(false)
              setShowColorFullScreen(true)
            }}
            className="group relative aspect-square min-h-[4.75rem] overflow-hidden rounded-xl border border-ink-hairline shadow-inner xl:justify-self-end"
            style={{ backgroundColor: valueModeEnabled ? grayscaleHex : hex }}
            title="Open sample"
          >
            <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-md bg-black/12 text-white backdrop-blur-sm">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 3h6v6" />
                <path d="M9 21H3v-6" />
                <path d="M21 3l-7 7" />
                <path d="M3 21l7-7" />
              </svg>
            </span>
          </button>
        </div>

        <div className="mt-3 space-y-2">
          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-ink-faint">4 · Starting mix</div>
          {recipePanel}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePin}
            disabled={isPinning || isPinned}
            className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-colors ${
              isPinned
                ? 'border border-subsignal bg-subsignal-muted text-subsignal'
                : 'bg-signal text-white hover:bg-signal-hover'
            }`}
            title="Pin sample"
          >
            {isPinning ? 'Pinning…' : isPinned ? 'Pinned' : 'Pin'}
          </button>

          {!simpleMode && (
            <button
              type="button"
              onClick={handleCreateCard}
              disabled={isCreatingCard}
              className="inline-flex items-center justify-center rounded-lg bg-subsignal px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-subsignal-hover"
              title="Create card"
            >
              {isCreatingCard ? 'Saving…' : 'Card'}
            </button>
          )}

          {!simpleMode && onAddToSession && (
            <button
              type="button"
              onClick={() => onAddToSession({ hex, rgb })}
              className="inline-flex items-center justify-center rounded-lg border border-ink-hairline bg-paper px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-ink-secondary transition-colors hover:bg-paper-recessed hover:text-ink"
              title="Send to dock"
            >
              Dock
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col px-4 pb-4 lg:px-5 lg:pb-5">
        <InspectorSection title="Readouts">
          <div className="grid gap-3 lg:grid-cols-[7.5rem_minmax(0,1fr)]">
            <div className="rounded-xl border border-ink-hairline bg-paper-recessed p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">Value</div>
              <div className="mt-2 font-mono text-3xl font-black tracking-tight text-ink">
                {displayedValue}%
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-ink-secondary">
                <div className="h-4 w-4 rounded-[4px] border border-ink-hairline" style={{ backgroundColor: grayscaleHex }} />
                <span>
                  {valueModeEnabled && valueModeMeta
                    ? `${valueModeMeta.step}/${valueModeSteps}`
                    : sampledColor.valueMetadata
                      ? `Step ${sampledColor.valueMetadata.step}`
                      : valueBand}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-ink-hairline bg-paper-recessed p-3">
              <dl className="space-y-2 text-sm text-ink-secondary">
                <div className="flex items-center justify-between gap-3">
                  <dt>RGB</dt>
                  <dd className="font-mono text-[12px] font-bold text-ink">{rgb.r}, {rgb.g}, {rgb.b}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt>HSL</dt>
                  <dd className="font-mono text-[12px] font-bold text-ink">{hsl.h}°, {hsl.s}%, {hsl.l}%</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt>Palette</dt>
                  <dd className="truncate font-semibold text-ink">{activePalette.name}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <CopyAction label="HEX" copied={copied === 'hex'} onClick={() => copyToClipboard(hex, 'hex')} />
            <CopyAction label="RGB" copied={copied === 'rgb'} onClick={() => copyToClipboard(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, 'rgb')} />
            <CopyAction label="HSL" copied={copied === 'hsl'} onClick={() => copyToClipboard(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, 'hsl')} />
          </div>
        </InspectorSection>

        {!simpleMode && (
          <InspectorSection title="Label">
            <input
              type="text"
              placeholder="Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="studio-input w-full"
            />
          </InspectorSection>
        )}
      </div>

      <FullScreenOverlay
        isOpen={showColorFullScreen && !suppressPreviewOverlay}
        onClose={() => setShowColorFullScreen(false)}
        backgroundColor={hex}
      />

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
