'use client'

/**
 * PuddleRecipeDisplay - RPG-style grid layout for paint recipe
 * Shows paint ingredients as proportionally-sized puddles in card slots
 */

import { motion } from 'framer-motion'
import PaintPuddle from './PaintPuddle'
import MixedColorPreview from './MixedColorPreview'
import { Pigment } from '@/lib/spectral/types'

interface Ingredient {
    pigment: Pigment
    weight: number
    percentage: string
}

interface PuddleRecipeDisplayProps {
    /** Array of ingredients with pigment, weight, and percentage */
    ingredients: Ingredient[]
    /** Predicted hex color of the mix */
    predictedHex: string
    /** Target hex color we're trying to match */
    targetHex: string
    /** Match quality label */
    matchQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor'
    /** Delta E error value */
    error: number
    /** Display variant */
    variant?: 'standard' | 'dashboard' | 'compact'
}

export default function PuddleRecipeDisplay({
    ingredients,
    predictedHex,
    targetHex,
    matchQuality,
    error,
    variant = 'standard',
}: PuddleRecipeDisplayProps) {
    // Sort by weight descending for visual hierarchy
    const sortedIngredients = [...ingredients].sort((a, b) => b.weight - a.weight)
    const isCompact = variant === 'compact'

    return (
        <motion.div
            className="puddle-recipe w-full min-w-0 max-w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {/* Mixed result preview at top */}
            <MixedColorPreview
                predictedHex={predictedHex}
                targetHex={targetHex}
                matchQuality={matchQuality}
                error={error}
                variant={variant}
            />

            {!isCompact && (
                <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                        Pigments
                    </h4>
                    <span className="text-[10px] text-gray-500">
                        {ingredients.length} {ingredients.length === 1 ? 'paint' : 'paints'}
                    </span>
                </div>
            )}

            {isCompact ? (
                <motion.div className="space-y-1" layout>
                    {sortedIngredients.map((ingredient, index) => (
                        <motion.div
                            key={ingredient.pigment.id}
                            className="flex items-center gap-2 rounded-md bg-gray-950/28 px-2 py-1.5"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04, type: 'spring', stiffness: 320, damping: 28 }}
                        >
                            <div
                                className="h-4 w-4 shrink-0 rounded-full border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)]"
                                style={{ backgroundColor: ingredient.pigment.hex }}
                            />
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-[11px] font-semibold text-gray-100">
                                    {ingredient.pigment.name}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 w-10 overflow-hidden rounded-full bg-gray-800">
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            backgroundColor: ingredient.pigment.hex,
                                            width: `${Math.max(10, ingredient.weight * 100)}%`,
                                        }}
                                    />
                                </div>
                                <span className="min-w-[2.5rem] text-right font-mono text-[10px] font-bold text-gray-300">
                                    {ingredient.percentage}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            ) : (
                <motion.div
                    className="grid grid-cols-1 justify-items-start gap-3 sm:grid-cols-2"
                    layout
                >
                    {sortedIngredients.map((ingredient, index) => (
                        <motion.div
                            key={ingredient.pigment.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                delay: index * 0.05,
                                type: 'spring',
                                stiffness: 300,
                                damping: 25
                            }}
                        >
                            <PaintPuddle
                                color={ingredient.pigment.hex}
                                weight={ingredient.weight}
                                name={ingredient.pigment.name}
                                percentage={ingredient.percentage}
                                maxSize={72}
                                minSize={28}
                            />
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* Ratio visualization bar */}
            <div className={`${isCompact ? 'mt-2.5' : 'mt-6'} ${variant === 'dashboard' ? 'space-y-4' : ''}`}>
                {variant !== 'dashboard' && !isCompact && (
                    <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-gray-500">
                        Mix Ratio
                    </div>
                )}

                {variant === 'dashboard' ? (
                    /* Large dashboard bars for tripod mode */
                    <div className="space-y-3">
                        {sortedIngredients.map((ingredient, index) => (
                            <motion.div
                                key={ingredient.pigment.id}
                                className="group"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 * index }}
                            >
                                <div className="flex justify-between items-end mb-1 px-1">
                                    <span className="text-sm font-bold text-gray-200 truncate pr-4">
                                        {ingredient.pigment.name}
                                    </span>
                                    <span className="text-xl font-black text-white tabular-nums">
                                        {ingredient.percentage}
                                    </span>
                                </div>
                                <div className="h-4 rounded-full bg-gray-800 overflow-hidden shadow-inner border border-white/5">
                                    <motion.div
                                        className="h-full rounded-full"
                                        style={{
                                            backgroundColor: ingredient.pigment.hex,
                                            width: `${ingredient.weight * 100}%`
                                        }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${ingredient.weight * 100}%` }}
                                        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    /* Standard thin bar */
                    <div className={`${isCompact ? 'h-2' : 'h-3'} flex overflow-hidden rounded-full bg-gray-800 shadow-inner`}>
                        {sortedIngredients.map((ingredient, index) => (
                            <motion.div
                                key={ingredient.pigment.id}
                                className="h-full relative group"
                                style={{
                                    backgroundColor: ingredient.pigment.hex,
                                    width: `${ingredient.weight * 100}%`
                                }}
                                initial={{ width: 0 }}
                                animate={{ width: `${ingredient.weight * 100}%` }}
                                transition={{
                                    delay: 0.3 + index * 0.05,
                                    duration: 0.4,
                                    ease: 'easeOut'
                                }}
                            >
                                {/* Tooltip on hover */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-lg">
                                        {ingredient.pigment.name}: {ingredient.percentage}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    )
}
