'use client'

/**
 * CurrentColorBadge - Compact color display component
 * Shows the currently sampled color with hex code, expandable for more details
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getColorName } from '@/lib/colorNaming'

interface CurrentColorBadgeProps {
    sampledColor: {
        hex: string
        rgb: { r: number; g: number; b: number }
        hsl: { h: number; s: number; l: number }
    } | null
    onPin?: () => void
    isPinned?: boolean
    isPinning?: boolean
}

export default function CurrentColorBadge({
    sampledColor,
    onPin,
    isPinned = false,
    isPinning = false
}: CurrentColorBadgeProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [colorName, setColorName] = useState<string | null>(null)

    // Fetch color name when expanded
    const handleExpand = useCallback(async () => {
        setIsExpanded(!isExpanded)
        if (!isExpanded && sampledColor && !colorName) {
            try {
                const nameResult = await getColorName(sampledColor.hex)
                setColorName(nameResult.name)
            } catch (e) {
                console.error('Failed to get color name', e)
            }
        }
    }, [isExpanded, sampledColor, colorName])

    if (!sampledColor) {
        return (
            <div className="current-color-badge empty">
                <div className="current-color-badge-swatch empty" />
                <span className="current-color-badge-text">Tap image to sample</span>
            </div>
        )
    }

    const { hex, rgb } = sampledColor
    const isLight = (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) > 150

    return (
        <motion.div
            className={`current-color-badge ${isExpanded ? 'expanded' : ''}`}
            layout
        >
            {/* Compact View */}
            <button
                className="current-color-badge-compact"
                onClick={handleExpand}
            >
                <motion.div
                    className="current-color-badge-swatch"
                    style={{ backgroundColor: hex }}
                    layoutId="color-swatch"
                    animate={{
                        scale: [1, 1.05, 1],
                    }}
                    transition={{ duration: 0.2 }}
                    key={hex}
                >
                    {/* Inner ring for depth */}
                    <div className="current-color-badge-swatch-ring" />
                </motion.div>
                <span className="current-color-badge-hex">{hex}</span>
                <svg
                    className={`current-color-badge-chevron ${isExpanded ? 'rotated' : ''}`}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {/* Expanded View */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        className="current-color-badge-expanded"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Color Name */}
                        {colorName && (
                            <p className="current-color-badge-name">{colorName}</p>
                        )}

                        {/* RGB Values */}
                        <div className="current-color-badge-values">
                            <span>R: {rgb.r}</span>
                            <span>G: {rgb.g}</span>
                            <span>B: {rgb.b}</span>
                        </div>

                        {/* Pin Action */}
                        {onPin && (
                            <button
                                className={`current-color-badge-pin ${isPinned ? 'pinned' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onPin()
                                }}
                                disabled={isPinning || isPinned}
                            >
                                {isPinning ? (
                                    <span className="flex items-center gap-1">
                                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Pinning...
                                    </span>
                                ) : isPinned ? (
                                    <>✓ Pinned</>
                                ) : (
                                    <>📌 Pin Color</>
                                )}
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
