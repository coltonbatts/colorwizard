'use client'

/**
 * ValueCompareCanvas - Canvas component with grayscale rendering and pan/zoom controls.
 * Used for comparing reference and WIP images in the Check My Values feature.
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
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Transform state
    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({ x: 0, y: 0 })

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
            if (delta > 50) { // ~20fps for smooth but not excessive updates
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

    // Render canvas
    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        const grayscaleCanvas = grayscaleCanvasRef.current

        if (!canvas || !container) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set canvas size to container size with DPI awareness
        const dpr = window.devicePixelRatio || 1
        const rect = container.getBoundingClientRect()
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        canvas.style.width = `${rect.width}px`
        canvas.style.height = `${rect.height}px`

        ctx.scale(dpr, dpr)

        // Clear canvas
        ctx.fillStyle = '#1f2937' // Dark gray background
        ctx.fillRect(0, 0, rect.width, rect.height)

        if (!grayscaleCanvas) return

        // Calculate centered position with zoom and pan
        // Use rect.width/height as the coordinate space (scaled by dpr)
        const imgWidth = grayscaleCanvas.width * zoom
        const imgHeight = grayscaleCanvas.height * zoom
        const x = (rect.width - imgWidth) / 2 + pan.x
        const y = (rect.height - imgHeight) / 2 + pan.y

        // Draw grayscale image
        ctx.drawImage(grayscaleCanvas, x, y, imgWidth, imgHeight)

        // Draw zebra overlay if enabled (only on WIP canvas)
        if (showProblemAreas && comparisonResult && !isReference) {
            const overlayCanvas = createZebraOverlayCanvas(comparisonResult, {
                animationOffset,
                opacity: 0.6,
                stripeWidth: 10
            })

            // Scale overlay to match displayed image size
            // Aspect ratio integrity check
            const sourceAspect = grayscaleCanvas.width / grayscaleCanvas.height
            const overlayAspect = overlayCanvas.width / overlayCanvas.height
            if (Math.abs(sourceAspect - overlayAspect) > 0.001) {
                console.error('Reference Integrity Violated: Overlay aspect ratio mismatch', { sourceAspect, overlayAspect })
            }

            ctx.drawImage(overlayCanvas, x, y, imgWidth, imgHeight)
        }
    }, [image, zoom, pan, showProblemAreas, comparisonResult, animationOffset, isReference])

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            // Trigger re-render
            setZoom(z => z)
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Mouse/touch handlers for pan
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        setIsDragging(true)
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }, [pan])

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return
        setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        })
    }, [isDragging, dragStart])

    const handleMouseUp = useCallback(() => {
        setIsDragging(false)
    }, [])

    const handleMouseLeave = useCallback(() => {
        setIsDragging(false)
    }, [])

    // Wheel handler for zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault()
        const delta = -e.deltaY * ZOOM_SPEED
        setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)))
    }, [])

    // Touch handlers for pinch zoom
    const lastTouchDistance = useRef<number | null>(null)

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            setIsDragging(true)
            setDragStart({
                x: e.touches[0].clientX - pan.x,
                y: e.touches[0].clientY - pan.y
            })
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            lastTouchDistance.current = Math.sqrt(dx * dx + dy * dy)
        }
    }, [pan])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 1 && isDragging) {
            setPan({
                x: e.touches[0].clientX - dragStart.x,
                y: e.touches[0].clientY - dragStart.y
            })
        } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            const distance = Math.sqrt(dx * dx + dy * dy)
            const delta = (distance - lastTouchDistance.current) * 0.01
            setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)))
            lastTouchDistance.current = distance
        }
    }, [isDragging, dragStart])

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false)
        lastTouchDistance.current = null
    }, [])

    // Reset handler
    const handleReset = useCallback(() => {
        setZoom(1)
        setPan({ x: 0, y: 0 })
    }, [])

    // File upload handlers
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

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    {label}
                </span>
                {image && (
                    <button
                        onClick={handleReset}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                    >
                        Reset View
                    </button>
                )}
            </div>

            {/* Canvas Container */}
            <div
                ref={containerRef}
                className="flex-1 relative overflow-hidden bg-gray-900"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
            >
                {image ? (
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onWheel={handleWheel}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    />
                ) : showUpload ? (
                    <label
                        className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-700 m-4 rounded-xl cursor-pointer hover:border-gray-500 transition-colors"
                    >
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span className="mt-3 text-sm font-medium">Upload WIP Photo</span>
                        <span className="mt-1 text-xs text-gray-600">Drag and drop or click to browse</span>
                        <input
                            type="file"
                            accept="image/*"
                            className="absolute w-1 h-1 opacity-0 pointer-events-none"
                            onChange={handleInputChange}
                        />
                    </label>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                        <span className="text-sm">No reference image</span>
                    </div>
                )}

                {/* Zoom indicator */}
                {image && (
                    <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/50 rounded text-xs text-white">
                        {Math.round(zoom * 100)}%
                    </div>
                )}
            </div>
        </div>
    )
}
