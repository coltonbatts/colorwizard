'use client'

/**
 * CanvasImage - Individual image layer component on the infinite canvas.
 * Handles rendering with scale, rotation, and perspective warp.
 */

import { useMemo, memo } from 'react'
import { computeMatrix3d } from '@/lib/perspectiveWarp'

export interface CanvasImageProps {
    /** The image element to render */
    image: HTMLImageElement
    /** Transform state */
    transform: {
        position: { x: number; y: number }
        scale: number
        rotation: number
        opacity: number
        perspectiveEnabled: boolean
        perspectiveCorners: {
            topLeft: { x: number; y: number }
            topRight: { x: number; y: number }
            bottomLeft: { x: number; y: number }
            bottomRight: { x: number; y: number }
        } | null
    }
    /** Whether the image is selected */
    isSelected: boolean
    /** Whether this is a reference image (no perspective/rotation) */
    isReference: boolean
    /** Whether grayscale mode is enabled */
    isGrayscale: boolean
    /** Z-index for layering */
    zIndex: number
    /** Pointer event handler */
    onPointerDown?: (e: React.PointerEvent) => void
}

function CanvasImage({
    image,
    transform,
    isSelected,
    isReference,
    isGrayscale,
    zIndex,
    onPointerDown
}: CanvasImageProps) {
    const { position, scale, rotation, opacity, perspectiveEnabled, perspectiveCorners } = transform

    // Compute transform styles
    const styles = useMemo(() => {
        const s: React.CSSProperties = {
            position: 'absolute',
            left: 0,
            top: 0,
            width: image.width,
            height: image.height,
            zIndex,
            opacity: isReference ? 1 : opacity,
            filter: isGrayscale ? 'grayscale(100%)' : 'none',
            transformOrigin: '0 0',
            pointerEvents: 'auto',
            cursor: isSelected ? 'grab' : 'pointer',
        }

        let transformStr = `translate(${position.x}px, ${position.y}px)`

        if (perspectiveEnabled && perspectiveCorners && !isReference) {
            // Perspective warp uses matrix3d which defines the entire transform from source to quad
            const matrix = computeMatrix3d(perspectiveCorners, image.width, image.height)
            s.transform = `${transformStr} ${matrix}`
        } else {
            // Standard transform
            transformStr += ` scale(${scale})`
            if (!isReference && rotation !== 0) {
                transformStr += ` rotate(${rotation}deg)`
            }
            s.transform = transformStr
        }

        return s
    }, [image, position, scale, rotation, opacity, perspectiveEnabled, perspectiveCorners, isReference, isGrayscale, zIndex, isSelected])

    return (
        <div
            style={styles}
            onPointerDown={onPointerDown}
            className={isSelected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent' : ''}
        >
            <img
                src={image.src}
                alt={isReference ? 'Reference' : 'WIP'}
                className="w-full h-full object-contain pointer-events-none"
                draggable={false}
            />
        </div>
    )
}

export default memo(CanvasImage)
