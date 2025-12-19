'use client'

import { useMemo } from 'react'
import {
    RGB,
    getChromaLevel,
    getValueLevel,
    getTintShadeAnalysis,
    getMixingGuidance,
    rgbToHsl,
} from '@/lib/colorTheory'

interface SaturationValuePanelProps {
    sampledColor: {
        hex: string
        rgb: RGB
        hsl: { h: number; s: number; l: number }
    } | null
}

function GradientScale({
    label,
    percentage,
    leftLabel,
    rightLabel,
    gradientStyle,
}: {
    label: string
    percentage: number
    leftLabel: string
    rightLabel: string
    gradientStyle: string
}) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
                <span>{leftLabel}</span>
                <span className="font-medium text-gray-300">{label}: {percentage}%</span>
                <span>{rightLabel}</span>
            </div>
            <div className="relative h-4 rounded-lg overflow-hidden border border-gray-600">
                <div
                    className="absolute inset-0"
                    style={{ background: gradientStyle }}
                />
                {/* Marker */}
                <div
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-lg border border-gray-900"
                    style={{
                        left: `${percentage}%`,
                        transform: 'translateX(-50%)',
                    }}
                />
            </div>
        </div>
    )
}

function TypeBadge({ type, color }: { type: string; color: string }) {
    const colors: Record<string, string> = {
        tint: 'bg-blue-900/50 text-blue-300 border-blue-700',
        shade: 'bg-gray-900/50 text-gray-300 border-gray-600',
        tone: 'bg-purple-900/50 text-purple-300 border-purple-700',
        pure: 'bg-green-900/50 text-green-300 border-green-700',
        neutral: 'bg-gray-800/50 text-gray-400 border-gray-600',
    }

    return (
        <span className={`px-2 py-1 text-xs font-medium rounded border ${colors[type] || colors.neutral}`}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
        </span>
    )
}

export default function SaturationValuePanel({ sampledColor }: SaturationValuePanelProps) {
    const analysis = useMemo(() => {
        if (!sampledColor) return null

        const chroma = getChromaLevel(sampledColor.rgb)
        const value = getValueLevel(sampledColor.rgb)
        const tintShade = getTintShadeAnalysis(sampledColor.rgb)
        const mixing = getMixingGuidance(sampledColor.rgb)
        const hsl = rgbToHsl(sampledColor.rgb.r, sampledColor.rgb.g, sampledColor.rgb.b)

        return { chroma, value, tintShade, mixing, hsl }
    }, [sampledColor])

    if (!sampledColor || !analysis) {
        return null
    }

    const { chroma, value, tintShade, mixing, hsl } = analysis

    // Create a pure hue color for saturation gradient
    const pureHueColor = `hsl(${hsl.h}, 100%, 50%)`

    return (
        <div className="space-y-5">
            {/* Section Header */}
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <span>🎨</span> Saturation & Value Analysis
            </h3>

            {/* Value Scale */}
            <GradientScale
                label="Value"
                percentage={value.percentage}
                leftLabel="Black"
                rightLabel="White"
                gradientStyle="linear-gradient(to right, #000000, #ffffff)"
            />

            {/* Saturation Scale */}
            <GradientScale
                label="Saturation"
                percentage={chroma.percentage}
                leftLabel="Gray"
                rightLabel="Pure"
                gradientStyle={`linear-gradient(to right, hsl(${hsl.h}, 0%, 50%), ${pureHueColor})`}
            />

            {/* Level Badges */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Value:</span>
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-700 text-gray-200 capitalize">
                        {value.level}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Chroma:</span>
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-700 text-gray-200 capitalize">
                        {chroma.level}
                    </span>
                </div>
            </div>

            {/* Tint/Shade/Tone Analysis */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">Color Type</span>
                    <TypeBadge type={tintShade.type} color={sampledColor.hex} />
                </div>
                <p className="text-xs text-gray-400">{tintShade.description}</p>

                {/* Influence bars */}
                {tintShade.type !== 'neutral' && (
                    <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1">White</div>
                            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white/80"
                                    style={{ width: `${tintShade.whiteInfluence}%` }}
                                />
                            </div>
                            <div className="text-xs text-gray-400 mt-1">{Math.round(tintShade.whiteInfluence)}%</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1">Black</div>
                            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gray-900"
                                    style={{ width: `${tintShade.blackInfluence}%` }}
                                />
                            </div>
                            <div className="text-xs text-gray-400 mt-1">{Math.round(tintShade.blackInfluence)}%</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1">Gray</div>
                            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gray-500"
                                    style={{ width: `${tintShade.grayInfluence}%` }}
                                />
                            </div>
                            <div className="text-xs text-gray-400 mt-1">{Math.round(tintShade.grayInfluence)}%</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Paint Mixing Guidance */}
            <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    🖌️ Mixing Guidance
                </h4>
                <div className="grid gap-2 text-xs">
                    <div className="flex gap-2 items-start">
                        <span className="text-gray-500 flex-shrink-0 w-20">To lighten:</span>
                        <span className="text-gray-300">{mixing.toLighten}</span>
                    </div>
                    <div className="flex gap-2 items-start">
                        <span className="text-gray-500 flex-shrink-0 w-20">To darken:</span>
                        <span className="text-gray-300">{mixing.toDarken}</span>
                    </div>
                    <div className="flex gap-2 items-start">
                        <span className="text-gray-500 flex-shrink-0 w-20">To mute:</span>
                        <span className="text-gray-300">{mixing.toDesaturate}</span>
                    </div>
                    <div className="flex gap-2 items-start">
                        <span className="text-gray-500 flex-shrink-0 w-20">To intensify:</span>
                        <span className="text-gray-300">{mixing.toSaturate}</span>
                    </div>
                </div>

                {/* General Tip */}
                {mixing.generalTip && (
                    <div className="mt-3 p-3 bg-amber-900/20 border border-amber-800/50 rounded-lg">
                        <p className="text-xs text-amber-300">
                            <span className="font-medium">💡 Tip:</span> {mixing.generalTip}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
