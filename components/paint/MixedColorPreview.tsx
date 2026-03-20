'use client'

/**
 * MixedColorPreview - Shows the predicted mix result with comparison
 */

import { motion } from 'framer-motion'

interface MixedColorPreviewProps {
    /** Predicted hex color from the mix */
    predictedHex: string
    /** Target hex color we're trying to match */
    targetHex: string
    /** Match quality label */
    matchQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor'
    /** Delta E error value */
    error: number
    /** Layout density */
    variant?: 'standard' | 'dashboard' | 'compact'
}

// Match quality styling
const QUALITY_STYLES = {
    Excellent: {
        bg: 'bg-emerald-500/20',
        border: 'border-emerald-500/40',
        text: 'text-emerald-400',
        dot: 'bg-emerald-500'
    },
    Good: {
        bg: 'bg-green-500/20',
        border: 'border-green-500/40',
        text: 'text-green-400',
        dot: 'bg-green-500'
    },
    Fair: {
        bg: 'bg-yellow-500/20',
        border: 'border-yellow-500/40',
        text: 'text-yellow-400',
        dot: 'bg-yellow-500'
    },
    Poor: {
        bg: 'bg-red-500/20',
        border: 'border-red-500/40',
        text: 'text-red-400',
        dot: 'bg-red-500'
    },
}

export default function MixedColorPreview({
    predictedHex,
    targetHex,
    matchQuality,
    error,
    variant = 'standard',
}: MixedColorPreviewProps) {
    const styles = QUALITY_STYLES[matchQuality]

    return (
        <div className={variant === 'compact' ? 'mb-4' : 'mb-6'}>
            {/* Color comparison swatches */}
            <div className={`flex gap-3 ${variant === 'compact' ? 'mb-3' : 'mb-4'}`}>
                {/* Predicted Mix - larger, primary */}
                <motion.div
                    className="flex-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className={`${variant === 'compact' ? 'text-[9px] mb-1' : 'text-[10px] mb-1.5'} text-gray-400 uppercase tracking-widest font-bold`}>
                        Mixed Result
                    </div>
                    <div
                        className={`${variant === 'compact' ? 'h-14' : 'h-20'} rounded-xl border border-gray-600/50 shadow-lg relative overflow-hidden`}
                        style={{ backgroundColor: predictedHex }}
                    >
                        {/* Subtle gradient overlay for depth */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                    </div>
                </motion.div>

                {/* Target - smaller, reference */}
                <motion.div
                    className={variant === 'compact' ? 'w-16' : 'w-20'}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className={`${variant === 'compact' ? 'text-[9px] mb-1' : 'text-[10px] mb-1.5'} text-gray-400 uppercase tracking-widest font-bold`}>
                        Target
                    </div>
                    <div
                        className={`${variant === 'compact' ? 'h-14' : 'h-20'} rounded-xl border border-gray-600/50 shadow-lg relative overflow-hidden`}
                        style={{ backgroundColor: targetHex }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                    </div>
                </motion.div>
            </div>

            {/* Match quality badge */}
            <motion.div
                className={`inline-flex items-center gap-2 ${variant === 'compact' ? 'px-2.5 py-1' : 'px-3 py-1.5'} rounded-full ${styles.bg} ${styles.border} border`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
            >
                <div className={`w-2 h-2 rounded-full ${styles.dot}`} />
                <span className={`${variant === 'compact' ? 'text-xs' : 'text-sm'} font-medium ${styles.text}`}>
                    {matchQuality} Match
                </span>
                <span className={`${variant === 'compact' ? 'text-[10px]' : 'text-xs'} text-gray-500 ml-1`}>
                    ΔE {error.toFixed(1)}
                </span>
            </motion.div>
        </div>
    )
}
