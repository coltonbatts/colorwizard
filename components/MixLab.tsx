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

    const [isOverTarget, setIsOverTarget] = useState(false)
    const [isOverResult, setIsOverResult] = useState(false)

    const handleDropOnTarget = (e: React.DragEvent) => {
        e.preventDefault()
        setIsOverTarget(false)
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'))
            if (data.type === 'color' && data.hex) {
                // In a real app, we'd probably want to bubble this up to parent
                // but for now let's just alert or log if we can't change props
                console.log('Dropped color on target:', data.hex)
            }
        } catch (err) {
            console.error('Drop failed', err)
        }
    }

    const handleDropOnResult = (e: React.DragEvent) => {
        e.preventDefault()
        setIsOverResult(false)
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'))
            if (data.type === 'pigment' && data.id) {
                // Add 10 units to this pigment
                setSliders(prev => ({ ...prev, [data.id]: (prev[data.id] || 0) + 10 }))
            }
        } catch (err) {
            console.error('Drop failed', err)
        }
    }

    const totalWeight = Object.values(sliders).reduce((sum, v) => sum + v, 0)

    return (
        <div className="p-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-100 italic tracking-tight">Paint Well</h3>
                <button
                    onClick={handleReset}
                    className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1 rounded bg-gray-900/50 border border-gray-700 hover:border-gray-600 transition-all font-bold"
                >
                    RESET PALETTE
                </button>
            </div>

            {/* Main Mixing Well */}
            <div className="flex items-center justify-center gap-6 mb-8 py-4 bg-gray-950/40 rounded-xl border border-gray-800/50 relative overflow-hidden">
                {/* Decorative background circle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

                {/* Mixed Result (The "Well") */}
                <div className="flex flex-col items-center">
                    <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest font-black">Mixed Result</div>
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsOverResult(true) }}
                        onDragLeave={() => setIsOverResult(false)}
                        onDrop={handleDropOnResult}
                        className={`w-32 h-32 rounded-full border-4 shadow-[inset_0_4px_12px_rgba(0,0,0,0.5)] transition-all duration-300 transform relative ${isOverResult ? 'scale-110 border-blue-400 shadow-blue-500/20' : 'border-gray-700 hover:border-gray-600'}`}
                        style={{ backgroundColor: mixedHex }}
                    >
                        {isOverResult && (
                            <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20 rounded-full animate-pulse">
                                <span className="text-2xl">➕</span>
                            </div>
                        )}
                        {/* Shimmer effect */}
                        <div className="absolute top-[10%] left-[10%] w-[30%] h-[30%] bg-white/10 rounded-full blur-xl pointer-events-none" />
                    </div>
                    <div className="text-xs text-gray-400 mt-3 font-mono font-bold tracking-widest bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
                        {isCalculating ? 'MIXING...' : mixedHex.toUpperCase()}
                    </div>
                </div>

                {/* Target well (smaller) */}
                {targetHex && (
                    <div className="flex flex-col items-center mt-4">
                        <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest font-black">Target</div>
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsOverTarget(true) }}
                            onDragLeave={() => setIsOverTarget(false)}
                            onDrop={handleDropOnTarget}
                            className={`w-20 h-20 rounded-full border-2 shadow-inner transition-all duration-300 cursor-help ${isOverTarget ? 'scale-110 border-pink-400' : 'border-gray-800'}`}
                            style={{ backgroundColor: targetHex }}
                        >
                            {isOverTarget && (
                                <div className="absolute inset-0 flex items-center justify-center bg-pink-500/20 rounded-full">
                                    <span className="text-xl">🎯</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Quick-Add Pigment Wells */}
            <div className="mb-8">
                <h4 className="text-[10px] text-gray-500 mb-3 uppercase tracking-widest font-black text-center">Drag Pigments Into Mix</h4>
                <div className="flex flex-wrap justify-center gap-3">
                    {PALETTE.map((pigment) => (
                        <div
                            key={pigment.id}
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.setData('application/json', JSON.stringify({
                                    type: 'pigment',
                                    id: pigment.id,
                                    name: pigment.name
                                }))
                                e.dataTransfer.effectAllowed = 'copy'
                            }}
                            className="group flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing"
                            title={`Drag ${pigment.name} to mix`}
                        >
                            <div
                                className="w-10 h-10 rounded-full border-2 border-gray-800 group-hover:border-gray-600 transition-all shadow-lg active:scale-95 overflow-hidden relative"
                                style={{ backgroundColor: pigment.hex }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />
                            </div>
                            <span className="text-[8px] text-gray-600 font-bold uppercase tracking-tighter w-12 text-center leading-none">
                                {pigment.name.split(' ')[0]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Fine Tuning Sliders */}
            <div className="space-y-4 mb-6 pt-4 border-t border-gray-800/50">
                <h4 className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest font-black">Fine Tune Mix</h4>
                {PALETTE.map((pigment) => {
                    const value = sliders[pigment.id]
                    if (totalWeight === 0 && value === 0) return null; // Only show active sliders if no total weight? NO, show all.
                    // Actually, let's only show pigments with > 0 weight, plus a few common ones or etc.
                    // For now, show all but compact.
                    const percentage = totalWeight > 0 ? Math.round((value / totalWeight) * 100) : 0

                    return (
                        <div key={pigment.id} className="flex items-center gap-3 group">
                            <div
                                className="w-5 h-5 rounded border border-gray-700 shrink-0"
                                style={{ backgroundColor: pigment.hex }}
                                onClick={() => handleSliderChange(pigment.id, value === 0 ? 50 : 0)} // Quick toggle
                            />
                            <div className="flex-1 space-y-1">
                                <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                                    <span className="group-hover:text-gray-300 transition-colors">{pigment.name}</span>
                                    <span className={percentage > 0 ? 'text-blue-400' : ''}>{percentage}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={value}
                                    onChange={(e) => handleSliderChange(pigment.id, parseInt(e.target.value))}
                                    className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-400 transition-all"
                                />
                            </div>
                        </div>
                    )
                })}
                {totalWeight === 0 && (
                    <div className="py-4 text-center text-[10px] text-gray-600 italic uppercase">
                        All wells empty. Drag pigments above to start.
                    </div>
                )}
            </div>

            {/* Use Recipe Button */}
            {onUseRecipe && (
                <button
                    onClick={() => onUseRecipe(mixInputs)}
                    disabled={mixInputs.length === 0}
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 text-white rounded-xl transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-900/20 active:scale-95"
                >
                    SET AS NEW BASE RECIPE
                </button>
            )}
        </div>
    )
}
