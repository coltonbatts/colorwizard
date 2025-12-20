'use client'

import { useEffect, useRef } from 'react'
import { converter } from 'culori'

const toHsl = converter('hsl')

interface ChromaMapProps {
    targetColor: string
    mixColor: string
}

export default function ChromaMap({ targetColor, mixColor }: ChromaMapProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set dimensions
        const width = canvas.width
        const height = canvas.height
        const padding = 40
        const plotWidth = width - padding * 2
        const plotHeight = height - padding * 2

        // Clear
        ctx.clearRect(0, 0, width, height)

        // Background Grid/Gradient
        // Let's make a nice gradient background representing the S/L space
        // X = Saturation (0-100), Y = Lightness (0-100)
        // Usually Lightness is Y (0 at bottom? No, 0 is black. So 0 at bottom).
        // Let's do standard cartesian: 0,0 at bottom-left.
        // Y=0 (Black) -> Y=100 (White)
        // X=0 (Gray) -> X=100 (Pure)

        // Draw Gamut hint (Zorn-ish)
        // Zorn palette tends to be lower saturation in blues/greens, higher in red/orange.
        // Since this map sums up all hues, we can't show per-hue gamut easily.
        // But we can show a general "Safe Zone" oval? 
        // Or just leave it as a general map. Let's just draw the axes nicely.

        // Draw Axes
        ctx.strokeStyle = '#374151' // gray-700
        ctx.lineWidth = 1

        // Y Axis
        ctx.beginPath()
        ctx.moveTo(padding, padding)
        ctx.lineTo(padding, height - padding)
        ctx.stroke()

        // X Axis
        ctx.beginPath()
        ctx.moveTo(padding, height - padding)
        ctx.lineTo(width - padding, height - padding)
        ctx.stroke()

        // Labels
        ctx.fillStyle = '#9CA3AF' // gray-400
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Saturation', width / 2, height - 10)

        ctx.save()
        ctx.translate(15, height / 2)
        ctx.rotate(-Math.PI / 2)
        ctx.fillText('Lightness', 0, 0)
        ctx.restore()

        // Plot function
        const plotPoint = (color: string, label: string, isTarget: boolean) => {
            const hsl = toHsl(color)
            if (!hsl) return null

            const s = hsl.s ?? 0
            const l = hsl.l ?? 0

            // Map to pixels
            // x: padding + s * plotWidth
            // y: (height - padding) - l * plotHeight
            const x = padding + s * plotWidth
            const y = (height - padding) - l * plotHeight

            return { x, y, color }
        }

        const tPos = plotPoint(targetColor, 'Target', true)
        const mPos = plotPoint(mixColor, 'Mix', false)

        if (!tPos || !mPos) return

        // Draw Arrow Mix -> Target
        // Only if interaction is significant
        const dx = tPos.x - mPos.x
        const dy = tPos.y - mPos.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > 5) {
            ctx.beginPath()
            ctx.moveTo(mPos.x, mPos.y)
            ctx.lineTo(tPos.x, tPos.y)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
            ctx.lineWidth = 2
            ctx.setLineDash([4, 4])
            ctx.stroke()
            ctx.setLineDash([])

            // Head
            const angle = Math.atan2(dy, dx)
            const headLen = 8
            ctx.beginPath()
            ctx.moveTo(tPos.x, tPos.y)
            ctx.lineTo(tPos.x - headLen * Math.cos(angle - Math.PI / 6), tPos.y - headLen * Math.sin(angle - Math.PI / 6))
            ctx.lineTo(tPos.x - headLen * Math.cos(angle + Math.PI / 6), tPos.y - headLen * Math.sin(angle + Math.PI / 6))
            ctx.lineTo(tPos.x, tPos.y)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
            ctx.fill()
        }

        // Draw Points
        // Mix Point
        ctx.beginPath()
        ctx.arc(mPos.x, mPos.y, 6, 0, Math.PI * 2)
        ctx.fillStyle = mPos.color
        ctx.fill()
        ctx.strokeStyle = 'white'
        ctx.lineWidth = 2
        ctx.stroke()
        // Label
        ctx.fillStyle = 'white'
        ctx.textAlign = 'left'
        ctx.fillText('Mix', mPos.x + 10, mPos.y)

        // Target Point
        ctx.beginPath()
        ctx.arc(tPos.x, tPos.y, 6, 0, Math.PI * 2)
        ctx.fillStyle = tPos.color
        ctx.fill()
        ctx.strokeStyle = 'white'
        ctx.lineWidth = 2
        // ctx.shadowColor = 'black'
        // ctx.shadowBlur = 4
        ctx.stroke()
        // Label
        ctx.fillStyle = 'white'
        ctx.textAlign = 'left'
        ctx.fillText('Target', tPos.x + 10, tPos.y)

    }, [targetColor, mixColor])

    return (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-gray-300">Chroma Map (S vs L)</h3>
            </div>
            <canvas
                ref={canvasRef}
                width={320}
                height={200}
                className="w-full h-auto bg-gray-900/30 rounded-lg border border-gray-800"
            />
        </div>
    )
}
