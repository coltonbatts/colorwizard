'use client'

import { useState, useEffect, useMemo } from 'react'
import PaintRecipe from './PaintRecipe'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Palette, DEFAULT_PALETTE } from '@/lib/types/palette'
import { PinnedColor } from '@/lib/types/pinnedColor'
import { usePaintPaletteStore } from '@/lib/store/usePaintPaletteStore'
import { getColorName } from '@/lib/colorNaming'
import { createPinnedColor } from '@/lib/colorArtifacts'
import { useCanvasStore } from '@/lib/store/useCanvasStore'

interface MobileDashboardProps {
    sampledColor: {
        hex: string
        rgb: { r: number; g: number; b: number }
        hsl: { h: number; s: number; l: number }
        label?: string
        valueMetadata?: {
            y: number
            step: number
            range: [number, number]
            percentile: number
        }
    } | null
    activePalette?: Palette
    onPin?: (newPin: PinnedColor) => void
    isPinned?: boolean
    onSwitchToMatches?: () => void
    layout?: 'sheet' | 'inline'
}

export default function MobileDashboard({
    sampledColor,
    activePalette,
    onPin,
    isPinned = false,
    onSwitchToMatches,
    layout = 'sheet',
}: MobileDashboardProps) {
    const { getSelectedPaintIds, isUsingPaintPalette } = usePaintPaletteStore()
    const selectedPaintIds = getSelectedPaintIds()
    const hasPaintPalette = isUsingPaintPalette()

    const valueScaleSettings = useCanvasStore((s) => s.valueScaleSettings)
    const activeValueBandIndex = useCanvasStore((s) => s.activeValueBandIndex)
    const setActiveValueBandIndex = useCanvasStore((s) => s.setActiveValueBandIndex)
    const referenceBandSteps = valueScaleSettings.steps
    const sampleBandIndex0 =
        sampledColor?.valueMetadata != null ? sampledColor.valueMetadata.step - 1 : null
    const bandMatchesTarget =
        sampleBandIndex0 !== null && sampleBandIndex0 === activeValueBandIndex
    const isShortViewport = useMediaQuery('(max-height: 860px)')
    const isInline = layout === 'inline'

    const [colorName, setColorName] = useState<string>('')
    const [isLoadingName, setIsLoadingName] = useState(false)
    const [isPinning, setIsPinning] = useState(false)
    const sampledHex = sampledColor?.hex
    const sampledLabel = sampledColor?.label

    const solveOptions = useMemo(() => {
        if (hasPaintPalette && selectedPaintIds.length > 0) {
            return {
                useCatalog: true as const,
                paintIds: selectedPaintIds,
            }
        }

        if (!activePalette || activePalette.isDefault) return undefined
        return {
            paletteColorIds: activePalette.colors.map(color => color.id),
        }
    }, [activePalette, hasPaintPalette, selectedPaintIds])

    useEffect(() => {
        if (!sampledHex) {
            setColorName('')
            return
        }

        if (sampledLabel && sampledLabel !== 'New Color') {
            setColorName(sampledLabel)
            return
        }

        let cancelled = false
        setIsLoadingName(true)

        getColorName(sampledHex)
            .then((result) => {
                if (!cancelled) {
                    setColorName(result.name)
                }
            })
            .catch((err) => {
                console.error('Failed to get color name:', err)
                if (!cancelled) {
                    setColorName('')
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoadingName(false)
                }
            })

        return () => {
            cancelled = true
        }
    }, [sampledHex, sampledLabel])

    const displayName = sampledColor ? (colorName || sampledColor.hex.toUpperCase()) : ''
    const paletteLabel = hasPaintPalette
        ? `Paint library (${selectedPaintIds.length})`
        : activePalette?.isDefault
            ? 'Core six-color mix'
            : activePalette?.name || 'Active palette'
    const paletteLabelCompact = hasPaintPalette
        ? `Library ${selectedPaintIds.length}`
        : activePalette?.isDefault
            ? 'Core 6'
            : activePalette?.name || 'Palette'
    const recipeVariant = 'compact'
    const shellPadding = isInline
        ? 'px-2 py-2'
        : isShortViewport
            ? 'px-2.5 py-2'
            : 'px-3 py-2.5'
    const swatchSize = isInline ? 'h-10 w-10' : isShortViewport ? 'w-11 h-11' : 'w-12 h-12'
    const titleSize = isInline ? 'text-[14px]' : isShortViewport ? 'text-[14px]' : 'text-[15px]'
    const inlineSubtitle = sampledColor && colorName && colorName.toUpperCase() !== sampledColor.hex.toUpperCase()
        ? colorName
        : null

    const handlePin = async () => {
        if (!onPin || isPinned || !sampledColor) return
        setIsPinning(true)
        try {
            const color = sampledColor
            const pinnedColor = await createPinnedColor(
                color,
                {
                    label: color.label?.trim() || colorName || `Color ${color.hex}`,
                    solveOptions,
                }
            )

            onPin(pinnedColor)
        } finally {
            setIsPinning(false)
        }
    }

    return (
        <div className={`${isInline
            ? 'rounded-[16px] border border-ink-hairline bg-paper-elevated/96 shadow-[0_8px_18px_rgba(26,26,26,0.06)] backdrop-blur-md'
            : 'h-full min-h-0 flex flex-col overflow-hidden rounded-t-[24px] border-t border-gray-200 bg-white/96 shadow-[0_-16px_40px_rgba(0,0,0,0.14)] backdrop-blur-md dashboard-mode'
            }`}>
            {sampledColor ? (
                <>
                    <section className={`${shellPadding} shrink-0 ${isInline ? '' : 'border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white'}`}>
                        {isInline ? (
                            <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex flex-1 items-center gap-2.5">
                                    <div
                                        className={`${swatchSize} shrink-0 rounded-xl border border-white shadow-[0_6px_16px_rgba(0,0,0,0.14)]`}
                                        style={{ backgroundColor: sampledColor.hex }}
                                    />

                                    <div className="min-w-0 flex-1">
                                        <div className="font-mono text-[15px] font-black tracking-[0.04em] text-ink">
                                            {sampledColor.hex.toUpperCase()}
                                        </div>
                                        <div className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                                            {isLoadingName ? '...' : inlineSubtitle || paletteLabelCompact}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-1.5">
                                    {onSwitchToMatches && (
                                        <button
                                            type="button"
                                            onClick={() => onSwitchToMatches()}
                                            aria-label="Threads"
                                            title="Threads"
                                            className="inline-flex items-center justify-center rounded-full border border-ink-hairline bg-paper text-ink-secondary transition-colors active:bg-paper-recessed"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <path d="M18.5 5.5 7 17" />
                                                <circle cx="19.5" cy="4.5" r="1.5" />
                                                <path d="M19.5 4.5c1.2-1 2.3.9.7 2.6-2.7 2.8-5.5 2.2-7.3 4.9-1.6 2.5-.8 5.2-3.3 7-1.8 1.3-4 .8-5.1-.8" />
                                            </svg>
                                        </button>
                                    )}

                                    {onPin && (
                                        <button
                                            type="button"
                                            onClick={handlePin}
                                            disabled={isPinning || isPinned}
                                            aria-label={isPinned ? 'Pinned color' : 'Pin color'}
                                            title={isPinned ? 'Pinned' : 'Pin'}
                                            className={`inline-flex items-center justify-center rounded-full border transition-all ${
                                                isPinned
                                                    ? 'border-subsignal bg-subsignal-muted text-subsignal'
                                                    : 'border-ink-hairline bg-paper text-ink-secondary active:scale-95'
                                            }`}
                                        >
                                            {isPinning ? (
                                                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                            ) : isPinned ? (
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <path d="m5 12 4 4L19 6" />
                                                </svg>
                                            ) : (
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <path d="M12 17v4" />
                                                    <path d="m5 10 7-7 7 7" />
                                                    <path d="M8 13v-2.5a4 4 0 0 1 8 0V13" />
                                                </svg>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex flex-1 items-start gap-3">
                                    <div
                                        className={`${swatchSize} shrink-0 rounded-xl border border-white shadow-[0_6px_16px_rgba(0,0,0,0.14)]`}
                                        style={{ backgroundColor: sampledColor.hex }}
                                    />

                                    <div className="min-w-0 flex-1">
                                        <div className="text-[9px] font-black uppercase tracking-[0.24em] text-signal">
                                            Sampled Color
                                        </div>
                                        <div className="mt-2 min-w-0">
                                            <div className={`${titleSize} truncate font-black leading-tight text-ink`}>
                                                {isLoadingName ? (
                                                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-ink-muted border-t-transparent align-middle" />
                                                ) : (
                                                    displayName
                                                )}
                                            </div>
                                            <div className="mt-0.5 flex items-center gap-2 text-[10px]">
                                                <span className="font-mono font-bold tracking-wide text-ink-secondary">
                                                    {sampledColor.hex.toUpperCase()}
                                                </span>
                                                <span className="truncate uppercase tracking-[0.16em] text-ink-faint">
                                                    {paletteLabel}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex shrink-0 flex-col items-end gap-2">
                                    <div className="inline-flex rounded-full border border-ink-hairline bg-white p-0.5 shadow-sm">
                                        <button
                                            type="button"
                                            aria-pressed={true}
                                            className="flex h-7 items-center justify-center rounded-full bg-ink px-3 text-[11px] font-bold text-white"
                                        >
                                            Paint
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onSwitchToMatches?.()}
                                            disabled={!onSwitchToMatches}
                                            aria-pressed={false}
                                            className={`flex h-7 items-center justify-center rounded-full px-3 text-[11px] font-bold transition-colors ${
                                                onSwitchToMatches
                                                    ? 'text-ink-secondary active:bg-paper-recessed'
                                                    : 'cursor-default text-gray-400'
                                            }`}
                                        >
                                            Threads
                                        </button>
                                    </div>

                                    {onPin && (
                                        <button
                                            onClick={handlePin}
                                            disabled={isPinning || isPinned}
                                            className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                                                isPinned
                                                    ? 'border-subsignal bg-subsignal-muted text-subsignal'
                                                    : 'border-ink-hairline bg-paper text-ink-secondary shadow-sm active:scale-95'
                                            }`}
                                        >
                                            {isPinning ? 'Pinning…' : isPinned ? 'Pinned' : 'Pin'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="mt-3 border-t border-ink-hairline/50 pt-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-ink-faint">
                                    Target value band
                                </div>
                                {sampleBandIndex0 !== null && (
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] ${
                                            bandMatchesTarget
                                                ? 'bg-subsignal-muted text-subsignal'
                                                : 'bg-paper text-ink-secondary'
                                        }`}
                                    >
                                        {bandMatchesTarget ? 'Match' : 'Off'}
                                    </span>
                                )}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                                <span className="text-[9px] font-semibold text-ink-faint">Sh</span>
                                <input
                                    type="range"
                                    min={0}
                                    max={Math.max(0, referenceBandSteps - 1)}
                                    value={activeValueBandIndex}
                                    onChange={(e) => setActiveValueBandIndex(Number(e.target.value))}
                                    aria-label="Target value band"
                                    className="h-1.5 min-w-0 flex-1 cursor-pointer accent-signal"
                                />
                                <span className="text-[9px] font-semibold text-ink-faint">Lt</span>
                            </div>
                            <div className="mt-1 font-mono text-[10px] text-ink-secondary">
                                Band {activeValueBandIndex + 1} / {referenceBandSteps}
                            </div>
                        </div>
                    </section>

                    <div className={`${isInline ? '' : 'flex-1 min-h-0 overflow-y-auto overscroll-contain'}`}>
                        <div className={`${shellPadding} ${isInline ? 'pt-1.5' : 'space-y-3 pb-20'}`}>
                            {!isInline && (
                                <div className="flex items-end justify-between gap-3 px-1">
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-signal">
                                            Paint Recipe
                                        </div>
                                        <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
                                            {paletteLabel}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <PaintRecipe
                                hsl={sampledColor.hsl}
                                targetHex={sampledColor.hex}
                                activePalette={activePalette || DEFAULT_PALETTE}
                                useCatalog={hasPaintPalette}
                                paintIds={hasPaintPalette ? selectedPaintIds : undefined}
                                variant={recipeVariant}
                                showExportButton={false}
                                hideHeader={isInline}
                                hideFooter={isInline}
                            />
                        </div>
                    </div>
                </>
            ) : (
                <div className={`flex min-h-0 flex-col items-center justify-center px-4 py-5 text-ink-faint ${isInline ? '' : 'h-full'}`}>
                    <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">Sample</div>
                    <p className="max-w-[14rem] text-center text-sm font-semibold text-ink">
                        Tap image.
                    </p>
                </div>
            )}
        </div>
    )
}
