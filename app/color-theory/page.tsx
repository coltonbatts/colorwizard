'use client'

import { useState } from 'react'
import Link from 'next/link'
import ColorTheoryCanvas from '@/components/color-theory/ColorTheoryCanvas'
import ColorWheelDisplay from '@/components/color-theory/ColorWheelDisplay'
import ColorAnalysisPanel from '@/components/color-theory/ColorAnalysisPanel'
import { getSegmentIndex, RGB } from '@/lib/colorTheory'

interface SampledColor {
    hex: string
    rgb: RGB
    hsl: { h: number; s: number; l: number }
}

export default function ColorTheoryPage() {
    const [sampledColor, setSampledColor] = useState<SampledColor | null>(null)
    const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null)

    const handleColorSample = (color: SampledColor) => {
        setSampledColor(color)
        setHighlightedIndex(getSegmentIndex(color.rgb))
    }

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
                    Analyze colors against the traditional artist's color wheel
                </p>
            </header>

            {/* Main content */}
            <div className="flex-1 flex min-h-0">
                {/* Left: Image Canvas */}
                <div className="w-1/2 p-6">
                    <ColorTheoryCanvas onColorSample={handleColorSample} />
                </div>

                {/* Right: Analysis */}
                <div className="w-1/2 border-l border-gray-800 flex flex-col overflow-hidden">
                    {/* Color Wheel */}
                    <div className="flex-shrink-0 p-6 border-b border-gray-800 bg-gray-900/30">
                        <ColorWheelDisplay
                            sampledColor={sampledColor}
                            highlightedIndex={highlightedIndex}
                        />
                    </div>

                    {/* Analysis Panel */}
                    <div className="flex-1 overflow-y-auto">
                        <ColorAnalysisPanel sampledColor={sampledColor} />
                    </div>
                </div>
            </div>
        </main>
    )
}
