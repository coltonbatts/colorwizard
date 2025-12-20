'use client'

import { useState, useMemo, useEffect } from 'react'
import { RGB } from '@/lib/colorTheory' // Keeping basic types if needed
import { getComplementaryColor, mixColors, getPainterValue } from '@/lib/paintingMath'
import HeroColorCard from './HeroColorCard'
import MixLadders, { MixState } from './MixLadders'
import ValueChromaMap from './ValueChromaMap'

interface ColorAnalysisPanelProps {
    sampledColor: {
        hex: string
        rgb: RGB
        hsl: { h: number; s: number; l: number }
    } | null;
    mixState: MixState;
    onMixChange: (s: MixState) => void;
    mixResult: string;
}

export default function ColorAnalysisPanel({ sampledColor, mixState, onMixChange, mixResult }: ColorAnalysisPanelProps) {

    if (!sampledColor) {
        return (
            <div className="p-6 text-center text-gray-500 flex flex-col items-center justify-center h-full">
                <div className="w-16 h-16 mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                </div>
                <p className="text-lg font-medium text-gray-400">Select a color to begin mixing</p>
                <p className="text-sm mt-2">Click anywhere on the image</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-gray-900">
            <div className="flex-1 overflow-y-auto p-6">
                {/* 1. Comparison Hero */}
                <HeroColorCard
                    targetColor={sampledColor.hex}
                    mixColor={mixResult}
                />

                {/* 2. Mixing Controls (Ladders) */}
                <MixLadders
                    targetColor={sampledColor.hex}
                    mixState={mixState}
                    onChange={onMixChange}
                />

                {/* 3. Visualization Map */}
                <ValueChromaMap
                    targetColor={sampledColor.hex}
                    mixColor={mixResult}
                />
            </div>
        </div>
    )
}
