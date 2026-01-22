'use client'

/**
 * PerspectiveHandles - Enhanced draggable controls for perspective warp.
 * Features:
 * - Four corner handles for perspective adjustment
 * - Center handle for dragging/moving the entire WIP
 * - Edge handles for proportional scaling
 * - Validation to prevent corner crossing/distortion
 * - Touch-friendly with 44px minimum hit areas
 */

import { useRef, useCallback, useEffect, useState } from 'react'
import { CornerPoints, Point2D, constrainCorner, isValidQuadrilateral } from '@/lib/perspectiveWarp'

interface PerspectiveHandlesProps {
    /** Current corner positions */
    corners: CornerPoints
    /** Callback when corners change */
    onChange: (corners: CornerPoints, addToHistory?: boolean) => void
    /** Container element ref for coordinate calculations */
    containerRef: React.RefObject<HTMLDivElement>
    /** Whether handles should be visible */
    visible: boolean
}

type HandleType = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'center' | 'scale'

// Handle size and styling
const CORNER_HANDLE_SIZE = 20
const CENTER_HANDLE_SIZE = 32
const SCALE_HANDLE_SIZE = 16
const HIT_AREA_SIZE = 44 // Minimum touch target size

export default function PerspectiveHandles({
    corners,
    onChange,
    containerRef,
    visible
}: PerspectiveHandlesProps) {
    const [activeHandle, setActiveHandle] = useState<HandleType | null>(null)
    const dragStartRef = useRef<{
        handle: HandleType
        startPos: Point2D
        startCorners: CornerPoints
    } | null>(null)
    const lastValidCornersRef = useRef<CornerPoints>(corners)

    // Keep track of last valid corners
    useEffect(() => {
        if (isValidQuadrilateral(corners)) {
            lastValidCornersRef.current = corners
        }
    }, [corners])

    // Get container bounds for constraining handles
    const getContainerBounds = useCallback(() => {
        if (!containerRef.current) return { maxX: 1000, maxY: 1000 }
        const rect = containerRef.current.getBoundingClientRect()
        return { maxX: rect.width, maxY: rect.height }
    }, [containerRef])

    // Convert client coordinates to container-relative coordinates
    const clientToContainer = useCallback((clientX: number, clientY: number): Point2D => {
        if (!containerRef.current) return { x: clientX, y: clientY }
        const rect = containerRef.current.getBoundingClientRect()
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        }
    }, [containerRef])

    // Calculate center point of the quad
    const getCenter = useCallback((): Point2D => {
        return {
            x: (corners.topLeft.x + corners.topRight.x + corners.bottomLeft.x + corners.bottomRight.x) / 4,
            y: (corners.topLeft.y + corners.topRight.y + corners.bottomLeft.y + corners.bottomRight.y) / 4
        }
    }, [corners])

    // Handle mouse/touch start for corner
    const handleCornerPointerDown = useCallback((corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight', e: React.PointerEvent) => {
        e.preventDefault()
        e.stopPropagation()

        const pos = clientToContainer(e.clientX, e.clientY)
        dragStartRef.current = {
            handle: corner,
            startPos: pos,
            startCorners: { ...corners }
        }
        setActiveHandle(corner)
            ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
    }, [corners, clientToContainer])

    // Handle center drag start
    const handleCenterPointerDown = useCallback((e: React.PointerEvent) => {
        e.preventDefault()
        e.stopPropagation()

        const pos = clientToContainer(e.clientX, e.clientY)
        dragStartRef.current = {
            handle: 'center',
            startPos: pos,
            startCorners: {
                topLeft: { ...corners.topLeft },
                topRight: { ...corners.topRight },
                bottomLeft: { ...corners.bottomLeft },
                bottomRight: { ...corners.bottomRight }
            }
        }
        setActiveHandle('center')
            ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
    }, [corners, clientToContainer])

    // Handle scale drag start
    const handleScalePointerDown = useCallback((e: React.PointerEvent) => {
        e.preventDefault()
        e.stopPropagation()

        const pos = clientToContainer(e.clientX, e.clientY)
        dragStartRef.current = {
            handle: 'scale',
            startPos: pos,
            startCorners: {
                topLeft: { ...corners.topLeft },
                topRight: { ...corners.topRight },
                bottomLeft: { ...corners.bottomLeft },
                bottomRight: { ...corners.bottomRight }
            }
        }
        setActiveHandle('scale')
            ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
    }, [corners, clientToContainer])

    // Handle mouse/touch move
    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!dragStartRef.current) return
        e.preventDefault()

        const { handle, startPos, startCorners } = dragStartRef.current
        const currentPos = clientToContainer(e.clientX, e.clientY)
        const bounds = getContainerBounds()
        const deltaX = currentPos.x - startPos.x
        const deltaY = currentPos.y - startPos.y

        let newCorners: CornerPoints

        if (handle === 'center') {
            // Move all corners together
            newCorners = {
                topLeft: constrainCorner({
                    x: startCorners.topLeft.x + deltaX,
                    y: startCorners.topLeft.y + deltaY
                }, bounds),
                topRight: constrainCorner({
                    x: startCorners.topRight.x + deltaX,
                    y: startCorners.topRight.y + deltaY
                }, bounds),
                bottomLeft: constrainCorner({
                    x: startCorners.bottomLeft.x + deltaX,
                    y: startCorners.bottomLeft.y + deltaY
                }, bounds),
                bottomRight: constrainCorner({
                    x: startCorners.bottomRight.x + deltaX,
                    y: startCorners.bottomRight.y + deltaY
                }, bounds)
            }
        } else if (handle === 'scale') {
            // Scale from center
            const center = {
                x: (startCorners.topLeft.x + startCorners.topRight.x + startCorners.bottomLeft.x + startCorners.bottomRight.x) / 4,
                y: (startCorners.topLeft.y + startCorners.topRight.y + startCorners.bottomLeft.y + startCorners.bottomRight.y) / 4
            }

            // Calculate scale factor based on diagonal movement
            const startDist = Math.sqrt(
                Math.pow(startPos.x - center.x, 2) +
                Math.pow(startPos.y - center.y, 2)
            )
            const currentDist = Math.sqrt(
                Math.pow(currentPos.x - center.x, 2) +
                Math.pow(currentPos.y - center.y, 2)
            )
            const scale = startDist > 0 ? currentDist / startDist : 1
            const clampedScale = Math.max(0.1, Math.min(3, scale))

            newCorners = {
                topLeft: constrainCorner({
                    x: center.x + (startCorners.topLeft.x - center.x) * clampedScale,
                    y: center.y + (startCorners.topLeft.y - center.y) * clampedScale
                }, bounds),
                topRight: constrainCorner({
                    x: center.x + (startCorners.topRight.x - center.x) * clampedScale,
                    y: center.y + (startCorners.topRight.y - center.y) * clampedScale
                }, bounds),
                bottomLeft: constrainCorner({
                    x: center.x + (startCorners.bottomLeft.x - center.x) * clampedScale,
                    y: center.y + (startCorners.bottomLeft.y - center.y) * clampedScale
                }, bounds),
                bottomRight: constrainCorner({
                    x: center.x + (startCorners.bottomRight.x - center.x) * clampedScale,
                    y: center.y + (startCorners.bottomRight.y - center.y) * clampedScale
                }, bounds)
            }
        } else {
            // Move single corner
            const newCorner = constrainCorner({
                x: startCorners[handle].x + deltaX,
                y: startCorners[handle].y + deltaY
            }, bounds)

            newCorners = {
                ...corners,
                [handle]: newCorner
            }
        }

        // Validate the new corners to prevent crossing/distortion
        if (isValidQuadrilateral(newCorners)) {
            onChange(newCorners, false) // Don't add to history during drag
        }
        // If invalid, keep the last valid state (don't update)
    }, [corners, onChange, clientToContainer, getContainerBounds])

    // Handle mouse/touch end
    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (dragStartRef.current) {
            ; (e.target as HTMLElement).releasePointerCapture(e.pointerId)
            // Add to history when drag ends
            onChange(corners, true)
        }
        dragStartRef.current = null
        setActiveHandle(null)
    }, [corners, onChange])

    // Handle touch events for mobile
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const preventTouchDefault = (e: TouchEvent) => {
            if (activeHandle) {
                e.preventDefault()
            }
        }

        container.addEventListener('touchmove', preventTouchDefault, { passive: false })
        return () => container.removeEventListener('touchmove', preventTouchDefault)
    }, [containerRef, activeHandle])

    if (!visible) return null

    const cornerKeys: Array<'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'> = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight']
    const center = getCenter()

    // Calculate scale handle position (bottom-right of center)
    const scaleHandlePos = {
        x: corners.bottomRight.x,
        y: corners.bottomRight.y
    }

    return (
        <div className="absolute inset-0 pointer-events-none">
            {/* Connection lines between corners */}
            <svg className="absolute inset-0 w-full h-full">
                <polygon
                    points={`${corners.topLeft.x},${corners.topLeft.y} ${corners.topRight.x},${corners.topRight.y} ${corners.bottomRight.x},${corners.bottomRight.y} ${corners.bottomLeft.x},${corners.bottomLeft.y}`}
                    fill="none"
                    stroke="rgba(59, 130, 246, 0.5)"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                />
                {/* Crosshair at center */}
                <line
                    x1={center.x - 15} y1={center.y}
                    x2={center.x + 15} y2={center.y}
                    stroke="rgba(59, 130, 246, 0.3)"
                    strokeWidth="1"
                />
                <line
                    x1={center.x} y1={center.y - 15}
                    x2={center.x} y2={center.y + 15}
                    stroke="rgba(59, 130, 246, 0.3)"
                    strokeWidth="1"
                />
            </svg>

            {/* Center handle for moving */}
            <div
                className="absolute pointer-events-auto cursor-move touch-none"
                style={{
                    left: center.x - HIT_AREA_SIZE / 2,
                    top: center.y - HIT_AREA_SIZE / 2,
                    width: HIT_AREA_SIZE,
                    height: HIT_AREA_SIZE,
                }}
                onPointerDown={handleCenterPointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                <div
                    className={`absolute rounded-lg transition-all duration-150 flex items-center justify-center ${activeHandle === 'center'
                            ? 'bg-blue-500 shadow-lg shadow-blue-500/50 scale-110'
                            : 'bg-white/90 border-2 border-blue-500 hover:bg-blue-100'
                        }`}
                    style={{
                        left: (HIT_AREA_SIZE - CENTER_HANDLE_SIZE) / 2,
                        top: (HIT_AREA_SIZE - CENTER_HANDLE_SIZE) / 2,
                        width: CENTER_HANDLE_SIZE,
                        height: CENTER_HANDLE_SIZE,
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={activeHandle === 'center' ? 'white' : '#3B82F6'} strokeWidth="2">
                        <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3" />
                    </svg>
                </div>
            </div>

            {/* Scale handle (bottom-right) */}
            <div
                className="absolute pointer-events-auto cursor-nwse-resize touch-none"
                style={{
                    left: scaleHandlePos.x - HIT_AREA_SIZE / 2 + 20,
                    top: scaleHandlePos.y - HIT_AREA_SIZE / 2 + 20,
                    width: HIT_AREA_SIZE,
                    height: HIT_AREA_SIZE,
                }}
                onPointerDown={handleScalePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                <div
                    className={`absolute rounded transition-all duration-150 flex items-center justify-center ${activeHandle === 'scale'
                            ? 'bg-green-500 shadow-lg shadow-green-500/50 scale-125'
                            : 'bg-white border-2 border-green-500 hover:bg-green-100'
                        }`}
                    style={{
                        left: (HIT_AREA_SIZE - SCALE_HANDLE_SIZE) / 2,
                        top: (HIT_AREA_SIZE - SCALE_HANDLE_SIZE) / 2,
                        width: SCALE_HANDLE_SIZE,
                        height: SCALE_HANDLE_SIZE,
                    }}
                >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={activeHandle === 'scale' ? 'white' : '#22C55E'} strokeWidth="3">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                </div>
            </div>

            {/* Corner handles */}
            {cornerKeys.map((key) => {
                const corner = corners[key]
                const isActive = activeHandle === key

                return (
                    <div
                        key={key}
                        className="absolute pointer-events-auto cursor-grab active:cursor-grabbing touch-none"
                        style={{
                            left: corner.x - HIT_AREA_SIZE / 2,
                            top: corner.y - HIT_AREA_SIZE / 2,
                            width: HIT_AREA_SIZE,
                            height: HIT_AREA_SIZE,
                        }}
                        onPointerDown={(e) => handleCornerPointerDown(key, e)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                    >
                        {/* Visual handle (smaller than hit area) */}
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
        </div>
    )
}
