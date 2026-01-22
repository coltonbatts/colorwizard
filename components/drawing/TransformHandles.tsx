'use client'

/**
 * TransformHandles - Unified transform handles component.
 * Shows appropriate controls based on mode (basic, rotation, perspective).
 */

import { useCallback, useState, useRef, memo } from 'react'
import RotationHandle from './RotationHandle'

export type TransformMode = 'basic' | 'rotation' | 'perspective'

interface TransformHandlesProps {
    /** Type of image being transformed */
    imageType: 'reference' | 'wip'
    /** Image dimensions */
    imageDimensions: { width: number; height: number }
    /** Image position on canvas */
    imagePosition: { x: number; y: number }
    /** Image scale */
    imageScale: number
    /** Image rotation (WIP only) */
    imageRotation: number
    /** Transform mode */
    mode: TransformMode
    /** Whether the image is selected */
    isSelected: boolean
    /** Canvas transform for coordinate conversion */
    canvasTransform: { pan: { x: number; y: number }; zoom: number }
    /** Perspective corner positions */
    perspectiveCorners?: {
        topLeft: { x: number; y: number }
        topRight: { x: number; y: number }
        bottomLeft: { x: number; y: number }
        bottomRight: { x: number; y: number }
    } | null
    /** Callback when rotation changes */
    onRotationChange?: (rotation: number) => void
    /** Callback when perspective corner changes */
    onPerspectiveCornerChange?: (
        corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight',
        position: { x: number; y: number }
    ) => void
}

const CORNER_HANDLE_SIZE = 20
const HIT_AREA_SIZE = 44

function TransformHandles({
    imageType,
    imageDimensions,
    imagePosition,
    imageScale,
    imageRotation,
    mode,
    isSelected,
    canvasTransform,
    perspectiveCorners,
    onRotationChange,
    onPerspectiveCornerChange
}: TransformHandlesProps) {
    const [activeCorner, setActiveCorner] = useState<string | null>(null)
    const dragStartRef = useRef<{
        corner: string
        startPos: { x: number; y: number }
        startCorner: { x: number; y: number }
    } | null>(null)

    // Don't show handles if not selected
    if (!isSelected) return null

    // Calculate scaled dimensions
    const scaledWidth = imageDimensions.width * imageScale
    const scaledHeight = imageDimensions.height * imageScale

    // Calculate center of image
    const imageCenter = {
        x: imagePosition.x + scaledWidth / 2,
        y: imagePosition.y + scaledHeight / 2
    }

    // Convert canvas coords to screen coords
    const toScreen = useCallback((point: { x: number; y: number }) => ({
        x: point.x * canvasTransform.zoom + canvasTransform.pan.x,
        y: point.y * canvasTransform.zoom + canvasTransform.pan.y
    }), [canvasTransform])

    // Convert screen coords to canvas coords
    const toCanvas = useCallback((screenPoint: { x: number; y: number }) => ({
        x: (screenPoint.x - canvasTransform.pan.x) / canvasTransform.zoom,
        y: (screenPoint.y - canvasTransform.pan.y) / canvasTransform.zoom
    }), [canvasTransform])

    // Handle perspective corner drag
    const handleCornerPointerDown = useCallback((
        corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight',
        e: React.PointerEvent
    ) => {
        e.preventDefault()
        e.stopPropagation()

        if (!perspectiveCorners) return

        dragStartRef.current = {
            corner,
            startPos: { x: e.clientX, y: e.clientY },
            startCorner: { ...perspectiveCorners[corner] }
        }
        setActiveCorner(corner)
            ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
    }, [perspectiveCorners])

    const handleCornerPointerMove = useCallback((e: React.PointerEvent) => {
        if (!dragStartRef.current || !onPerspectiveCornerChange) return
        e.preventDefault()

        const { corner, startPos, startCorner } = dragStartRef.current
        const deltaX = (e.clientX - startPos.x) / canvasTransform.zoom
        const deltaY = (e.clientY - startPos.y) / canvasTransform.zoom

        onPerspectiveCornerChange(
            corner as 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight',
            {
                x: startCorner.x + deltaX,
                y: startCorner.y + deltaY
            }
        )
    }, [canvasTransform.zoom, onPerspectiveCornerChange])

    const handleCornerPointerUp = useCallback((e: React.PointerEvent) => {
        ; (e.target as HTMLElement).releasePointerCapture(e.pointerId)
        dragStartRef.current = null
        setActiveCorner(null)
    }, [])

    // Render perspective corners
    const renderPerspectiveCorners = () => {
        if (!perspectiveCorners) return null

        const corners: Array<'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'> =
            ['topLeft', 'topRight', 'bottomLeft', 'bottomRight']

        return (
            <>
                {/* Connection lines */}
                <svg className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
                    <polygon
                        points={corners.map(c => {
                            const screen = toScreen(perspectiveCorners[c])
                            return `${screen.x},${screen.y}`
                        }).join(' ')}
                        fill="none"
                        stroke="rgba(59, 130, 246, 0.5)"
                        strokeWidth="2"
                        strokeDasharray="6 4"
                    />
                </svg>

                {/* Corner handles */}
                {corners.map(corner => {
                    const screenPos = toScreen(perspectiveCorners[corner])
                    const isActive = activeCorner === corner

                    return (
                        <div
                            key={corner}
                            className="absolute pointer-events-auto cursor-grab active:cursor-grabbing touch-none"
                            style={{
                                left: screenPos.x - HIT_AREA_SIZE / 2,
                                top: screenPos.y - HIT_AREA_SIZE / 2,
                                width: HIT_AREA_SIZE,
                                height: HIT_AREA_SIZE,
                            }}
                            onPointerDown={(e) => handleCornerPointerDown(corner, e)}
                            onPointerMove={handleCornerPointerMove}
                            onPointerUp={handleCornerPointerUp}
                            onPointerCancel={handleCornerPointerUp}
                        >
                            <div
                                className={`absolute rounded-full transition-all duration-150 ${isActive
                                    ? 'bg-blue-500 shadow-lg shadow-blue-500/50 scale-125'
                                    : 'bg-white border-2 border-blue-500 hover:bg-blue-100'
                                    }`}
                                style={{
                                    left: (HIT_AREA_SIZE - CORNER_HANDLE_SIZE) / 2,
                                    top: (HIT_AREA_SIZE - CORNER_HANDLE_SIZE) / 2,
                                    width: CORNER_HANDLE_SIZE,
                                    height: CORNER_HANDLE_SIZE,
                                }}
                            />
                        </div>
                    )
                })}
            </>
        )
    }

    return (
        <div className="absolute inset-0 pointer-events-none">
            {/* Selection border (basic mode) */}
            {mode === 'basic' && (
                <svg className="absolute inset-0" style={{ overflow: 'visible' }}>
                    <rect
                        x={toScreen(imagePosition).x}
                        y={toScreen(imagePosition).y}
                        width={scaledWidth * canvasTransform.zoom}
                        height={scaledHeight * canvasTransform.zoom}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="2"
                        strokeDasharray="6 4"
                        style={{
                            transform: `rotate(${imageRotation}deg)`,
                            transformOrigin: `${toScreen(imageCenter).x}px ${toScreen(imageCenter).y}px`
                        }}
                    />
                </svg>
            )}

            {/* Rotation handle (rotation mode for WIP) */}
            {mode === 'rotation' && imageType === 'wip' && onRotationChange && (
                <RotationHandle
                    imageCenter={imageCenter}
                    currentRotation={imageRotation}
                    onRotationChange={onRotationChange}
                    canvasTransform={canvasTransform}
                    visible={true}
                />
            )}

            {/* Perspective corners (perspective mode for WIP) */}
            {mode === 'perspective' && imageType === 'wip' && perspectiveCorners && (
                renderPerspectiveCorners()
            )}
        </div>
    )
}

export default memo(TransformHandles)
