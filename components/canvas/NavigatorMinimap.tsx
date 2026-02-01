'use client'

import React, { useEffect, useRef, useMemo } from 'react'
import { TransformState } from '@/lib/calibration'

interface NavigatorMinimapProps {
    image: HTMLImageElement | null
    transform: TransformState
    canvasDimensions: { width: number; height: number }
    isVisible: boolean
}

const MINIMAP_SIZE = 150 // Max dimension (width or height)
const SAFE_AREA = 16

export const NavigatorMinimap: React.FC<NavigatorMinimapProps> = ({
    image,
    transform,
    canvasDimensions,
    isVisible
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const thumbCanvasRef = useRef<HTMLCanvasElement | null>(null)

    // Memoize minimap dimensions based on image aspect ratio
    const minimapDims = useMemo(() => {
        if (!image) return { width: 0, height: 0 }
        const aspect = image.width / image.height
        if (aspect > 1) {
            return { width: MINIMAP_SIZE, height: MINIMAP_SIZE / aspect }
        } else {
            return { width: MINIMAP_SIZE * aspect, height: MINIMAP_SIZE }
        }
    }, [image])

    // Create and cache thumbnail
    useEffect(() => {
        if (!image || minimapDims.width === 0) return

        const thumbCanvas = document.createElement('canvas')
        const dpr = window.devicePixelRatio || 1
        thumbCanvas.width = minimapDims.width * dpr
        thumbCanvas.height = minimapDims.height * dpr
        const ctx = thumbCanvas.getContext('2d')
        if (ctx) {
            ctx.scale(dpr, dpr)
            ctx.drawImage(image, 0, 0, minimapDims.width, minimapDims.height)
            thumbCanvasRef.current = thumbCanvas
        }
    }, [image, minimapDims])

    // Draw minimap background
    useEffect(() => {
        if (!canvasRef.current || !thumbCanvasRef.current) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const dpr = window.devicePixelRatio || 1
        canvas.width = minimapDims.width * dpr
        canvas.height = minimapDims.height * dpr
        canvas.style.width = `${minimapDims.width}px`
        canvas.style.height = `${minimapDims.height}px`

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(thumbCanvasRef.current, 0, 0)
    }, [minimapDims])

    // Calculate viewport rectangle
    const viewportRect = useMemo(() => {
        if (!image || !transform.imageDrawInfo || minimapDims.width === 0) return null

        const { zoomLevel, panOffset, imageDrawInfo } = transform
        const { width: canvW, height: canvH } = canvasDimensions

        // 1. Calculate the visible portion of the IMAGE in IMAGE-FIT space
        // Screen coords: (0,0) to (canvW, canvH)
        // Canvas coords: canvPoint = (screenPoint - panOffset) / zoomLevel

        const topLeft = {
            x: (0 - panOffset.x) / zoomLevel,
            y: (0 - panOffset.y) / zoomLevel
        }
        const bottomRight = {
            x: (canvW - panOffset.x) / zoomLevel,
            y: (canvH - panOffset.y) / zoomLevel
        }

        // 2. Map to 0-1 range within the fitted image
        const x1 = (topLeft.x - imageDrawInfo.x) / imageDrawInfo.width
        const y1 = (topLeft.y - imageDrawInfo.y) / imageDrawInfo.height
        const x2 = (bottomRight.x - imageDrawInfo.x) / imageDrawInfo.width
        const y2 = (bottomRight.y - imageDrawInfo.y) / imageDrawInfo.height

        // 3. Scale to minimap pixels
        return {
            left: Math.max(0, x1 * minimapDims.width),
            top: Math.max(0, y1 * minimapDims.height),
            width: Math.min(minimapDims.width, (x2 - x1) * minimapDims.width),
            height: Math.min(minimapDims.height, (y2 - y1) * minimapDims.height)
        }
    }, [transform, canvasDimensions, minimapDims, image])

    if (!image || !viewportRect) return null

    return (
        <div
            className={`absolute bottom-4 right-4 z-20 pointer-events-none transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'
                }`}
            style={{
                width: minimapDims.width,
                height: minimapDims.height,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(8px)',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                right: `calc(${SAFE_AREA}px + env(safe-area-inset-right))`,
                bottom: `calc(${SAFE_AREA}px + env(safe-area-inset-bottom))`
            }}
        >
            <canvas
                ref={canvasRef}
                className="w-full h-full"
            />
            <div
                className="absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
                style={{
                    left: 0,
                    top: 0,
                    width: viewportRect.width,
                    height: viewportRect.height,
                    transform: `translate3d(${viewportRect.left}px, ${viewportRect.top}px, 0)`,
                    willChange: 'transform'
                }}
            />
        </div>
    )
}
