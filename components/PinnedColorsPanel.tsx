'use client'

import { useState } from 'react'
import { getBestContrast, getContrastRatio } from '@/lib/color/a11y'
import { PinnedColor } from '@/lib/types/pinnedColor'

interface PinnedColorsPanelProps {
    pinnedColors: PinnedColor[]
    activeHighlightColor: { r: number; g: number; b: number } | null
    onUnpin: (id: string) => void
    onClearAll: () => void
    onExport: () => void
    onSelect: (rgb: { r: number; g: number; b: number }) => void
}

export default function PinnedColorsPanel({
    pinnedColors,
    activeHighlightColor,
    onUnpin,
    onClearAll,
    onExport,
    onSelect
}: PinnedColorsPanelProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null)

    if (pinnedColors.length === 0) {
        return (
            <div className="h-full p-6 flex flex-col items-center justify-center bg-paper-elevated text-ink-secondary">
                <div className="w-16 h-16 rounded-full border-2 border-ink-hairline flex items-center justify-center mb-4 text-ink-faint grayscale opacity-30">
                    <span className="text-2xl">📌</span>
                </div>
                <p className="text-center font-bold text-ink">No pinned colors yet</p>
                <p className="text-sm text-ink-muted mt-2 text-center max-w-[200px]">
                    Use the &quot;Pin Color&quot; button in the Inspect panel to save colors for comparison.
                </p>
            </div>
        )
    }

    const isActive = (rgb: { r: number; g: number; b: number }) => {
        return activeHighlightColor?.r === rgb.r &&
            activeHighlightColor?.g === rgb.g &&
            activeHighlightColor?.b === rgb.b
    }

    return (
        <div className="flex flex-col h-full bg-paper-elevated font-sans">
            {/* Header */}
            <div className="p-4 border-b border-ink-hairline flex items-center justify-between sticky top-0 bg-paper-elevated/90 backdrop-blur-md z-10">
                <div>
                    <h2 className="text-lg font-bold text-ink leading-none">Pinned Colors</h2>
                    <span className="text-[10px] text-ink-faint uppercase tracking-widest font-black mt-1 block">
                        {pinnedColors.length} saved
                    </span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onExport}
                        title="Export Palette as JSON"
                        className="p-2 text-ink-secondary hover:text-signal bg-paper-recessed border border-ink-hairline rounded-xl transition-all shadow-sm"
                        aria-label="Export Palette as JSON"
                    >
                        💾
                    </button>
                    <button
                        onClick={onClearAll}
                        title="Clear All"
                        className="p-2 text-ink-secondary hover:text-signal bg-paper-recessed border border-ink-hairline rounded-xl transition-all shadow-sm"
                        aria-label="Clear All Pinned Colors"
                    >
                        🗑️
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {pinnedColors.map((color) => {
                    const bestContrast = getBestContrast(color.hex)
                    const contrastRatio = getContrastRatio(color.hex, bestContrast)

                    return (
                        <div
                            key={color.id}
                            className={`group rounded-lg border transition-all duration-500 overflow-hidden ${expandedId === color.id
                                ? 'bg-paper-recessed border-ink-hairline shadow-lg scale-[1.02]'
                                : 'bg-paper-elevated border-ink-hairline hover:border-signal hover:shadow-md'
                                }`}
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.setData('application/json', JSON.stringify({
                                    type: 'color',
                                    hex: color.hex,
                                    label: color.label
                                }))
                                e.dataTransfer.effectAllowed = 'copy'
                            }}
                        >
                            {/* Card Header (Visible always) */}
                            <div className="p-3 flex items-center gap-3">
                                {/* Swatch */}
                                <div
                                    className="w-12 h-12 rounded-lg border border-ink-muted shrink-0 shadow-inner flex items-center justify-center"
                                    style={{ backgroundColor: color.hex }}
                                >
                                    <span
                                        className="text-[8px] font-black uppercase tracking-tighter"
                                        style={{ color: bestContrast }}
                                    >
                                        {contrastRatio.toFixed(1)}:1
                                    </span>
                                </div>

                                {/* Info */}
                                <div
                                    className="flex-1 min-w-0 cursor-pointer"
                                    onClick={() => setExpandedId(expandedId === color.id ? null : color.id)}
                                >
                                    <h3 className="text-sm font-bold text-ink leading-tight break-words">
                                        {color.label}
                                    </h3>
                                    <div className="flex items-center gap-2 text-[10px] font-mono text-ink-faint mt-0.5">
                                        <span className="font-bold">{color.hex}</span>
                                        <span>•</span>
                                        <span>{new Date(color.timestamp).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => onSelect(color.rgb)}
                                        className={`p-2 rounded-lg transition-all ${isActive(color.rgb)
                                            ? 'bg-signal text-white'
                                            : 'text-ink-muted hover:text-signal hover:bg-ink'
                                            }`}
                                        title={isActive(color.rgb) ? 'Currently Highlighted' : 'Activate Highlight'}
                                        aria-label={isActive(color.rgb) ? 'Color is currently highlighted' : 'Highlight this color on the canvas'}
                                    >
                                        <span>🔦</span>
                                    </button>
                                    <button
                                        onClick={() => onUnpin(color.id)}
                                        className="p-2 text-ink-faint hover:text-signal hover:bg-signal-muted rounded-xl transition-all"
                                        title="Remove"
                                        aria-label={`Remove ${color.label} from pinned colors`}
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {expandedId === color.id && (
                                <div className="border-t border-ink-muted p-4 space-y-6 animate-in slide-in-from-top-2 duration-300">
                                    {/* Tech Specs */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-2 bg-gray-950/50 rounded-lg border border-gray-800/50">
                                            <span className="text-[9px] uppercase font-bold text-gray-600 tracking-widest block mb-1">HSL Value</span>
                                            <span className="text-xs font-mono text-gray-300">{color.hsl.h}°, {color.hsl.s}%, {color.hsl.l}%</span>
                                        </div>
                                        <div className="p-2 bg-gray-950/50 rounded-lg border border-gray-800/50">
                                            <span className="text-[9px] uppercase font-bold text-gray-600 tracking-widest block mb-1">RGB Value</span>
                                            <span className="text-xs font-mono text-gray-300">{color.rgb.r}, {color.rgb.g}, {color.rgb.b}</span>
                                        </div>
                                    </div>

                                    {/* Spectral Recipe */}
                                    {color.spectralRecipe && (
                                        <div>
                                            <h4 className="text-[10px] uppercase font-bold text-signal tracking-wider mb-2">Spectral Recipe</h4>
                                            <div className="space-y-1.5">
                                                {color.spectralRecipe.ingredients.map((ing, i) => (
                                                    <div key={i} className="flex items-center gap-2 py-1 border-b border-gray-800/30 last:border-0">
                                                        <div className="w-3 h-3 rounded shadow-sm border border-ink-muted" style={{ backgroundColor: ing.pigment.hex }} />
                                                        <span className="text-xs text-gray-300 flex-1 truncate">{ing.pigment.name}</span>
                                                        <span className="text-[10px] font-mono text-white/50">{ing.percentage}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* DMC Matches */}
                                    <div>
                                        <h4 className="text-[10px] uppercase font-bold text-signal tracking-wider mb-2">DMC Thread Matches</h4>
                                        <div className="grid grid-cols-1 gap-1.5">
                                            {color.dmcMatches.slice(0, 3).map((match) => (
                                                <div key={match.number} className="flex items-center gap-2 p-1.5 bg-gray-950/30 border border-ink-muted rounded group/dmc">
                                                    <div className="w-6 h-6 rounded border border-ink-muted" style={{ backgroundColor: match.hex }} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] font-bold text-gray-200 truncate">{match.number} - {match.name}</p>
                                                        <p className="text-[9px] text-white/50 tracking-tight">{match.confidenceLabel} • {Math.round(match.similarity)}% sim</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            onClick={() => setExpandedId(null)}
                                            className="w-full py-1.5 text-[10px] uppercase font-bold text-white/50 hover:text-white/80 bg-gray-800/30 rounded border border-gray-700/50 transition-all"
                                        >
                                            Close Details
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div >
    )
}
