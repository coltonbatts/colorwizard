'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { PALETTE } from '@/lib/spectral/palette'
import { mixInteractive } from '@/lib/paint/solveRecipe'
import { MixInput } from '@/lib/spectral/types'

interface MixLabProps {
    targetHex?: string
    onUseRecipe?: (inputs: MixInput[]) => void
}

export default function MixLab({ targetHex, onUseRecipe }: MixLabProps) {
    // Slider values (0-100 for each pigment)
    const [sliders, setSliders] = useState<Record<string, number>>(() =>
        Object.fromEntries(PALETTE.map((p) => [p.id, 0]))
    )
    const [mixedHex, setMixedHex] = useState<string>('#808080')
    const [isCalculating, setIsCalculating] = useState(false)

    // Convert sliders to normalized MixInputs
    const mixInputs = useMemo((): MixInput[] => {
        const total = Object.values(sliders).reduce((sum, v) => sum + v, 0)
        if (total === 0) return []
        return PALETTE.map((p) => ({
            pigmentId: p.id,
            weight: sliders[p.id] / total,
        })).filter((i) => i.weight > 0)
    }, [sliders])

    // Calculate mix when sliders change
    const calculateMix = useCallback(async () => {
        const total = Object.values(sliders).reduce((sum, v) => sum + v, 0)
        if (total === 0) {
            setMixedHex('#808080')
            return
        }

        setIsCalculating(true)
        try {
            const result = await mixInteractive(mixInputs)
            setMixedHex(result.hex)
        } catch (err) {
            console.error('Mix calculation failed:', err)
            setMixedHex('#808080')
        } finally {
            setIsCalculating(false)
        }
    }, [sliders, mixInputs])

    // Debounce the calculation
    useEffect(() => {
        const timer = setTimeout(calculateMix, 50)
        return () => clearTimeout(timer)
    }, [calculateMix])

    const handleSliderChange = (id: string, value: number) => {
        setSliders((prev) => ({ ...prev, [id]: value }))
    }

    const handleReset = () => {
        setSliders(Object.fromEntries(PALETTE.map((p) => [p.id, 0])))
    }

    const totalWeight = Object.values(sliders).reduce((sum, v) => sum + v, 0)

    return (
        <div className="p-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-100">Mix Lab</h3>
                <button
                    onClick={handleReset}
                    className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded border border-gray-700 hover:border-gray-600 transition-colors"
                >
                    Reset
                </button>
            </div>

            {/* Preview Swatches */}
            <div className="flex gap-4 mb-6">
                {/* Mixed Result */}
                <div className="flex-1">
                    <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-bold">
                        Mixed Result
                    </div>
                    <div
                        className="h-20 rounded-lg border border-gray-600 shadow-lg transition-colors duration-150"
                        style={{ backgroundColor: mixedHex }}
                    />
                    <div className="text-xs text-gray-400 mt-2 font-mono text-center">
                        {isCalculating ? '...' : mixedHex}
                    </div>
                </div>

                {/* Target (if provided) */}
                {targetHex && (
                    <div className="w-16">
                        <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-bold">
                            Target
                        </div>
                        <div
                            className="h-20 rounded-lg border border-gray-600 shadow-lg"
                            style={{ backgroundColor: targetHex }}
                        />
                    </div>
                )}
            </div>

            {/* Pigment Sliders */}
            <div className="space-y-3 mb-6">
                {PALETTE.map((pigment) => {
                    const value = sliders[pigment.id]
                    const percentage = totalWeight > 0 ? Math.round((value / totalWeight) * 100) : 0

                    return (
                        <div key={pigment.id} className="flex items-center gap-3">
                            {/* Color swatch */}
                            <div
                                className="w-6 h-6 rounded border border-gray-600 shrink-0"
                                style={{ backgroundColor: pigment.hex }}
                            />
                            {/* Name */}
                            <div className="w-28 text-sm text-gray-300 truncate">
                                {pigment.name}
                            </div>
                            {/* Slider */}
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={value}
                                onChange={(e) => handleSliderChange(pigment.id, parseInt(e.target.value))}
                                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            {/* Percentage */}
                            <div className="w-12 text-right text-sm text-gray-400 font-mono">
                                {percentage}%
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Use Recipe Button */}
            {onUseRecipe && (
                <button
                    onClick={() => onUseRecipe(mixInputs)}
                    disabled={mixInputs.length === 0}
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors font-medium text-sm"
                >
                    Use This Mix as Recipe
                </button>
            )}

            <p className="mt-4 text-xs text-gray-500 text-center">
                Adjust sliders to see spectral mixing in real time
            </p>
        </div>
    )
}
