'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { converter } from 'culori'
import ColorTheoryCanvas from '@/components/color-theory/ColorTheoryCanvas'
import ColorWheelDisplay from '@/components/color-theory/ColorWheelDisplay'
import ColorAnalysisPanel from '@/components/color-theory/ColorAnalysisPanel'
import MixAdjustmentGuide from '@/components/color-theory/MixAdjustmentGuide'
import ChromaMap from '@/components/color-theory/ChromaMap'
import { getSegmentIndex, RGB } from '@/lib/colorTheory'
import { rotateHue, mixColors, getComplementaryColor, adjustChroma } from '@/lib/paintingMath'
import { MixState } from '@/components/color-theory/MixLadders'

const toRgb = converter('rgb');

interface SampledColor {
    hex: string
    rgb: RGB
    hsl: { h: number; s: number; l: number }
}

export default function ColorTheoryPage() {
    const [sampledColor, setSampledColor] = useState<SampledColor | null>(null)
    const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null)

    // Mix State
    const [mixState, setMixState] = useState<MixState>({
        white: 0,
        complement: 0,
        black: 0,
        hue: 0,
        saturation: 1
    })

    // Reset when sampled color changes
    useEffect(() => {
        setMixState({ white: 0, complement: 0, black: 0, hue: 0, saturation: 1 })
    }, [sampledColor?.hex])

    // Reset Mix Handler
    const handleResetMix = () => {
        setMixState({
            white: 0,
            complement: 0,
            black: 0,
            hue: 0,
            saturation: 1
        })
    }

    const handleColorSample = (color: SampledColor) => {
        setSampledColor(color)
        setHighlightedIndex(getSegmentIndex(color.rgb))
    }

    // Calculate Mix Result
    const mixResult = useMemo(() => {
        if (!sampledColor) return null

        let c = sampledColor.hex

        // 1. Hue Shift
        if (mixState.hue !== 0) {
            c = rotateHue(c, mixState.hue)
        }

        // 2. Saturation Boost/Cut
        if (mixState.saturation !== 1) {
            c = adjustChroma(c, mixState.saturation)
        }

        // 3. Neutralize
        if (mixState.complement > 0) {
            const currentComp = getComplementaryColor(c);
            c = mixColors(c, currentComp, mixState.complement)
        }

        // 4. Tint
        if (mixState.white > 0) {
            c = mixColors(c, '#ffffff', mixState.white)
        }

        // 5. Shade
        if (mixState.black > 0) {
            c = mixColors(c, '#000000', mixState.black)
        }

        // Convert to RGB object for Wheel Display
        const rgbObj = toRgb(c) || { r: 0, g: 0, b: 0 };

        return {
            hex: c,
            rgb: { r: (rgbObj.r ?? 0) * 255, g: (rgbObj.g ?? 0) * 255, b: (rgbObj.b ?? 0) * 255 }
        }
    }, [sampledColor, mixState])


    return (
        <main className="flex flex-col h-screen bg-[#0f0f0f]">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="text-sm">Back to Wizard</span>
                    </Link>
                    <div className="w-px h-6 bg-gray-700" />
                    <h1 className="text-xl font-semibold text-white flex items-center gap-2">
                        <span className="text-2xl">🎨</span>
                        Color Theory Lab
                    </h1>
                </div>
                <p className="text-sm text-gray-500">
                    Analyze colors against the traditional artist&apos;s color wheel
                </p>
            </header>

            {/* Main content */}
            <div className="flex-1 flex min-h-0">
                {/* Left: Image Canvas */}
                <div className="w-1/2 p-6 flex flex-col gap-6">
                    <div className="flex-1 relative min-h-0">
                        <ColorTheoryCanvas onColorSample={handleColorSample} />
                    </div>
                </div>

                {/* Right: Analysis */}
                <div className="w-1/2 border-l border-gray-800 flex flex-col overflow-hidden">
                    {/* Color Wheel */}
                    <div className="flex-shrink-0 p-6 border-b border-gray-800 bg-gray-900/30 flex justify-center">
                        <ColorWheelDisplay
                            sampledColor={sampledColor}
                            highlightedIndex={highlightedIndex}
                            mixColor={mixResult ? { hex: mixResult.hex, rgb: mixResult.rgb } : undefined}
                        />
                    </div>

                    {/* Analysis Panel */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {sampledColor && mixResult ? (
                            <>
                                {/* New: Mix Adjustment and Maps */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="col-span-1 md:col-span-2">
                                        <MixAdjustmentGuide
                                            targetColor={sampledColor.hex}
                                            mixColor={mixResult.hex}
                                            onFixMix={handleResetMix}
                                        />
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <ChromaMap
                                            targetColor={sampledColor.hex}
                                            mixColor={mixResult.hex}
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-gray-800 pt-6">
                                    <ColorAnalysisPanel
                                        sampledColor={sampledColor}
                                        mixState={mixState}
                                        onMixChange={setMixState}
                                        mixResult={mixResult.hex}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <p>Select a color from the image to begin analysis</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    )
}
