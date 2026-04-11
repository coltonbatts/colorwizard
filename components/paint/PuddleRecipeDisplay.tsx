'use client'

/**
 * PuddleRecipeDisplay - tactile ingredient view for paint recipes.
 * Uses paint-sample cards and a blended ratio bar instead of a dashboard list.
 */

import { motion } from 'framer-motion'
import MixedColorPreview from './MixedColorPreview'
import { Pigment } from '@/lib/spectral/types'

interface Ingredient {
    pigment: Pigment
    weight: number
    percentage: string
}

interface PuddleRecipeDisplayProps {
    ingredients: Ingredient[]
    targetHex: string
    preview?: {
        predictedHex: string
        matchQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor'
        error: number
    } | null
    mixSource: 'solver' | 'heuristic'
    variant?: 'standard' | 'dashboard' | 'compact'
}

export default function PuddleRecipeDisplay({
    ingredients,
    targetHex,
    preview = null,
    mixSource,
    variant = 'standard',
}: PuddleRecipeDisplayProps) {
    const sortedIngredients = [...ingredients].sort((a, b) => b.weight - a.weight)
    const isCompact = variant === 'compact'

    return (
        <motion.div
            className="puddle-recipe w-full min-w-0 max-w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.26 }}
        >
            <MixedColorPreview
                targetHex={targetHex}
                preview={preview}
                mixSource={mixSource}
                variant={variant}
            />

            {!isCompact && (
                <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">
                        Pigments
                    </h4>
                    <span className="text-[10px] font-semibold text-ink-secondary">
                        {ingredients.length} {ingredients.length === 1 ? 'paint' : 'paints'}
                    </span>
                </div>
            )}

            {isCompact ? (
                <motion.div className="space-y-1.5" layout>
                    {sortedIngredients.map((ingredient, index) => (
                        <motion.div
                            key={ingredient.pigment.id}
                            className="flex items-center gap-2 rounded-[18px] border border-ink-hairline bg-[rgba(255,252,247,0.82)] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.62)]"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04, type: 'spring', stiffness: 320, damping: 28 }}
                        >
                            <div
                                className="h-5 w-5 shrink-0 rounded-[8px] border border-black/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.28)]"
                                style={{ backgroundColor: ingredient.pigment.hex }}
                            />
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-[11px] font-semibold text-ink">
                                    {ingredient.pigment.name}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 w-12 overflow-hidden rounded-full bg-paper-recessed">
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            backgroundColor: ingredient.pigment.hex,
                                            width: `${Math.max(12, ingredient.weight * 100)}%`,
                                        }}
                                    />
                                </div>
                                <span className="min-w-[2.5rem] text-right font-mono text-[10px] font-bold text-ink-secondary">
                                    {ingredient.percentage}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            ) : (
                <motion.div className="grid grid-cols-1 gap-3" layout>
                    {sortedIngredients.map((ingredient, index) => (
                        <motion.div
                            key={ingredient.pigment.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                delay: index * 0.05,
                                type: 'spring',
                                stiffness: 300,
                                damping: 25,
                            }}
                        >
                            <div className="rounded-[22px] border border-ink-hairline bg-[rgba(255,252,247,0.88)] p-3 shadow-[0_14px_28px_rgba(33,24,14,0.06),inset_0_1px_0_rgba(255,255,255,0.66)]">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="h-11 w-11 shrink-0 rounded-[16px] border border-black/8 shadow-[0_10px_18px_rgba(33,24,14,0.08),inset_0_1px_1px_rgba(255,255,255,0.28)]"
                                        style={{ backgroundColor: ingredient.pigment.hex }}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-semibold text-ink">
                                            {ingredient.pigment.name}
                                        </div>
                                        <div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-ink-faint">
                                            Paint load {ingredient.percentage}
                                        </div>
                                    </div>
                                    <div className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink-secondary">
                                        {Math.round(ingredient.weight * 100)}%
                                    </div>
                                </div>

                                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-paper-recessed shadow-[inset_0_1px_2px_rgba(33,24,14,0.08)]">
                                    <motion.div
                                        className="h-full rounded-full"
                                        style={{
                                            backgroundColor: ingredient.pigment.hex,
                                            width: `${Math.max(12, ingredient.weight * 100)}%`,
                                        }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.max(12, ingredient.weight * 100)}%` }}
                                        transition={{ delay: 0.18 + index * 0.05, duration: 0.38, ease: 'easeOut' }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            <div className={`${isCompact ? 'mt-2.5' : 'mt-5'} ${variant === 'dashboard' ? 'space-y-4' : ''}`}>
                {variant !== 'dashboard' && !isCompact && (
                    <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">
                        Mix Strand
                    </div>
                )}

                {variant === 'dashboard' ? (
                    <div className="space-y-3">
                        {sortedIngredients.map((ingredient, index) => (
                            <motion.div
                                key={ingredient.pigment.id}
                                className="group"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 * index }}
                            >
                                <div className="mb-1 flex items-end justify-between px-1">
                                    <span className="truncate pr-4 text-sm font-bold text-ink">
                                        {ingredient.pigment.name}
                                    </span>
                                    <span className="tabular-nums text-xl font-black text-ink">
                                        {ingredient.percentage}
                                    </span>
                                </div>
                                <div className="h-4 overflow-hidden rounded-full border border-ink-hairline bg-paper-recessed shadow-[inset_0_1px_2px_rgba(33,24,14,0.08)]">
                                    <motion.div
                                        className="h-full rounded-full"
                                        style={{
                                            backgroundColor: ingredient.pigment.hex,
                                            width: `${ingredient.weight * 100}%`,
                                        }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${ingredient.weight * 100}%` }}
                                        transition={{ duration: 0.9, ease: 'easeOut', delay: 0.18 }}
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className={`${isCompact ? 'h-2.5' : 'h-3'} flex overflow-hidden rounded-full border border-ink-hairline bg-paper-recessed shadow-[inset_0_1px_2px_rgba(33,24,14,0.08)]`}>
                        {sortedIngredients.map((ingredient, index) => (
                            <motion.div
                                key={ingredient.pigment.id}
                                className="relative h-full group"
                                style={{
                                    backgroundColor: ingredient.pigment.hex,
                                    width: `${ingredient.weight * 100}%`,
                                }}
                                initial={{ width: 0 }}
                                animate={{ width: `${ingredient.weight * 100}%` }}
                                transition={{
                                    delay: 0.22 + index * 0.05,
                                    duration: 0.34,
                                    ease: 'easeOut',
                                }}
                            >
                                <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                                    <div className="whitespace-nowrap rounded-full border border-ink-hairline bg-paper-elevated px-2.5 py-1 text-[10px] font-semibold text-ink shadow-[0_10px_20px_rgba(33,24,14,0.12)]">
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
