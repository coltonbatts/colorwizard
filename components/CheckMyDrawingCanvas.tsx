'use client'

/**
 * CheckMyDrawingCanvas - Main overlay canvas for comparing WIP to reference.
 * Displays reference image as bottom layer and WIP image with perspective
 * transformation as top layer with adjustable opacity.
 */

import { useRef, useEffect, useMemo } from 'react'
import { CornerPoints, computeMatrix3d, getDefaultCorners } from '@/lib/perspectiveWarp'
import { createGrayscaleCanvas } from '@/lib/grayscaleConvert'

interface CheckMyDrawingCanvasProps {
    /** Reference image from main canvas (bottom layer, locked) */
    referenceImage: HTMLImageElement | null
    /** Work-in-progress image (top layer, transformable) */
    wipImage: HTMLImageElement | null
    /** Opacity of WIP layer (0-100) */
    opacity: number
    /** Whether to render both images in grayscale */
    isGrayscale: boolean
    /** Current corner positions for perspective warp */
    cornerPositions: CornerPoints
    /** Container dimensions for scaling */
    containerSize: { width: number; height: number }
}

export default function CheckMyDrawingCanvas({
    referenceImage,
    wipImage,
    opacity,
    isGrayscale,
    cornerPositions,
    containerSize
}: CheckMyDrawingCanvasProps) {
    const refCanvasRef = useRef<HTMLCanvasElement>(null)
    const wipCanvasRef = useRef<HTMLCanvasElement>(null)

    // Calculate scale to fit reference image in container
    const imageScale = useMemo(() => {
        if (!referenceImage) return 1
        const scaleX = containerSize.width / referenceImage.width
        const scaleY = containerSize.height / referenceImage.height
        return Math.min(scaleX, scaleY, 1) // Don't upscale beyond 1
    }, [referenceImage, containerSize])

    // Scaled image dimensions
    const scaledDimensions = useMemo(() => {
        if (!referenceImage) return { width: containerSize.width, height: containerSize.height }
        return {
            width: referenceImage.width * imageScale,
            height: referenceImage.height * imageScale
        }
    }, [referenceImage, imageScale, containerSize])

    // Render reference image on canvas
    useEffect(() => {
        if (!refCanvasRef.current || !referenceImage) return

        const canvas = refCanvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set canvas size
        canvas.width = scaledDimensions.width
        canvas.height = scaledDimensions.height

        // Clear and draw
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (isGrayscale) {
            const grayscaleCanvas = createGrayscaleCanvas(referenceImage)
            ctx.drawImage(grayscaleCanvas, 0, 0, canvas.width, canvas.height)
        } else {
            ctx.drawImage(referenceImage, 0, 0, canvas.width, canvas.height)
        }
    }, [referenceImage, isGrayscale, scaledDimensions])

    // Render WIP image on canvas
    useEffect(() => {
        if (!wipCanvasRef.current || !wipImage) return

        const canvas = wipCanvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set canvas to match reference dimensions for proper alignment
        canvas.width = scaledDimensions.width
        canvas.height = scaledDimensions.height

        // Clear and draw
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (isGrayscale) {
            const grayscaleCanvas = createGrayscaleCanvas(wipImage)
            ctx.drawImage(grayscaleCanvas, 0, 0, canvas.width, canvas.height)
        } else {
            ctx.drawImage(wipImage, 0, 0, canvas.width, canvas.height)
        }
    }, [wipImage, isGrayscale, scaledDimensions])

    // Compute CSS transform for WIP layer
    const wipTransform = useMemo(() => {
        if (!wipImage) return ''

        // Use scaled dimensions for the transformation
        const defaultCorners = getDefaultCorners(scaledDimensions.width, scaledDimensions.height)

        // Check if corners have been modified from default
        const isDefault =
            cornerPositions.topLeft.x === defaultCorners.topLeft.x &&
            cornerPositions.topLeft.y === defaultCorners.topLeft.y &&
            cornerPositions.topRight.x === defaultCorners.topRight.x &&
            cornerPositions.topRight.y === defaultCorners.topRight.y &&
            cornerPositions.bottomLeft.x === defaultCorners.bottomLeft.x &&
            cornerPositions.bottomLeft.y === defaultCorners.bottomLeft.y &&
            cornerPositions.bottomRight.x === defaultCorners.bottomRight.x &&
            cornerPositions.bottomRight.y === defaultCorners.bottomRight.y

        if (isDefault) return ''

        return computeMatrix3d(cornerPositions, scaledDimensions.width, scaledDimensions.height)
    }, [wipImage, cornerPositions, scaledDimensions])

    // Center position in container
    const centerOffset = useMemo(() => ({
        x: (containerSize.width - scaledDimensions.width) / 2,
        y: (containerSize.height - scaledDimensions.height) / 2
    }), [containerSize, scaledDimensions])

    return (
        <div
            className="relative w-full h-full overflow-hidden bg-gray-900"
            style={{ minHeight: 200 }}
        >
            {/* Reference Image Layer (Bottom) */}
            {referenceImage && (
                <canvas
                    ref={refCanvasRef}
                    className="absolute"
                    style={{
                        left: centerOffset.x,
                        top: centerOffset.y,
                        width: scaledDimensions.width,
                        height: scaledDimensions.height,
                    }}
                />
            )}

            {/* WIP Image Layer (Top) with perspective transform */}
            {wipImage && (
                <canvas
                    ref={wipCanvasRef}
                    className="absolute"
                    style={{
                        left: centerOffset.x,
                        top: centerOffset.y,
                        width: scaledDimensions.width,
                        height: scaledDimensions.height,
                        opacity: opacity / 100,
                        transform: wipTransform,
                        transformOrigin: '0 0',
                        transition: 'opacity 0.1s ease-out',
                    }}
                />
            )}

            {/* Empty state when no reference */}
            {!referenceImage && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <p className="text-sm">No reference image loaded</p>
                    </div>
                </div>
            )}
        </div>
    )
}
