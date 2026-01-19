'use client'

import { forwardRef } from 'react'
import { ColorCard } from '@/lib/types/colorCard'

interface ColorCardPreviewProps {
    card: ColorCard
}

/**
 * Exportable card preview component.
 * This component renders the visual card that gets exported as PNG.
 */
const ColorCardPreview = forwardRef<HTMLDivElement, ColorCardPreviewProps>(
    function ColorCardPreview({ card }, ref) {
        const { color, name, colorName, dmcMatches, paintMatches, valueStep } = card

        // Calculate contrast color for text
        const isDark = color.luminance < 0.5
        const textColor = isDark ? '#ffffff' : '#1a1a1a'
        const mutedTextColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)'

        return (
            <div
                ref={ref}
                className="w-[400px] bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-200"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
                {/* Large Color Swatch */}
                <div
                    className="w-full h-48 flex flex-col justify-end p-6"
                    style={{ backgroundColor: color.hex }}
                >
                    <h2
                        className="text-2xl font-black truncate max-w-full leading-tight"
                        style={{ color: textColor }}
                    >
                        {name}
                    </h2>
                    {colorName && (
                        <p
                            className="text-xs font-bold uppercase tracking-[0.2em] opacity-70 mt-1"
                            style={{ color: textColor }}
                        >
                            {colorName}
                        </p>
                    )}
                </div>

                {/* Color Data Section */}
                <div className="p-6 space-y-5">
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
                        {valueStep !== undefined && (
                            <div className="col-span-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Value Step</span>
                                <span className="text-sm font-mono text-gray-700">Step {valueStep}</span>
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100" />

                    {/* DMC Matches */}
                    <div>
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">DMC Floss Matches</h3>
                        {dmcMatches.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {dmcMatches.slice(0, 5).map((match) => (
                                    <div
                                        key={match.number}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100"
                                    >
                                        <div
                                            className="w-4 h-4 rounded-sm border border-gray-200"
                                            style={{ backgroundColor: match.hex }}
                                        />
                                        <span className="text-xs font-bold text-gray-700">{match.number}</span>
                                        <span className="text-xs text-gray-400">{Math.round(match.similarity)}%</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic">Not available yet</p>
                        )}
                    </div>

                    {/* Paint Matches */}
                    <div>
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Paint Matches</h3>
                        {paintMatches.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {paintMatches.slice(0, 5).map((match, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100"
                                    >
                                        <div
                                            className="w-4 h-4 rounded-sm border border-gray-200"
                                            style={{ backgroundColor: match.hex }}
                                        />
                                        <span className="text-xs font-medium text-gray-700">{match.name}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic">Not available yet</p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[10px] text-gray-300 font-medium">ColorWizard</span>
                        <span className="text-[10px] text-gray-300 font-mono">
                            {new Date(card.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>
        )
    }
)

export default ColorCardPreview
