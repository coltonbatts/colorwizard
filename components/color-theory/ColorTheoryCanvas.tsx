'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { rgbToHsl } from '@/lib/color/conversions'
import { ColorData } from '@/lib/color/types'

interface ColorTheoryCanvasProps {
    onColorSample: (color: ColorData) => void
}

export default function ColorTheoryCanvas({ onColorSample }: ColorTheoryCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [image, setImage] = useState<HTMLImageElement | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [hoveredColor, setHoveredColor] = useState<ColorData | null>(null)

    // Fit and render image when loaded
    useEffect(() => {
        if (!image || !canvasRef.current || !containerRef.current) return

        const canvas = canvasRef.current
        const container = containerRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const dpr = window.devicePixelRatio || 1
        const rect = container.getBoundingClientRect()
        
        // Internal buffer size (DPI aware)
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        
        // CSS display size
        canvas.style.width = `${rect.width}px`
        canvas.style.height = `${rect.height}px`

        ctx.scale(dpr, dpr)
        ctx.clearRect(0, 0, rect.width, rect.height)

        // Calculate fit that preserves aspect ratio
        const scale = Math.min(
            rect.width / image.width,
            rect.height / image.height
        ) * 0.9

        const drawWidth = image.width * scale
        const drawHeight = image.height * scale
        const x = (rect.width - drawWidth) / 2
        const y = (rect.height - drawHeight) / 2

        // Safety check: verify aspect ratio integrity
        const sourceAspect = image.width / image.height
        const destAspect = drawWidth / drawHeight
        if (Math.abs(sourceAspect - destAspect) > 0.001) {
            console.error('Reference Integrity Violated: Aspect ratio mismatch in rendering', { sourceAspect, destAspect })
        }

        ctx.drawImage(image, x, y, drawWidth, drawHeight)
    }, [image])

    // Handle resize
    useEffect(() => {
        const handleResize = () => {
            if (!image || !canvasRef.current || !containerRef.current) return
            const canvas = canvasRef.current
            const container = containerRef.current
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            const dpr = window.devicePixelRatio || 1
            const rect = container.getBoundingClientRect()

            canvas.width = rect.width * dpr
            canvas.height = rect.height * dpr
            canvas.style.width = `${rect.width}px`
            canvas.style.height = `${rect.height}px`

            ctx.scale(dpr, dpr)
            ctx.clearRect(0, 0, rect.width, rect.height)

            const scale = Math.min(
                rect.width / image.width,
                rect.height / image.height
            ) * 0.9

            const drawWidth = image.width * scale
            const drawHeight = image.height * scale
            const x = (rect.width - drawWidth) / 2
            const y = (rect.height - drawHeight) / 2

            ctx.drawImage(image, x, y, drawWidth, drawHeight)
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [image])

    const getColorAtPosition = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        if (!canvas || !image) return null

        const ctx = canvas.getContext('2d')
        if (!ctx) return null

        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const pixel = ctx.getImageData(x, y, 1, 1).data
        const [r, g, b] = pixel

        if (pixel[3] === 0) return null

        const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase()
        const hsl = rgbToHsl(r, g, b)

        return { hex, rgb: { r, g, b }, hsl }
    }, [image])

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const color = getColorAtPosition(e)
        setHoveredColor(color)
    }

    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const color = getColorAtPosition(e)
        if (color) onColorSample(color)
    }

    const loadImage = (file: File) => {
        const reader = new FileReader()
        reader.onload = (event) => {
            const img = new Image()
            img.onload = () => setImage(img)
            img.src = event.target?.result as string
        }
        reader.readAsDataURL(file)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file?.type.startsWith('image/')) loadImage(file)
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) loadImage(file)
    }

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full bg-gray-900 rounded-xl overflow-hidden"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
        >
            {!image ? (
                <div
                    className={`absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-colors ${isDragging ? 'border-blue-400 bg-blue-500/10' : 'border-gray-600'
                        }`}
                >
                    <svg className="w-16 h-16 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-400 text-lg mb-2">Drop an image here</p>
                    <p className="text-gray-500 text-sm mb-4">or</p>
                    <label
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors cursor-pointer"
                    >
                        <span>Browse Files</span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileInput}
                            className="absolute w-1 h-1 opacity-0 pointer-events-none"
                        />
                    </label>
                </div>
            ) : (
                <>
                    <canvas
                        ref={canvasRef}
                        className="cursor-crosshair block"
                        style={{ objectFit: 'contain' }}
                        onClick={handleClick}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={() => setHoveredColor(null)}
                    />

                    {/* Hover preview */}
                    {hoveredColor && (
                        <div className="absolute top-4 left-4 bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 border border-gray-700 flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-lg border border-gray-600"
                                style={{ backgroundColor: hoveredColor.hex }}
                            />
                            <div className="text-sm">
                                <p className="text-white font-mono">{hoveredColor.hex}</p>
                                <p className="text-gray-400 text-xs">Click to analyze</p>
                            </div>
                        </div>
                    )}

                    {/* Reset button */}
                    <button
                        onClick={() => setImage(null)}
                        className="absolute top-4 right-4 px-3 py-1.5 bg-gray-800/90 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors backdrop-blur-sm border border-gray-700"
                    >
                        Change Image
                    </button>
                </>
            )}
        </div>
    )
}
