'use client'

import { forwardRef } from 'react'
import { ColorCard } from '@/lib/types/colorCard'
import { CARD_PRIORITY_OPTIONS, CARD_PRIORITY_STYLES, CARD_STATUS_OPTIONS, CARD_STATUS_STYLES, getProjectLabel } from '@/lib/cardMeta'

interface ColorCardPreviewProps {
    card: ColorCard
    variant?: 'standalone' | 'embedded'
}

/**
 * Exportable card preview component.
 * This component renders the visual card that gets exported as PNG.
 */
const ColorCardPreview = forwardRef<HTMLDivElement, ColorCardPreviewProps>(
    function ColorCardPreview({ card, variant = 'standalone' }, ref) {
        const { color, name, recipe, matches } = card
        const { dmc, paints } = matches
        const tags = card.tags ?? []
        const statusLabel = CARD_STATUS_OPTIONS.find((option) => option.value === (card.status ?? 'idea'))?.label ?? 'Idea'
        const priorityLabel = CARD_PRIORITY_OPTIONS.find((option) => option.value === (card.priority ?? 'medium'))?.label ?? 'Medium'

        const isDark = color.luminance < 0.5
        const textColor = isDark ? '#ffffff' : '#1a1a1a'
        const normalizedSteps = recipe.steps
            .filter(Boolean)
            .map(step => step.replace(/\*\*(.*?)\*\*/g, '$1'))

        return (
            <div
                ref={ref}
                className={
                    variant === 'embedded'
                        ? 'w-full overflow-hidden rounded-[2rem] border border-[rgba(15,23,42,0.10)] bg-[#fbfaf7] shadow-none'
                        : 'w-[400px] overflow-hidden rounded-3xl border border-[rgba(15,23,42,0.12)] bg-[#fbfaf7] shadow-[0_22px_60px_rgba(15,23,42,0.16)]'
                }
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
                {/* Large Color Swatch */}
                <div
                    className="relative flex h-48 w-full flex-col justify-end overflow-hidden p-6"
                    style={{ backgroundColor: color.hex }}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                    <h2
                        className="relative text-2xl font-black leading-tight"
                        style={{ color: textColor }}
                    >
                        {name}
                    </h2>
                    {color.colorName && (
                        <p
                            className="relative mt-1 text-xs font-bold uppercase tracking-[0.2em] opacity-80"
                            style={{ color: textColor }}
                        >
                            {color.colorName}
                        </p>
                    )}
                    <div className="relative mt-4 flex flex-wrap gap-2">
                        <span
                            className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/90 backdrop-blur-sm"
                        >
                            {recipe.sourceLabel}
                        </span>
                        {recipe.spectral && (
                            <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/90 backdrop-blur-sm">
                                {recipe.spectral.matchQuality} match
                            </span>
                        )}
                    </div>
                </div>

                {/* Color Data Section */}
                <div className="space-y-5 p-6">
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gray-500">Collectible record</p>
                        <p className="text-sm leading-6 text-slate-600">
                            {recipe.summary}
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                                {getProjectLabel(card.project)}
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${CARD_STATUS_STYLES[card.status ?? 'idea']}`}>
                                {statusLabel}
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${CARD_PRIORITY_STYLES[card.priority ?? 'medium']}`}>
                                {priorityLabel}
                            </span>
                            {tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                        {card.notes && (
                            <p className="text-xs leading-5 text-slate-500">
                                {card.notes}
                            </p>
                        )}
                    </div>

                    {/* Primary Color Values */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">HEX</span>
                            <span className="text-lg font-mono font-bold text-gray-900">{color.hex}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">RGB</span>
                            <span className="text-sm font-mono text-gray-700">
                                {color.rgb.r}, {color.rgb.g}, {color.rgb.b}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">HSL</span>
                            <span className="text-sm font-mono text-gray-700">
                                {Math.round(color.hsl.h)}°, {Math.round(color.hsl.s)}%, {Math.round(color.hsl.l)}%
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Luminance</span>
                            <span className="text-sm font-mono text-gray-700">
                                {color.luminance.toFixed(3)}
                            </span>
                        </div>
                        {color.valueStep !== undefined && (
                            <div className="col-span-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Value Step</span>
                                <span className="text-sm font-mono text-gray-700">Step {color.valueStep}</span>
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100" />

                    {/* Recipe Ingredients */}
                    <div>
                        <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">Recipe Mix</h3>
                        {recipe.ingredients.length > 0 ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                                {recipe.ingredients.map((ingredient) => (
                                    <div
                                        key={`${ingredient.name}-${ingredient.amount}`}
                                        className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-[0_1px_0_rgba(15,23,42,0.03)]"
                                    >
                                        <div
                                            className="h-5 w-5 shrink-0 rounded-sm border border-gray-200"
                                            style={{ backgroundColor: ingredient.hex }}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-xs font-bold text-slate-800">
                                                {ingredient.name}
                                            </div>
                                            <div className="text-[10px] uppercase tracking-wide text-slate-500">
                                                {ingredient.amount}
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-mono font-bold text-slate-600">
                                            {ingredient.ratio}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs italic text-slate-500">Recipe ingredients not available yet</p>
                        )}
                    </div>

                    {/* Mixing Steps */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Mixing Steps</h3>
                        {normalizedSteps.length > 0 ? (
                            <ol className="space-y-2">
                                {normalizedSteps.map((step, index) => (
                                    <li key={`${index}-${step}`} className="flex gap-3">
                                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-black text-slate-700">
                                            {index + 1}
                                        </span>
                                        <span className="text-xs font-medium leading-5 text-slate-700">
                                            {step}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="text-xs italic text-slate-500">Mixing steps not available yet</p>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100" />

                    {/* DMC Matches */}
                    <div>
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">DMC Floss Matches</h3>
                        {dmc.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {dmc.slice(0, 5).map((match) => (
                                    <div
                                        key={match.number}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100"
                                    >
                                        <div
                                            className="w-4 h-4 rounded-sm border border-gray-200"
                                            style={{ backgroundColor: match.hex }}
                                        />
                                        <span className="text-xs font-bold text-slate-700">{match.number}</span>
                                        <span className="text-xs text-slate-500">{Math.round(match.similarity)}%</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs italic text-slate-500">Not available yet</p>
                        )}
                    </div>

                    {/* Paint Matches */}
                    <div>
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Paint Matches</h3>
                        {paints.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {paints.slice(0, 5).map((match, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100"
                                    >
                                        <div
                                            className="w-4 h-4 rounded-sm border border-gray-200"
                                            style={{ backgroundColor: match.hex }}
                                        />
                                        <div className="min-w-0">
                                            <span className="block truncate text-xs font-medium text-slate-700">{match.name}</span>
                                            <span className="text-[10px] uppercase tracking-wide text-slate-500">{match.brand}</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-600">{match.ratio}%</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs italic text-slate-500">Not available yet</p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[10px] font-medium text-slate-400">{recipe.sourceLabel}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                            {new Date(card.updatedAt || card.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>
        )
    }
)

export default ColorCardPreview
