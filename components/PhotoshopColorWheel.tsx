'use client'

import { useEffect, useRef, useState } from 'react'
import { converter, formatHex } from 'culori'

interface HSV {
    h: number
    s: number
    v: number
}

interface PhotoshopColorWheelProps {
    color: string // Hex or CSS color
    onChange?: (hex: string) => void
}

const toHsv = converter('hsv')

export default function PhotoshopColorWheel({ color, onChange }: PhotoshopColorWheelProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [hsvState, setHsvState] = useState<HSV>({ h: 0, s: 0, v: 0 })
    const isDraggingHue = useRef(false)
    const isDraggingTriangle = useRef(false)

    // Sync state with prop
    useEffect(() => {
        const parsed = toHsv(color)
        if (parsed) {
            setHsvState({
                h: parsed.h ?? 0,
                s: (parsed.s ?? 0) * 100,
                v: (parsed.v ?? 0) * 100
            })
        }
    }, [color])

    const wheelSize = 240
    const ringWidth = 20
    const centerX = wheelSize / 2
    const centerY = wheelSize / 2
    const outerRadius = wheelSize / 2
    const innerRadius = outerRadius - ringWidth - 10

    // Triangle vertices (static relative to center)
    // Tip: Right (0 degrees)
    // White: Top Left
    // Black: Bottom Left
    const getTriangleVertices = (hue: number) => {
        const rad = innerRadius
        // Equilateral triangle inscribed in circle of innerRadius
        // Tip (Pure Hue)
        const vHue = { x: centerX + rad, y: centerY }
        // White (Top Left)
        const vWhite = {
            x: centerX + rad * Math.cos(120 * Math.PI / 180),
            y: centerY + rad * Math.sin(120 * Math.PI / 180)
        }
        // Black (Bottom Left)
        const vBlack = {
            x: centerX + rad * Math.cos(240 * Math.PI / 180),
            y: centerY + rad * Math.sin(240 * Math.PI / 180)
        }
        return { vHue, vWhite, vBlack }
    }

    const draw = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, wheelSize, wheelSize)

        // 1. Draw Hue Ring
        for (let i = 0; i < 360; i++) {
            const startAngle = (i - 1) * Math.PI / 180
            const endAngle = (i + 1) * Math.PI / 180
            ctx.beginPath()
            ctx.arc(centerX, centerY, outerRadius - ringWidth / 2, startAngle, endAngle)
            const strokeColor = formatHex({ mode: 'hsv', h: i, s: 1, v: 1 })
            ctx.strokeStyle = strokeColor || '#000'
            ctx.lineWidth = ringWidth
            ctx.stroke()
        }

        // 2. Draw Hue Marker
        const hueRad = (hsvState.h) * Math.PI / 180
        const mx = centerX + (outerRadius - ringWidth / 2) * Math.cos(hueRad)
        const my = centerY + (outerRadius - ringWidth / 2) * Math.sin(hueRad)
        ctx.beginPath()
        ctx.arc(mx, my, ringWidth / 2 + 2, 0, Math.PI * 2)
        ctx.strokeStyle = 'white'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(mx, my, ringWidth / 2 - 2, 0, Math.PI * 2)
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 1
        ctx.stroke()

        // 3. Draw Triangle
        const { vHue, vWhite, vBlack } = getTriangleVertices(hsvState.h)

        // We render triangle using a simple pixel loop for smooth gradient
        const imageData = ctx.createImageData(wheelSize, wheelSize)
        const data = imageData.data

        // Helper to check if point is in triangle and get barycentric coords
        const getBarycentric = (px: number, py: number) => {
            const denom = (vWhite.y - vBlack.y) * (vHue.x - vBlack.x) + (vBlack.x - vWhite.x) * (vHue.y - vBlack.y)
            const a = ((vWhite.y - vBlack.y) * (px - vBlack.x) + (vBlack.x - vWhite.x) * (py - vBlack.y)) / denom
            const b = ((vBlack.y - vHue.y) * (px - vBlack.x) + (vHue.x - vBlack.x) * (py - vBlack.y)) / denom
            const c = 1 - a - b
            return { a, b, c }
        }

        const toRgb = (h: number, s: number, v: number) => {
            // Manual HSV to RGB for pixel loop performance
            s /= 100; v /= 100;
            const i = Math.floor(h / 60);
            const f = h / 60 - i;
            const p = v * (1 - s);
            const q = v * (1 - f * s);
            const t = v * (1 - (1 - f) * s);
            let r = 0, g = 0, b = 0;
            switch (i % 6) {
                case 0: r = v, g = t, b = p; break;
                case 1: r = q, g = v, b = p; break;
                case 2: r = p, g = v, b = t; break;
                case 3: r = p, g = q, b = v; break;
                case 4: r = t, g = p, b = v; break;
                case 5: r = v, g = p, b = q; break;
            }
            return { r: r * 255, g: g * 255, b: b * 255 };
        }

        for (let y = 0; y < wheelSize; y++) {
            for (let x = 0; x < wheelSize; x++) {
                const { a, b, c } = getBarycentric(x, y)
                if (a >= -0.01 && b >= -0.01 && c >= -0.01) { // Slight buffer for anti-aliasing feel
                    // s_val = a / (a + b)
                    // v_val = a + b
                    const v_val = a + b
                    const s_val = v_val > 0.001 ? a / v_val : 0

                    const rgb_val = toRgb(hsvState.h, s_val * 100, v_val * 100)
                    const idx = (y * wheelSize + x) * 4
                    data[idx] = rgb_val.r
                    data[idx + 1] = rgb_val.g
                    data[idx + 2] = rgb_val.b
                    data[idx + 3] = 255
                }
            }
        }

        // Put triangle pixels on a temporary canvas
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = wheelSize
        tempCanvas.height = wheelSize
        const tempCtx = tempCanvas.getContext('2d')
        if (tempCtx) {
            tempCtx.putImageData(imageData, 0, 0)
            ctx.drawImage(tempCanvas, 0, 0)
        }

        // Draw Triangle Outline
        ctx.beginPath()
        ctx.moveTo(vHue.x, vHue.y)
        ctx.lineTo(vWhite.x, vWhite.y)
        ctx.lineTo(vBlack.x, vBlack.y)
        ctx.closePath()
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'
        ctx.stroke()

        // 4. Draw Triangle Marker
        const s_in = hsvState.s / 100
        const v_in = hsvState.v / 100
        const a_m = s_in * v_in
        const b_m = v_in * (1 - s_in)
        const c_m = 1 - v_in

        const tx = a_m * vHue.x + b_m * vWhite.x + c_m * vBlack.x
        const ty = a_m * vHue.y + b_m * vWhite.y + c_m * vBlack.y

        ctx.beginPath()
        ctx.arc(tx, ty, 5, 0, Math.PI * 2)
        ctx.strokeStyle = v_in > 0.5 ? 'black' : 'white'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(tx, ty, 3, 0, Math.PI * 2)
        ctx.strokeStyle = v_in > 0.5 ? 'white' : 'black'
        ctx.lineWidth = 1
        ctx.stroke()
    }

    useEffect(() => {
        draw()
    }, [hsvState])

    const handleMouseDown = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const dx = x - centerX
        const dy = y - centerY
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > innerRadius + 5) {
            isDraggingHue.current = true
            updateHue(x, y)
        } else {
            isDraggingTriangle.current = true
            updateSV(x, y)
        }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        if (isDraggingHue.current) {
            updateHue(x, y)
        } else if (isDraggingTriangle.current) {
            updateSV(x, y)
        }
    }

    const handleMouseUp = () => {
        isDraggingHue.current = false
        isDraggingTriangle.current = false
    }

    const updateHue = (x: number, y: number) => {
        const angle = Math.atan2(y - centerY, x - centerX) * 180 / Math.PI
        const h = (angle + 360) % 360
        const newHsv = { ...hsvState, h }
        setHsvState(newHsv)
        notifyChange(newHsv)
    }

    const updateSV = (x: number, y: number) => {
        const { vHue, vWhite, vBlack } = getTriangleVertices(hsvState.h)
        const denom = (vWhite.y - vBlack.y) * (vHue.x - vBlack.x) + (vBlack.x - vWhite.x) * (vHue.y - vBlack.y)
        const a = ((vWhite.y - vBlack.y) * (x - vBlack.x) + (vBlack.x - vWhite.x) * (y - vBlack.y)) / denom
        const b = ((vBlack.y - vHue.y) * (x - vBlack.x) + (vHue.x - vBlack.x) * (y - vBlack.y)) / denom
        const c = 1 - a - b

        // Parametric clamping to triangle
        const a_c = Math.max(0, Math.min(1, a))
        const b_c = Math.max(0, Math.min(1 - a_c, b))
        const c_c = 1 - a_c - b_c

        // Final normalization
        const v_val = a_c + b_c
        const s_val = v_val > 0.001 ? a_c / v_val : 0

        const newHsv = { ...hsvState, s: s_val * 100, v: v_val * 100 }
        setHsvState(newHsv)
        notifyChange(newHsv)
    }

    const notifyChange = (hsvVal: HSV) => {
        if (onChange) {
            const hexVal = formatHex({ mode: 'hsv', h: hsvVal.h, s: hsvVal.s / 100, v: hsvVal.v / 100 })
            if (hexVal) onChange(hexVal)
        }
    }

    return (
        <div className="w-full bg-gray-900/50 rounded-xl p-4 border border-gray-800 shadow-inner">
            <h4 className="text-[10px] lg:text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider flex justify-between items-center">
                <span>Photoshop Style Wheel</span>
                <span className="text-[9px] lg:text-[10px] text-gray-600 font-normal underline">HSB Logic</span>
            </h4>

            <div className="relative w-full flex justify-center py-2">
                <canvas
                    ref={canvasRef}
                    width={wheelSize}
                    height={wheelSize}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="cursor-crosshair touch-none drop-shadow-2xl"
                    style={{ width: wheelSize, height: wheelSize }}
                />
            </div>

            <div className="flex justify-between text-[10px] text-gray-400 mt-4 px-1 font-mono">
                <div className="flex flex-col">
                    <span>H: {Math.round(hsvState.h)}°</span>
                </div>
                <div className="flex flex-col text-right">
                    <span>S: {Math.round(hsvState.s)}% B: {Math.round(hsvState.v)}%</span>
                </div>
            </div>
        </div>
    )
}
