'use client'

/**
 * MobileDashboard - Focused view for tripod painting
 * Maximizes visibility of sampled color and mixing recipe ratios.
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import PaintRecipe from './PaintRecipe'
import { Palette } from '@/lib/types/palette'
import { usePaintPaletteStore } from '@/lib/store/usePaintPaletteStore'
import { getColorName } from '@/lib/colorNaming'

interface MobileDashboardProps {
    sampledColor: {
        hex: string
        rgb: { r: number; g: number; b: number }
        hsl: { h: number; s: number; l: number }
        label?: string
    } | null
    activePalette?: Palette
}

export default function MobileDashboard({ sampledColor, activePalette }: MobileDashboardProps) {
    const { getSelectedPaintIds, isUsingPaintPalette } = usePaintPaletteStore()
    const selectedPaintIds = getSelectedPaintIds()
    const hasPaintPalette = isUsingPaintPalette()

    // State for color name lookup
    const [colorName, setColorName] = useState<string>('')
    const [isLoadingName, setIsLoadingName] = useState(false)

    // Fetch color name when sampled color changes
    useEffect(() => {
        if (!sampledColor) {
            setColorName('')
            return
        }

        // Use existing label if provided
        if (sampledColor.label && sampledColor.label !== 'New Color') {
            setColorName(sampledColor.label)
            return
        }

        // Fetch color name from API
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
                    To see mixing ratios for your tripod
                </p>
            </div>
        )
    }

    // Display name: use fetched color name, or hex as fallback
    const displayName = colorName || sampledColor.hex.toUpperCase()

    return (
        <div className="flex-1 flex flex-col bg-white overflow-hidden dashboard-mode">
            {/* Big Sampled Color Section */}
            <section className="p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-4">
                    {/* Large Swatch */}
                    <motion.div
                        className="w-20 h-20 rounded-2xl shadow-xl border-4 border-white"
                        style={{ backgroundColor: sampledColor.hex }}
                        layoutId="active-swatch"
                    />

                    <div className="flex-1 overflow-hidden">
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
                    </div>
                </div>
            </section>

            {/* Recipe Section - Scrollable */}
            <div className="flex-1 overflow-y-auto pb-20">
                <div className="p-4">
                    <PaintRecipe
                        hsl={sampledColor.hsl}
                        targetHex={sampledColor.hex}
                        activePalette={activePalette}
                        useCatalog={hasPaintPalette}
                        paintIds={hasPaintPalette ? selectedPaintIds : undefined}
                        variant="dashboard"
                    />
                </div>
            </div>
        </div>
    )
}
