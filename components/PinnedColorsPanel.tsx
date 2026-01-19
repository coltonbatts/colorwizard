'use client'

import { useState } from 'react'
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
            <div className="h-full p-6 flex flex-col items-center justify-center bg-white text-studio-secondary">
                <div className="w-16 h-16 rounded-full border-2 border-gray-100 flex items-center justify-center mb-4 text-studio-dim grayscale opacity-30">
                    <span className="text-2xl">📌</span>
                </div>
                <p className="text-center font-bold text-studio">No pinned colors yet</p>
                <p className="text-sm text-studio-muted mt-2 text-center max-w-[200px]">
                    Use the "Pin Color" button in the Inspect panel to save colors for comparison.
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
        <div className="flex flex-col h-full bg-white font-sans">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                <div>
                    <h2 className="text-lg font-bold text-studio leading-none">Pinned Colors</h2>
                    <span className="text-[10px] text-studio-dim uppercase tracking-widest font-black mt-1 block">
                        {pinnedColors.length} saved
                    </span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onExport}
                        title="Export Palette as JSON"
                        className="p-2 text-studio-secondary hover:text-blue-600 bg-gray-50 border border-gray-100 rounded-xl transition-all shadow-sm"
                    >
                        💾
                    </button>
                    <button
                        onClick={onClearAll}
                        title="Clear All"
                        className="p-2 text-studio-secondary hover:text-red-600 bg-gray-50 border border-gray-100 rounded-xl transition-all shadow-sm"
                    >
                        🗑️
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {pinnedColors.map((color) => (
                    <div
                        key={color.id}
                        className={`group rounded-2xl border transition-all duration-500 overflow-hidden ${expandedId === color.id
                            ? 'bg-gray-50 border-gray-200 shadow-lg scale-[1.02]'
                            : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-md'
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
                                className="w-12 h-12 rounded-lg border border-gray-700 shrink-0 shadow-inner"
                                style={{ backgroundColor: color.hex }}
                            />

                            {/* Info */}
                            <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => setExpandedId(expandedId === color.id ? null : color.id)}
                            >
                                <h3 className="text-sm font-bold text-studio leading-tight break-words">
                                    {color.label}
                                </h3>
                                <div className="flex items-center gap-2 text-[10px] font-mono text-studio-dim mt-0.5">
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
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-500 hover:text-blue-400 hover:bg-gray-800'
                                        }`}
                                    title={isActive(color.rgb) ? 'Currently Highlighted' : 'Activate Highlight'}
                                >
                                    <span>🔦</span>
                                </button>
                                <button
                                    onClick={() => onUnpin(color.id)}
                                    className="p-2 text-studio-dim hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    title="Remove"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Expanded Content */}
                        {expandedId === color.id && (
                            <div className="border-t border-gray-800 p-4 space-y-6 animate-in slide-in-from-top-2 duration-300">
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
                                        <h4 className="text-[10px] uppercase font-bold text-blue-400 tracking-wider mb-2">Spectral Recipe</h4>
                                        <div className="space-y-1.5">
                                            {color.spectralRecipe.ingredients.map((ing, i) => (
                                                <div key={i} className="flex items-center gap-2 py-1 border-b border-gray-800/30 last:border-0">
                                                    <div className="w-3 h-3 rounded shadow-sm border border-gray-700" style={{ backgroundColor: ing.pigment.hex }} />
                                                    <span className="text-xs text-gray-300 flex-1 truncate">{ing.pigment.name}</span>
                                                    <span className="text-[10px] font-mono text-gray-500">{ing.percentage}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* DMC Matches */}
                                <div>
                                    <h4 className="text-[10px] uppercase font-bold text-pink-400 tracking-wider mb-2">DMC Thread Matches</h4>
                                    <div className="grid grid-cols-1 gap-1.5">
                                        {color.dmcMatches.slice(0, 3).map((match) => (
                                            <div key={match.number} className="flex items-center gap-2 p-1.5 bg-gray-950/30 border border-gray-800 rounded group/dmc">
                                                <div className="w-6 h-6 rounded border border-gray-700" style={{ backgroundColor: match.hex }} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-bold text-gray-200 truncate">{match.number} - {match.name}</p>
                                                    <p className="text-[9px] text-gray-500 tracking-tight">{match.confidenceLabel} • {Math.round(match.similarity)}% sim</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        onClick={() => setExpandedId(null)}
                                        className="w-full py-1.5 text-[10px] uppercase font-bold text-gray-500 hover:text-gray-300 bg-gray-800/30 rounded border border-gray-800 transition-all"
                                    >
                                        Close Details
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div >
    )
}
