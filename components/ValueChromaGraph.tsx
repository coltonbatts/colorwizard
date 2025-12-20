'use client'

import { useMemo } from 'react'
import { getPainterValue, getPainterChroma } from '@/lib/paintingMath'

interface ValueChromaGraphProps {
    color: string // Hex or CSS string
}

export default function ValueChromaGraph({ color }: ValueChromaGraphProps) {
    const { value, chroma, x, y } = useMemo(() => {
        const val = getPainterValue(color) // 0-10
        const chr = getPainterChroma(color).value // 0-~0.4

        // Map to coordinates (SVG ViewBox 0 0 240 160)
        // Y: 0 at bottom, 10 at top (inverted for SVG)
        // X: 0 at left, 0.4 at right

        // Dimensions
        const width = 240
        const height = 160
        const padding = 30
        const graphW = width - padding - 10
        const graphH = height - padding - 10

        // Calculate position
        const yPos = 10 + (10 - val) / 10 * graphH
        const xPos = padding + (chr / 0.4) * graphW

        return { value: val, chroma: chr, x: xPos, y: yPos }
    }, [color])

    return (
        <div className="w-full bg-gray-900 rounded-lg p-3 lg:p-4 border border-gray-800 shadow-inner">
            <h4 className="text-[10px] lg:text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider flex justify-between items-center">
                <span>Perceptual Map</span>
                <span className="text-[9px] lg:text-[10px] text-gray-600 font-normal">Munsell-based</span>
            </h4>

            <div className="relative w-full aspect-[3/2] max-h-[180px] lg:max-h-none">
                <svg
                    viewBox="0 0 240 160"
                    className="w-full h-full drop-shadow-lg"
                    preserveAspectRatio="xMidYMid meet"
                >
                    {/* Background Grid */}
                    <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#222" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect x="30" y="10" width="200" height="120" fill="url(#grid)" />

                    {/* Axes */}
                    {/* Y Axis Line */}
                    <line x1="30" y1="10" x2="30" y2="130" stroke="#444" strokeWidth="1" />

                    {/* X Axis Line */}
                    <line x1="30" y1="130" x2="230" y2="130" stroke="#444" strokeWidth="1" />

                    {/* Labels - Y Axis */}
                    <text x="25" y="15" textAnchor="end" fill="#666" fontSize="10" fontFamily="monospace">10</text>
                    <text x="25" y="70" textAnchor="end" fill="#666" fontSize="10" fontFamily="monospace">5</text>
                    <text x="25" y="130" textAnchor="end" fill="#666" fontSize="10" fontFamily="monospace">0</text>

                    {/* Labels - Main Titles - rotated for Y */}
                    <text x="15" y="70" textAnchor="middle" fill="#888" fontSize="10" fontWeight="bold" transform="rotate(-90, 15, 70)">VALUE</text>
                    <text x="130" y="150" textAnchor="middle" fill="#888" fontSize="10" fontWeight="bold">CHROMA</text>

                    {/* Target Crosshairs */}
                    <line x1="30" y1={y} x2={x} y2={y} stroke="#555" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1={x} y1={y} x2={x} y2={130} stroke="#555" strokeWidth="1" strokeDasharray="4 4" />

                    {/* Data Point */}
                    <circle
                        cx={x}
                        cy={y}
                        r="6"
                        fill={color}
                        stroke="white"
                        strokeWidth="2"
                        className="transition-all duration-300 ease-out"
                    />
                </svg>
            </div>

            <div className="flex justify-between text-[10px] text-gray-500 mt-2 px-1">
                <span>Neutral / Gray</span>
                <span>Vivid / Intense</span>
            </div>
        </div>
    )
}
