'use client'

import { useMemo } from 'react'

interface ValueHistogramProps {
    bins: number[]
    thresholds?: number[] // For overlaying value steps
    currentValue?: number // 0-1
}

export default function ValueHistogram({ bins, thresholds, currentValue }: ValueHistogramProps) {
    const max = useMemo(() => Math.max(...bins, 1), [bins])

    // Generate path for histogram area
    const pathData = useMemo(() => {
        if (bins.length === 0) return ''
        const width = 256
        const height = 100

        let d = `M 0 ${height}`
        for (let i = 0; i < bins.length; i++) {
            const x = i
            const y = height - (bins[i] / max) * height
            d += ` L ${x} ${y}`
        }
        d += ` L 255 ${height} Z`
        return d
    }, [bins, max])

    return (
        <div className="w-full space-y-2">
            <div className="relative w-full aspect-[4/1] bg-gray-900/50 rounded-lg overflow-hidden border border-gray-800">
                <svg
                    viewBox="0 0 256 100"
                    preserveAspectRatio="none"
                    className="w-full h-full"
                >
                    {/* Value Bins */}
                    <path
                        d={pathData}
                        fill="url(#valueGradient)"
                        fillOpacity="0.8"
                        stroke="none"
                    />

                    {/* Step Thresholds */}
                    {thresholds && thresholds.map((t, i) => (
                        <line
                            key={i}
                            x1={t * 255}
                            y1="0"
                            x2={t * 255}
                            y2="100"
                            stroke="rgba(255, 255, 255, 0.2)"
                            strokeWidth="1"
                            strokeDasharray="2,2"
                        />
                    ))}

                    {/* Current Sample Marker */}
                    {currentValue !== undefined && (
                        <line
                            x1={currentValue * 255}
                            y1="0"
                            x2={currentValue * 255}
                            y2="100"
                            stroke="#3b82f6"
                            strokeWidth="2"
                        />
                    )}

                    <defs>
                        <linearGradient id="valueGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#000" />
                            <stop offset="100%" stopColor="#fff" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>
            <div className="flex justify-between text-[8px] text-gray-500 font-bold uppercase tracking-widest">
                <span>Shadows</span>
                <span>Midtones</span>
                <span>Highlights</span>
            </div>
        </div>
    )
}
