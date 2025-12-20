'use client'

import { useEffect, useRef } from 'react'
import { getPainterValue, getPainterChroma } from '@/lib/paintingMath'

interface ValueChromaGraphProps {
    color: string // Hex or CSS string
}

export default function ValueChromaGraph({ color }: ValueChromaGraphProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Clear
        const width = canvas.width
        const height = canvas.height
        ctx.clearRect(0, 0, width, height)

        // Draw grid
        ctx.strokeStyle = '#333'
        ctx.lineWidth = 1

        // Draw axis lines
        // Y Axis (Value)
        ctx.beginPath()
        ctx.moveTo(30, 0)
        ctx.lineTo(30, height - 20)
        ctx.stroke()

        // X Axis (Chroma)
        ctx.beginPath()
        ctx.moveTo(30, height - 20)
        ctx.lineTo(width, height - 20)
        ctx.stroke()

        // Labels
        ctx.fillStyle = '#666'
        ctx.font = '10px monospace'
        ctx.fillText('Value', 0, 10)
        ctx.fillText('Chroma', width - 40, height - 5)

        // Plot Point
        const value = getPainterValue(color) // 0-10
        const chroma = getPainterChroma(color).value // 0-~0.4

        // Map to coordinates
        // Y: 0 at bottom, 10 at top
        // X: 0 at left, 0.4 at right
        const padding = 30
        const graphH = height - padding - 10
        const graphW = width - padding - 10

        const yVal = graphH - (value / 10) * graphH
        const xVal = padding + (chroma / 0.4) * graphW

        // Draw Point
        ctx.beginPath()
        ctx.arc(xVal, yVal + 10, 6, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()

        // Draw Crosshairs
        ctx.beginPath()
        ctx.setLineDash([2, 4])
        ctx.strokeStyle = '#555'
        ctx.moveTo(30, yVal + 10)
        ctx.lineTo(xVal, yVal + 10)
        ctx.lineTo(xVal, height - 20)
        ctx.stroke()
        ctx.setLineDash([])

    }, [color])

    return (
        <div className="w-full bg-gray-900 rounded p-4 border border-gray-800">
            <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Perceptual Map</h4>
            <canvas
                ref={canvasRef}
                width={240}
                height={160}
                className="w-full h-auto block"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Muted</span>
                <span>Vivid</span>
            </div>
        </div>
    )
}
