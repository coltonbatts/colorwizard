'use client'

import { useMemo } from 'react'
import { getColorHarmonies, rgbToHex, RGB, ColorWheelSegment } from '@/lib/colorTheory'
import SaturationValuePanel from './SaturationValuePanel'

interface ColorAnalysisPanelProps {
    sampledColor: {
        hex: string
        rgb: RGB
        hsl: { h: number; s: number; l: number }
    } | null
}

function ColorSwatch({ color, label, large = false }: { color: string; label: string; large?: boolean }) {
    return (
        <div className="flex items-center gap-2">
            <div
                className={`${large ? 'w-10 h-10' : 'w-6 h-6'} rounded-lg border border-gray-600`}
                style={{ backgroundColor: color }}
            />
            <span className="text-gray-300 text-sm">{label}</span>
        </div>
    )
}

function HarmonySection({
    title,
    segments,
    icon
}: {
    title: string
    segments: ColorWheelSegment[]
    icon: string
}) {
    return (
        <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <span>{icon}</span> {title}
            </h4>
            <div className="flex gap-2">
                {segments.map((seg) => (
                    <div key={seg.name} className="flex flex-col items-center gap-1">
                        <div
                            className="w-10 h-10 rounded-lg border border-gray-600"
                            style={{ backgroundColor: seg.color }}
                        />
                        <span className="text-xs text-gray-400 text-center leading-tight">{seg.name}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function ColorAnalysisPanel({ sampledColor }: ColorAnalysisPanelProps) {
    const analysis = useMemo(() => {
        if (!sampledColor) return null
        return getColorHarmonies(sampledColor.rgb)
    }, [sampledColor])

    if (!sampledColor || !analysis) {
        return (
            <div className="p-6 text-center text-gray-500">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                </div>
                <p className="text-sm">Click on the image to sample a color</p>
            </div>
        )
    }

    return (
        <div className="p-4 space-y-6 overflow-y-auto">
            {/* Sampled Color Header */}
            <div className="flex items-center gap-4">
                <div
                    className="w-16 h-16 rounded-xl border-2 border-gray-600 shadow-lg"
                    style={{ backgroundColor: sampledColor.hex }}
                />
                <div>
                    <p className="text-xl font-mono text-white">{sampledColor.hex}</p>
                    <p className="text-sm text-gray-400">
                        RGB({sampledColor.rgb.r}, {sampledColor.rgb.g}, {sampledColor.rgb.b})
                    </p>
                    <p className="text-sm text-gray-400">
                        HSL({sampledColor.hsl.h}°, {sampledColor.hsl.s}%, {sampledColor.hsl.l}%)
                    </p>
                </div>
            </div>

            {/* Color Wheel Position */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <h3 className="text-sm font-medium text-white mb-2">Color Wheel Position</h3>
                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 rounded-lg border border-gray-600"
                        style={{ backgroundColor: analysis.base.color }}
                    />
                    <div>
                        <p className="text-white font-medium">{analysis.base.name}</p>
                        <p className="text-xs text-gray-400 capitalize">{analysis.base.type} color</p>
                    </div>
                </div>
            </div>

            {/* Temperature */}
            <div className="flex items-center gap-3 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <div className={`text-2xl ${analysis.temperature === 'warm' ? '🔥' :
                    analysis.temperature === 'cool' ? '❄️' : '⚪'
                    }`}>
                    {analysis.temperature === 'warm' ? '🔥' :
                        analysis.temperature === 'cool' ? '❄️' : '⚪'}
                </div>
                <div>
                    <p className="text-white font-medium capitalize">{analysis.temperature} Color</p>
                    <p className="text-xs text-gray-400">
                        {analysis.temperature === 'warm' && 'Evokes energy, warmth, and excitement'}
                        {analysis.temperature === 'cool' && 'Evokes calm, serenity, and freshness'}
                        {analysis.temperature === 'neutral' && 'Balanced, versatile color'}
                    </p>
                </div>
            </div>

            {/* Saturation & Value Analysis */}
            <SaturationValuePanel sampledColor={sampledColor} />

            {/* Harmonies */}
            <div className="space-y-4">
                <h3 className="text-sm font-medium text-white">Color Harmonies</h3>

                <HarmonySection
                    title="Complementary"
                    icon="↔️"
                    segments={[analysis.complementary]}
                />

                <HarmonySection
                    title="Analogous"
                    icon="↔️"
                    segments={analysis.analogous}
                />

                <HarmonySection
                    title="Triadic"
                    icon="△"
                    segments={analysis.triadic}
                />

                <HarmonySection
                    title="Split-Complementary"
                    icon="⋔"
                    segments={analysis.splitComplementary}
                />
            </div>

            {/* Tip */}
            <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-4">
                <p className="text-xs text-blue-300">
                    <span className="font-medium">Tip:</span> Complementary colors create high contrast.
                    Analogous colors create harmony. Triadic colors create vibrant, balanced compositions.
                </p>
            </div>
        </div>
    )
}
