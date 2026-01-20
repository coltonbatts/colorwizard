'use client'

/**
 * PaintPuddle - A single paint puddle with organic shape
 * Size represents the proportion of this ingredient in the mix
 */

import { motion } from 'framer-motion'

interface PaintPuddleProps {
    /** Hex color of the paint */
    color: string
    /** Weight in the mix (0-1, normalized) */
    weight: number
    /** Paint name */
    name: string
    /** Percentage display string */
    percentage: string
    /** Maximum puddle diameter in pixels */
    maxSize?: number
    /** Minimum puddle diameter in pixels */
    minSize?: number
    /** Whether to show the label below */
    showLabel?: boolean
    /** Click handler */
    onClick?: () => void
}

export default function PaintPuddle({
    color,
    weight,
    name,
    percentage,
    maxSize = 80,
    minSize = 32,
    showLabel = true,
    onClick,
}: PaintPuddleProps) {
    // Calculate diameter based on weight
    const diameter = minSize + weight * (maxSize - minSize)

    // Generate a unique filter ID for this puddle
    const filterId = `puddle-filter-${name.replace(/\s+/g, '-').toLowerCase()}`

    // Determine if color is light for text contrast
    const isLight = isLightColor(color)

    return (
        <motion.div
            className="puddle-card group cursor-pointer"
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            layout
        >
            {/* Puddle container */}
            <div
                className="relative flex items-center justify-center"
                style={{
                    width: maxSize + 16,
                    height: maxSize + 16
                }}
            >
                {/* SVG Puddle */}
                <motion.svg
                    width={diameter}
                    height={diameter}
                    viewBox="0 0 100 100"
                    className="paint-puddle"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    layout
                    transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 25
                    }}
                >
                    {/* Filter for organic edge */}
                    <defs>
                        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
                            <feTurbulence
                                type="fractalNoise"
                                baseFrequency="0.02"
                                numOctaves="3"
                                result="noise"
                            />
                            <feDisplacementMap
                                in="SourceGraphic"
                                in2="noise"
                                scale="3"
                                xChannelSelector="R"
                                yChannelSelector="G"
                            />
                        </filter>
                        {/* Drop shadow */}
                        <filter id={`${filterId}-shadow`} x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow
                                dx="0"
                                dy="2"
                                stdDeviation="4"
                                floodColor="#000"
                                floodOpacity="0.2"
                            />
                        </filter>
                    </defs>

                    {/* Background shadow circle */}
                    <circle
                        cx="50"
                        cy="52"
                        r="46"
                        fill="rgba(0,0,0,0.15)"
                        filter={`url(#${filterId})`}
                    />

                    {/* Main paint puddle */}
                    <circle
                        cx="50"
                        cy="50"
                        r="46"
                        fill={color}
                        filter={`url(#${filterId})`}
                    />

                    {/* Highlight for depth */}
                    <ellipse
                        cx="42"
                        cy="42"
                        rx="16"
                        ry="12"
                        fill="rgba(255,255,255,0.15)"
                        filter={`url(#${filterId})`}
                    />
                </motion.svg>

                {/* Percentage overlay on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span
                        className={`text-sm font-bold ${isLight ? 'text-gray-800' : 'text-white'} drop-shadow-md`}
                    >
                        {percentage}
                    </span>
                </div>
            </div>

            {showLabel && (
                <div className="mt-2 text-center">
                    <p className="text-sm font-medium text-gray-200 truncate max-w-[100px]" title={name}>
                        {name}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                        {percentage}
                    </p>
                </div>
            )}
        </motion.div>
    )
}

/**
 * Determine if a hex color is light or dark
 */
function isLightColor(hex: string): boolean {
    const color = hex.replace('#', '')
    const r = parseInt(color.substring(0, 2), 16)
    const g = parseInt(color.substring(2, 4), 16)
    const b = parseInt(color.substring(4, 6), 16)
    // Using relative luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5
}
