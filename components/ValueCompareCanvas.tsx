'use client'

/**
 * ValueCompareCanvas - Canvas component with side-by-side draggable curtain overlay,
 * grayscale rendering, zebra stripe overlays, and pan/zoom controls.
 * Conforms to the Warm Paper Workbench design system.
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { ComparisonResult } from '@/lib/valueComparison'
import { createZebraOverlayCanvas } from '@/lib/zebraStripeRenderer'
import { createGrayscaleCanvas } from '@/lib/grayscaleConvert'

interface ValueCompareCanvasProps {
    /** The image to display */
    image: HTMLImageElement | null
    /** Label for the canvas (e.g., "Reference" or "WIP") */
    label: string
    /** Callback when a new image is loaded (for WIP upload) */
    onImageLoad?: (img: HTMLImageElement) => void
    /** Whether to show the upload interface */
    showUpload?: boolean
    /** Comparison result for overlay rendering */
    comparisonResult?: ComparisonResult | null
    /** Whether to show the zebra stripe overlay */
    showProblemAreas?: boolean
    /** Whether this is the reference canvas (affects zebra overlay side) */
    isReference?: boolean
}

// Zoom constraints
const MIN_ZOOM = 0.5
const MAX_ZOOM = 4
const ZOOM_SPEED = 0.001

export default function ValueCompareCanvas({
    image,
    label,
    onImageLoad,
    showUpload = false,
    comparisonResult,
    showProblemAreas = false,
    isReference = false
}: ValueCompareCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    fileInputRef = useRef<HTMLInputElement>(null)

    // Transform state
    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({ x: 0, y: 0 })

    // Curtain overlay state (0 to 1 position across canvas width)
    const [curtainPosition, setCurtainPosition] = useState(0.5)
    const [isDraggingCurtain, setIsDraggingCurtain] = useState(false)
    const [enableCurtainMode, setEnableCurtainMode] = useState(true)

    // Drag state
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

    // Animation state for zebra stripes
    const [animationOffset, setAnimationOffset] = useState(0)
    const animationFrameRef = useRef<number>()

    // Cached grayscale canvas
    const grayscaleCanvasRef = useRef<HTMLCanvasElement | null>(null)

    // Create grayscale version when image changes
    useEffect(() => {
        if (image) {
            grayscaleCanvasRef.current = createGrayscaleCanvas(image)
        } else {
            grayscaleCanvasRef.current = null
        }
    }, [image])

    // Animation loop for zebra stripes
    useEffect(() => {
        if (!showProblemAreas || !comparisonResult) {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
            return
        }

        let lastTime = 0
        const animate = (time: number) => {
            const delta = time - lastTime
            if (delta > 50) {
                lastTime = time
                setAnimationOffset(prev => (prev + 0.05) % 1)
            }
            animationFrameRef.current = requestAnimationFrame(animate)
        }

        animationFrameRef.current = requestAnimationFrame(animate)

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
        }
    }, [showProblemAreas, comparisonResult])

    // Render canvas with side-by-side curtain overlay
    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        const grayscaleCanvas = grayscaleCanvasRef.current

        if (!canvas || !container) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const dpr = window.devicePixelRatio || 1
        const rect = container.getBoundingClientRect()
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        canvas.style.width = `${rect.width}px`
        canvas.style.height = `${rect.height}px`

        ctx.scale(dpr, dpr)

        // Warm paper background fill
        ctx.fillStyle = '#F5F0E8'
        ctx.fillRect(0, 0, rect.width, rect.height)

        if (!image || !grayscaleCanvas) return

        const imgWidth = grayscaleCanvas.width * zoom
        const imgHeight = grayscaleCanvas.height * zoom
        const x = (rect.width - imgWidth) / 2 + pan.x
        const y = (rect.height - imgHeight) / 2 + pan.y

        const splitX = rect.width * curtainPosition

        if (enableCurtainMode) {
            // Left side: Render Full Color Image
            ctx.save()
            ctx.beginPath()
            ctx.rect(0, 0, splitX, rect.height)
            ctx.clip()
            ctx.drawImage(image, x, y, imgWidth, imgHeight)
            ctx.restore()

            // Right side: Render Grayscale Image
            ctx.save()
            ctx.beginPath()
            ctx.rect(splitX, 0, rect.width - splitX, rect.height)
            ctx.clip()
            ctx.drawImage(grayscaleCanvas, x, y, imgWidth, imgHeight)

            if (showProblemAreas && comparisonResult && !isReference) {
                const overlayCanvas = createZebraOverlayCanvas(comparisonResult, {
                    animationOffset,
                    opacity: 0.6,
                    stripeWidth: 10
                })
                ctx.drawImage(overlayCanvas, x, y, imgWidth, imgHeight)
            }
            ctx.restore()

            // Draw vertical curtain divider line
            ctx.strokeStyle = '#1A1A1A'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(splitX, 0)
            ctx.lineTo(splitX, rect.height)
            ctx.stroke()
        } else {
            // Standard single rendering (grayscale)
            ctx.drawImage(grayscaleCanvas, x, y, imgWidth, imgHeight)

            if (showProblemAreas && comparisonResult && !isReference) {
                const overlayCanvas = createZebraOverlayCanvas(comparisonResult, {
                    animationOffset,
                    opacity: 0.6,
                    stripeWidth: 10
                })
                ctx.drawImage(overlayCanvas, x, y, imgWidth, imgHeight)
            }
        }
    }, [image, zoom, pan, showProblemAreas, comparisonResult, animationOffset, isReference, curtainPosition, enableCurtainMode])

    useEffect(() => {
        const handleResize = () => {
            setZoom(z => z)
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const handleCurtainPointerMove = useCallback((clientX: number) => {
        const container = containerRef.current
        if (!container) return
        const rect = container.getBoundingClientRect()
        const pos = (clientX - rect.left) / rect.width
        setCurtainPosition(Math.max(0.05, Math.min(0.95, pos)))
    }, [])

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        const container = containerRef.current
        if (enableCurtainMode && container) {
            const rect = container.getBoundingClientRect()
            const curtainPx = rect.width * curtainPosition
            const mouseX = e.clientX - rect.left

            if (Math.abs(mouseX - curtainPx) < 20) {
                setIsDraggingCurtain(true)
                return
            }
        }

        setIsDragging(true)
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }, [pan, enableCurtainMode, curtainPosition])

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isDraggingCurtain) {
            handleCurtainPointerMove(e.clientX)
            return
        }

        if (!isDragging) return
        setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        })
    }, [isDraggingCurtain, isDragging, dragStart, handleCurtainPointerMove])

    const handleMouseUp = useCallback(() => {
        setIsDragging(false)
        setIsDraggingCurtain(false)
    }, [])

    const handleMouseLeave = useCallback(() => {
        setIsDragging(false)
        setIsDraggingCurtain(false)
    }, [])

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault()
        const delta = -e.deltaY * ZOOM_SPEED
        setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)))
    }, [])

    const handleReset = useCallback(() => {
        setZoom(1)
        setPan({ x: 0, y: 0 })
        setCurtainPosition(0.5)
    }, [])

    const handleFileSelect = useCallback((file: File) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
                onImageLoad?.(img)
            }
            img.src = e.target?.result as string
        }
        reader.readAsDataURL(file)
    }, [onImageLoad])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file && file.type.startsWith('image/')) {
            handleFileSelect(file)
        }
    }, [handleFileSelect])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
    }, [])

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleFileSelect(file)
        }
    }, [handleFileSelect])

    var fileInputRef = useRef<HTMLInputElement>(null)

    return (
        <div className="flex h-full flex-col bg-paper-shell text-ink">
            {/* Warm Paper Header */}
            <div className="flex items-center justify-between border-b border-ink-hairline bg-paper-elevated px-4 py-2.5 shadow-sm">
                <div className="flex items-center gap-3">
                    <span className="font-serif text-sm font-semibold tracking-tight text-ink">
                        {label}
                    </span>
                    <button
                        type="button"
                        onClick={() => setEnableCurtainMode(!enableCurtainMode)}
                        className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                            enableCurtainMode
                                ? 'border-ink bg-ink text-paper'
                                : 'border-ink-hairline bg-paper text-ink-muted hover:bg-paper-recessed'
                        }`}
                    >
                        {enableCurtainMode ? 'Curtain Split ON' : 'Grayscale Only'}
                    </button>
                </div>

                {image && (
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-ink-muted tabular-nums">
                            {Math.round(zoom * 100)}%
                        </span>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="rounded-lg border border-ink-hairline bg-paper px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:bg-paper-recessed"
                        >
                            Reset View
                        </button>
                    </div>
                )}
            </div>

            {/* Canvas Viewport Container */}
            <div
                ref={containerRef}
                className="relative flex-1 overflow-hidden bg-paper-recessed"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
            >
                {image ? (
                    <>
                        <canvas
                            ref={canvasRef}
                            className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseLeave}
                            onWheel={handleWheel}
                        />

                        {/* Interactive Curtain Divider Handle */}
                        {enableCurtainMode && (
                            <div
                                style={{ left: `${curtainPosition * 100}%` }}
                                className="absolute top-0 bottom-0 z-20 w-8 -translate-x-1/2 cursor-ew-resize flex items-center justify-center pointer-events-auto"
                                onMouseDown={(e) => {
                                    e.stopPropagation()
                                    setIsDraggingCurtain(true)
                                }}
                            >
                                <div className="flex h-10 w-6 items-center justify-center rounded-lg border border-ink-hairline bg-paper-elevated shadow-md hover:scale-105 active:scale-95 transition-transform">
                                    <div className="flex gap-0.5">
                                        <div className="h-4 w-0.5 bg-ink/40" />
                                        <div className="h-4 w-0.5 bg-ink/40" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : showUpload ? (
                    <label
                        className="absolute inset-0 m-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink-hairline bg-paper-elevated/60 text-ink-muted transition-colors hover:border-ink hover:bg-paper-elevated"
                    >
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span className="mt-3 font-serif text-sm font-semibold text-ink">Upload WIP Photo</span>
                        <span className="mt-1 font-sans text-xs text-ink-muted">Drag and drop or click to browse</span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={handleInputChange}
                        />
                    </label>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-ink-muted font-serif text-sm">
                        No reference image loaded
                    </div>
                )}
            </div>
        </div>
    )
}

