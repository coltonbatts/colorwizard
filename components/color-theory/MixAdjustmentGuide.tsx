'use client'

import { useMemo } from 'react'
import { converter, Oklch, wcagContrast } from 'culori'
import { getPainterValue, getPainterChroma } from '@/lib/paintingMath'

const toOklch = converter('oklch')
const toHsl = converter('hsl')

interface MixAdjustmentGuideProps {
    targetColor: string
    mixColor: string
    onFixMix: () => void
}

export default function MixAdjustmentGuide({
    targetColor,
    mixColor,
    onFixMix
}: MixAdjustmentGuideProps) {

    const adjustments = useMemo(() => {
        const target = toOklch(targetColor)
        const mix = toOklch(mixColor)
        const targetHsl = toHsl(targetColor)
        const mixHsl = toHsl(mixColor)

        if (!target || !mix || !targetHsl || !mixHsl) return null

        // Lightness (Value) Analysis
        const targetL = targetHsl.l ?? 0 // 0-1
        const mixL = mixHsl.l ?? 0
        const deltaL = mixL - targetL

        // Saturation (Chroma) Analysis - Using HSL for familiar % terms for users, 
        // though OKLCH is better for perception. Let's stick to HSL for instructions as requested (HSL model).
        const targetS = targetHsl.s ?? 0
        const mixS = mixHsl.s ?? 0
        const deltaS = mixS - targetS

        // Hue Analysis
        const targetH = targetHsl.h ?? 0
        const mixH = mixHsl.h ?? 0

        // Shortest path for hue difference
        let deltaH = mixH - targetH
        if (deltaH > 180) deltaH -= 360
        if (deltaH < -180) deltaH += 360

        // Determine instructions
        const steps: { type: 'value' | 'chroma' | 'hue', text: string, icon: string, relevance: number }[] = []

        // Value Adjustment
        // Tolerance: 5%
        if (Math.abs(deltaL) > 0.05) {
            if (deltaL > 0) {
                // Mix is too light
                steps.push({
                    type: 'value',
                    text: 'Darken by adding more base pigment or a touch of Black',
                    icon: '🌑',
                    relevance: Math.abs(deltaL)
                })
            } else {
                // Mix is too dark
                steps.push({
                    type: 'value',
                    text: 'Lighten by adding White',
                    icon: '⚪️',
                    relevance: Math.abs(deltaL)
                })
            }
        }

        // Chroma Adjustment
        // Tolerance: 5%
        if (Math.abs(deltaS) > 0.05) {
            if (deltaS > 0) {
                // Mix is too saturated
                steps.push({
                    type: 'chroma',
                    text: 'Reduce saturation by adding the complement or White/Black',
                    icon: '🌫️',
                    relevance: Math.abs(deltaS)
                })
            } else {
                // Mix is too dull
                steps.push({
                    type: 'chroma',
                    text: 'Boost saturation by adding more pure color',
                    icon: '🎨',
                    relevance: Math.abs(deltaS)
                })
            }
        }

        // Hue Adjustment
        // Tolerance: 10 degrees?
        if (Math.abs(deltaH) > 10) {
            // Simple logic: Clockwise/Counter-clockwise is hard to describe universally without a wheel ref.
            // But we can say "Shift Hue".
            // Or try to guess color families.
            // If target is Red (0) and Mix is Orange (30), deltaH = 30. Mix is "too yellow". Need to move back to Red.
            // "Shift towards [Color Family of Target]"

            steps.push({
                type: 'hue',
                text: `Shift hue ${deltaH > 0 ? 'counter-clockwise' : 'clockwise'} towards target (Adjust base colors)`,
                icon: '🌈',
                relevance: Math.abs(deltaH) / 360 // Normalize relevance roughly
            })
        }

        // Sort by relevance (biggest problem first)
        steps.sort((a, b) => b.relevance - a.relevance)

        return {
            steps,
            deltas: {
                l: (deltaL * 100).toFixed(0),
                s: (deltaS * 100).toFixed(0),
                h: deltaH.toFixed(0)
            }
        }
    }, [targetColor, mixColor])

    if (!adjustments) return null

    const isMatch = adjustments.steps.length === 0

    return (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-5">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>🛠️</span> Mix Adjustment Guide
            </h3>

            {/* Visual Comparison Bar */}
            <div className="flex items-center gap-3 mb-6 relative">
                <div className="flex-1 h-12 rounded-l-lg relative overflow-hidden">
                    <div
                        className="absolute inset-0"
                        style={{ backgroundColor: mixColor }}
                    />
                    <span className="absolute left-2 bottom-1 text-[10px] bg-black/50 px-1 rounded text-white font-mono">Current</span>
                </div>

                {/* Connecting Arrow */}
                <div className="text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </div>

                <div className="flex-1 h-12 rounded-r-lg relative overflow-hidden">
                    <div
                        className="absolute inset-0"
                        style={{ backgroundColor: targetColor }}
                    />
                    <span className="absolute right-2 bottom-1 text-[10px] bg-black/50 px-1 rounded text-white font-mono">Target</span>
                </div>
            </div>

            {/* Delta Metrics */}
            <div className="grid grid-cols-3 gap-2 mb-6">
                <div className="bg-gray-900/50 p-2 rounded text-center border border-gray-800">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">Hue</div>
                    <div className={`font-mono font-medium ${Math.abs(Number(adjustments.deltas.h)) < 10 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {Number(adjustments.deltas.h) > 0 ? '+' : ''}{adjustments.deltas.h}°
                    </div>
                </div>
                <div className="bg-gray-900/50 p-2 rounded text-center border border-gray-800">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">Sat</div>
                    <div className={`font-mono font-medium ${Math.abs(Number(adjustments.deltas.s)) < 5 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {Number(adjustments.deltas.s) > 0 ? '+' : ''}{adjustments.deltas.s}%
                    </div>
                </div>
                <div className="bg-gray-900/50 p-2 rounded text-center border border-gray-800">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">Light</div>
                    <div className={`font-mono font-medium ${Math.abs(Number(adjustments.deltas.l)) < 5 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {Number(adjustments.deltas.l) > 0 ? '+' : ''}{adjustments.deltas.l}%
                    </div>
                </div>
            </div>

            {/* Instructions */}
            <div className="space-y-3 mb-6">
                {isMatch ? (
                    <div className="p-3 bg-green-900/20 border border-green-800 rounded-lg flex items-center gap-3 text-green-200">
                        <span className="text-xl">✨</span>
                        <span className="text-sm font-medium">Perfect Match! No adjustments needed.</span>
                    </div>
                ) : (
                    adjustments.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-gray-900/30 rounded-lg border border-gray-800/50">
                            <span className="text-xl mt-0.5">{step.icon}</span>
                            <p className="text-sm text-gray-300 leading-tight py-1">{step.text}</p>
                        </div>
                    ))
                )}
            </div>

            {/* Action */}
            {!isMatch && (
                <button
                    onClick={onFixMix}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Apply Adjustments
                </button>
            )}
        </div>
    )
}
