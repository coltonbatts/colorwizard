'use client'

/**
 * MobileDashboard - Mobile-first sampling sheet.
 * Keeps the sampled color, pinning, card creation, and oil recipe in one front-layer view.
 */

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import ColorCardModal from './ColorCardModal'
import PaintRecipe from './PaintRecipe'
import { ColorCard } from '@/lib/types/colorCard'
import { Palette, DEFAULT_PALETTE } from '@/lib/types/palette'
import { PinnedColor } from '@/lib/types/pinnedColor'
import { usePaintPaletteStore } from '@/lib/store/usePaintPaletteStore'
import { getColorName } from '@/lib/colorNaming'
import { createColorCard, createPinnedColor } from '@/lib/colorArtifacts'

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

    const [colorName, setColorName] = useState<string>('')
    const [isLoadingName, setIsLoadingName] = useState(false)
    const [copied, setCopied] = useState<string | null>(null)
    const [isPinning, setIsPinning] = useState(false)
    const [showCardModal, setShowCardModal] = useState(false)
    const [pendingCard, setPendingCard] = useState<ColorCard | null>(null)

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
        if (!sampledColor) {
            setColorName('')
            return
        }

        if (sampledColor.label && sampledColor.label !== 'New Color') {
            setColorName(sampledColor.label)
            return
        }

        let cancelled = false
        setIsLoadingName(true)

        getColorName(sampledColor.hex)
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
    }, [sampledColor?.hex, sampledColor?.label])

    if (!sampledColor) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-studio-dim">
                <div className="text-4xl mb-4">🎨</div>
                <p className="font-bold text-center uppercase tracking-widest text-xs">
                    Sample a color from the image above
                </p>
                <p className="text-[10px] mt-2 text-center opacity-60">
                    To see the recipe, pin, and card tools
                </p>
            </div>
        )
    }

    const displayName = colorName || sampledColor.hex.toUpperCase()
    const paletteLabel = hasPaintPalette
        ? `Paint library (${selectedPaintIds.length})`
        : activePalette?.isDefault
            ? 'Core six-color mix'
            : activePalette?.name || 'Active palette'

    const copyToClipboard = async (text: string, type: string) => {
        await navigator.clipboard.writeText(text)
        setCopied(type)
        window.setTimeout(() => setCopied(null), 1500)
    }

    const handlePin = async () => {
        if (!onPin || isPinned) return
        setIsPinning(true)
        try {
            const pinnedColor = await createPinnedColor(
                sampledColor,
                {
                    label: sampledColor.label?.trim() || colorName || `Color ${sampledColor.hex}`,
                    solveOptions,
                }
            )

            onPin(pinnedColor)
        } finally {
            setIsPinning(false)
        }
    }

    const handleCreateCard = async () => {
        let descriptiveName = ''
        try {
            const nameMatch = await getColorName(sampledColor.hex)
            descriptiveName = nameMatch.name
        } catch (err) {
            console.error('Failed to get color name for card', err)
        }

        setPendingCard(createColorCard(
            sampledColor,
            {
                name: sampledColor.label?.trim() || descriptiveName || `Color ${sampledColor.hex}`,
                colorName: descriptiveName,
            }
        ))
        setShowCardModal(true)
    }

    return (
        <>
            <div className="h-full flex flex-col bg-white overflow-hidden dashboard-mode rounded-t-[28px] shadow-[0_-20px_50px_rgba(0,0,0,0.14)] border-t border-gray-100">
                <section className="p-4 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
                    <div className="flex items-center gap-4">
                        <motion.div
                            className="w-20 h-20 rounded-2xl shadow-xl border-4 border-white shrink-0"
                            style={{ backgroundColor: sampledColor.hex }}
                            layoutId="active-swatch"
                        />

                        <div className="flex-1 min-w-0">
                            <h2 className="text-[10px] font-black text-studio-dim uppercase tracking-[0.2em] mb-1">
                                Sampled Color
                            </h2>
                            <div className="text-2xl font-black text-studio truncate leading-tight">
                                {isLoadingName ? (
                                    <span className="inline-block w-3 h-3 border-2 border-studio-dim border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    displayName
                                )}
                            </div>
                            <div className="font-mono text-sm text-studio-secondary font-bold">
                                {sampledColor.hex.toUpperCase()}
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-studio-muted mt-1">
                                {paletteLabel}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="p-4 border-b border-gray-100 bg-white">
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={handlePin}
                            disabled={!onPin || isPinning || isPinned}
                            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all ${isPinned
                                ? 'bg-subsignal-muted text-subsignal border border-subsignal'
                                : 'bg-signal text-white shadow-lg active:scale-95'
                                }`}
                        >
                            {isPinning ? (
                                <>
                                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Pinning…
                                </>
                            ) : isPinned ? (
                                <>✓ Pinned</>
                            ) : (
                                <>📌 Pin Color</>
                            )}
                        </button>

                        <button
                            onClick={handleCreateCard}
                            className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all bg-subsignal hover:bg-subsignal-hover text-white shadow-lg active:scale-95"
                        >
                            🎴 Save Card
                        </button>

                        <button
                            onClick={() => copyToClipboard(sampledColor.hex.toUpperCase(), 'hex')}
                            className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all bg-paper-recessed text-studio-secondary border border-gray-100 active:scale-95"
                        >
                            {copied === 'hex' ? '✓ Copied' : 'Copy HEX'}
                        </button>

                        {onSwitchToMatches ? (
                            <button
                                onClick={onSwitchToMatches}
                                className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all bg-studio text-white shadow-lg active:scale-95"
                            >
                                Threads
                            </button>
                        ) : (
                            <button
                                disabled
                                className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all bg-gray-100 text-gray-400"
                            >
                                Threads
                            </button>
                        )}
                    </div>
                </section>

                <div className="flex-1 overflow-y-auto pb-8">
                    <div className="p-4">
                        <div className="space-y-3">
                            <div className="flex items-end justify-between gap-3 px-1">
                                <div>
                                    <div className="text-[10px] uppercase tracking-[0.25em] font-black text-signal">Oil Paint Recipe</div>
                                    <p className="text-xs text-ink-muted mt-1">A starter mix you can put on the palette right away.</p>
                                </div>
                                <div className="text-[10px] font-bold text-ink-faint uppercase tracking-widest text-right">
                                    {paletteLabel}
                                </div>
                            </div>

                            <PaintRecipe
                                hsl={sampledColor.hsl}
                                targetHex={sampledColor.hex}
                                activePalette={activePalette || DEFAULT_PALETTE}
                                useCatalog={hasPaintPalette}
                                paintIds={hasPaintPalette ? selectedPaintIds : undefined}
                                variant="dashboard"
                                showExportButton={false}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <ColorCardModal
                isOpen={showCardModal}
                onClose={() => {
                    setShowCardModal(false)
                    setPendingCard(null)
                }}
                card={pendingCard}
                isNewCard={true}
                onCardSaved={() => {}}
            />
        </>
    )
}
