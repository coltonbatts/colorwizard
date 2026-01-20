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
}

export default function PuddleRecipeDisplay({
    ingredients,
    predictedHex,
    targetHex,
    matchQuality,
    error,
}: PuddleRecipeDisplayProps) {
    // Sort by weight descending for visual hierarchy
    const sortedIngredients = [...ingredients].sort((a, b) => b.weight - a.weight)

    return (
        <motion.div
            className="puddle-recipe"
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
            />

            {/* Section header */}
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Ingredients
                </h4>
                <span className="text-[10px] text-gray-500">
                    {ingredients.length} {ingredients.length === 1 ? 'paint' : 'paints'}
                </span>
            </div>

            {/* Puddle grid - RPG inventory style */}
            <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3"
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

            {/* Ratio visualization bar */}
            <div className="mt-6">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                    Mix Ratio
                </div>
                <div className="h-3 rounded-full overflow-hidden flex bg-gray-800 shadow-inner">
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
            </div>
        </motion.div>
    )
}
