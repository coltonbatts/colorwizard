'use client'

import { getColorHarmonies, ColorWheelSegment, RGB } from '@/lib/colorTheory'
import { getContrastColor } from '@/lib/paintingMath'

interface ColorHarmoniesProps {
    rgb: RGB
    onColorSelect: (rgb: RGB) => void
}

export default function ColorHarmonies({ rgb, onColorSelect }: ColorHarmoniesProps) {
    const harmonies = getColorHarmonies(rgb)

    const HarmonyItem = ({ label, segments }: { label: string, segments: ColorWheelSegment | ColorWheelSegment[] }) => {
        const items = Array.isArray(segments) ? segments : [segments]

        return (
            <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</h4>
                <div className="grid grid-cols-2 gap-2">
                    {items.map((segment, i) => {
                        // Convert hex to RGB object for onColorSelect
                        const hex = segment.color
                        const r = parseInt(hex.slice(1, 3), 16)
                        const g = parseInt(hex.slice(3, 5), 16)
                        const b = parseInt(hex.slice(5, 7), 16)
                        const contrast = getContrastColor(hex)

                        return (
                            <button
                                key={`${label}-${i}`}
                                onClick={() => onColorSelect({ r, g, b })}
                                className="group relative flex flex-col items-center justify-center p-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-blue-500/50 hover:bg-gray-800 transition-all text-left"
                            >
                                <div
                                    className="w-full h-12 rounded-lg shadow-inner mb-2 flex items-center justify-center border border-white/10"
                                    style={{ backgroundColor: hex }}
                                >
                                    <span
                                        className="text-[10px] font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ color: contrast }}
                                    >
                                        {hex}
                                    </span>
                                </div>
                                <div className="w-full">
                                    <span className="text-[11px] font-bold text-gray-200 block truncate">{segment.name}</span>
                                    <span className="text-[9px] text-gray-500 uppercase font-medium">{segment.type}</span>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-4">
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${harmonies.temperature === 'warm' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                        harmonies.temperature === 'cool' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                            'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                    }`}>
                    {harmonies.temperature}
                </div>
                <span className="text-[10px] text-gray-600 font-medium italic">
                    Based on 12-segment RYB wheel
                </span>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <HarmonyItem label="Complementary" segments={harmonies.complementary} />
                <HarmonyItem label="Split-Complementary" segments={harmonies.splitComplementary} />
                <HarmonyItem label="Analogous" segments={harmonies.analogous} />
                <HarmonyItem label="Triadic" segments={harmonies.triadic} />
            </div>

            <div className="pt-4 border-t border-gray-900">
                <p className="text-[10px] text-gray-600 leading-relaxed">
                    <span className="text-gray-400 font-bold">Pro-tip:</span> Use these to find colors for shadows, highlights, or focal points that naturally coordinate with your subject.
                </p>
            </div>
        </div>
    )
}
