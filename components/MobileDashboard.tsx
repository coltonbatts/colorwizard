'use client'

/**
 * MobileDashboard - Mobile-first sampling dock.
 * Keeps the sampled color and paint recipe compact so the image stays primary.
 */

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import PaintRecipe from './PaintRecipe'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Palette, DEFAULT_PALETTE } from '@/lib/types/palette'
import { PinnedColor } from '@/lib/types/pinnedColor'
import { usePaintPaletteStore } from '@/lib/store/usePaintPaletteStore'
import { getColorName } from '@/lib/colorNaming'
import { createPinnedColor } from '@/lib/colorArtifacts'

interface MobileDashboardProps {
    sampledColor: {
        hex: string
        rgb: { r: number; g: number; b: number }
        hsl: { h: number; s: number; l: number }
        label?: string
    } | null
    activePalette?: Palette
    onPin?: (newPin: PinnedColor) => void
    isPinned?: boolean
    onSwitchToMatches?: () => void
}

export default function MobileDashboard({
    sampledColor,
    activePalette,
    onPin,
    isPinned = false,
    onSwitchToMatches,
}: MobileDashboardProps) {
    const { getSelectedPaintIds, isUsingPaintPalette } = usePaintPaletteStore()
    const selectedPaintIds = getSelectedPaintIds()
    const hasPaintPalette = isUsingPaintPalette()
    const isShortViewport = useMediaQuery('(max-height: 860px)')

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
    const recipeVariant = 'compact'
    const shellPadding = isShortViewport ? 'px-2.5 py-2' : 'px-3 py-2.5'
    const swatchSize = isShortViewport ? 'w-11 h-11' : 'w-12 h-12'
    const titleSize = isShortViewport ? 'text-[14px]' : 'text-[15px]'

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
        <div className="h-full min-h-0 flex flex-col overflow-hidden rounded-t-[24px] border-t border-gray-200 bg-white/96 shadow-[0_-16px_40px_rgba(0,0,0,0.14)] backdrop-blur-md dashboard-mode">
            {sampledColor ? (
                <>
                    <section className={`${shellPadding} shrink-0 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="text-[9px] font-black uppercase tracking-[0.24em] text-signal">
                                    Sampled Color
                                </div>
                                <div className="mt-2 flex items-center gap-2.5">
                                    <motion.div
                                        className={`${swatchSize} shrink-0 rounded-xl border border-white shadow-[0_6px_16px_rgba(0,0,0,0.14)]`}
                                        style={{ backgroundColor: sampledColor.hex }}
                                        layoutId="active-swatch"
                                    />

                                    <div className="min-w-0 flex-1">
                                        <div className={`${titleSize} truncate font-black leading-tight text-studio`}>
                                            {isLoadingName ? (
                                                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-studio-dim border-t-transparent align-middle" />
                                            ) : (
                                                displayName
                                            )}
                                        </div>
                                        <div className="mt-0.5 flex items-center gap-2 text-[10px]">
                                            <span className="font-mono font-bold tracking-wide text-studio-secondary">
                                                {sampledColor.hex.toUpperCase()}
                                            </span>
                                            <span className="truncate uppercase tracking-[0.16em] text-studio-muted">
                                                {paletteLabel}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex shrink-0 flex-col items-end gap-1">
                                <div className="inline-flex rounded-full border border-gray-200 bg-white p-0.5 shadow-sm">
                                    <button
                                        type="button"
                                        aria-pressed={true}
                                        className="flex h-7 items-center justify-center rounded-full bg-studio px-3 text-[11px] font-bold text-white"
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
                                                ? 'text-studio-secondary active:bg-gray-100'
                                                : 'cursor-default text-gray-400'
                                        }`}
                                    >
                                        Threads
                                    </button>
                                </div>
                                <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-studio-muted">
                                    {paletteLabel}
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                        <div className={`${shellPadding} space-y-3 pb-20`}>
                            <div className="flex items-end justify-between gap-3 px-1">
                                <div className="min-w-0">
                                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-signal">
                                        Paint Recipe
                                    </div>
                                    <p className="mt-1 text-[11px] leading-4 text-ink-muted">
                                        Compact mix steps sized for one-handed use.
                                    </p>
                                </div>
                                <div className="max-w-[45%] text-right text-[9px] font-bold uppercase tracking-[0.16em] text-ink-muted">
                                    {paletteLabel}
                                </div>
                            </div>

                            <PaintRecipe
                                hsl={sampledColor.hsl}
                                targetHex={sampledColor.hex}
                                activePalette={activePalette || DEFAULT_PALETTE}
                                useCatalog={hasPaintPalette}
                                paintIds={hasPaintPalette ? selectedPaintIds : undefined}
                                variant={recipeVariant}
                                showExportButton={false}
                            />

                            {onPin && (
                                <button
                                    onClick={handlePin}
                                    disabled={isPinning || isPinned}
                                    className={`ml-auto inline-flex items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all ${
                                        isPinned
                                            ? 'border-subsignal bg-subsignal-muted text-subsignal'
                                            : 'border-gray-200 bg-white text-studio-secondary shadow-sm active:scale-95'
                                    }`}
                                >
                                    {isPinning ? (
                                        <>
                                            <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                            Pinning…
                                        </>
                                    ) : isPinned ? (
                                        <>✓ Pinned</>
                                    ) : (
                                        <>📌 Pin Color</>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex h-full min-h-0 flex-col items-center justify-center px-4 py-5 text-studio-dim">
                    <div className="mb-3 text-3xl">🎨</div>
                    <p className="max-w-[14rem] text-center text-[11px] font-bold uppercase tracking-[0.18em] text-studio">
                        Sample a color from the image above
                    </p>
                    <p className="mt-2 text-center text-[10px] leading-4 text-studio-muted">
                        The recipe and thread match will appear here once you tap the image.
                    </p>
                </div>
            )}
        </div>
    )
}
