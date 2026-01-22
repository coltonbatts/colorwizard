'use client'

/**
 * RotationHandle - Circular rotation handle that appears above the WIP image.
 * Drag in circular motion to rotate the image.
 */

import { useState, useCallback, useRef } from 'react'

interface RotationHandleProps {
    /** Center position of the image in canvas coordinates */
    imageCenter: { x: number; y: number }
    /** Current rotation angle in degrees */
    currentRotation: number
    /** Callback when rotation changes */
    onRotationChange: (rotation: number) => void
    /** Offset above the image center for the handle position */
    offsetY?: number
    /** Canvas transform for converting coordinates */
    canvasTransform: { pan: { x: number; y: number }; zoom: number }
    /** Whether the handle is visible */
    visible: boolean
}

const HANDLE_SIZE = 24
const HIT_AREA_SIZE = 44

export default function RotationHandle({
    imageCenter,
    currentRotation,
    onRotationChange,
    offsetY = -60,
    canvasTransform,
    visible
}: RotationHandleProps) {
    const [isActive, setIsActive] = useState(false)
    const [showAngle, setShowAngle] = useState(false)

    const dragStartRef = useRef<{
        startAngle: number
        startRotation: number
    } | null>(null)

    // Calculate handle position in screen coordinates
    const handlePosition = {
        x: imageCenter.x * canvasTransform.zoom + canvasTransform.pan.x,
        y: (imageCenter.y + offsetY) * canvasTransform.zoom + canvasTransform.pan.y
    }

    // Calculate center of image in screen coordinates
    const imageCenterScreen = {
        x: imageCenter.x * canvasTransform.zoom + canvasTransform.pan.x,
        y: imageCenter.y * canvasTransform.zoom + canvasTransform.pan.y
    }

    // Calculate angle from image center to a point
    const getAngle = useCallback((x: number, y: number): number => {
        const deltaX = x - imageCenterScreen.x
        const deltaY = y - imageCenterScreen.y
        return Math.atan2(deltaY, deltaX) * (180 / Math.PI)
    }, [imageCenterScreen])

    // Handle pointer down
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        e.preventDefault()
        e.stopPropagation()

        const startAngle = getAngle(e.clientX, e.clientY)
        dragStartRef.current = {
            startAngle,
            startRotation: currentRotation
        }

        setIsActive(true)
        setShowAngle(true)
            ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
    }, [getAngle, currentRotation])

    // Handle pointer move
    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!dragStartRef.current) return
        e.preventDefault()

        const currentAngle = getAngle(e.clientX, e.clientY)
        const angleDelta = currentAngle - dragStartRef.current.startAngle
        let newRotation = dragStartRef.current.startRotation + angleDelta

        // Normalize to 0-360
        newRotation = ((newRotation % 360) + 360) % 360

        // Snap to 0, 45, 90, etc. when close (within 3 degrees)
        const snapAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360]
        for (const snap of snapAngles) {
            if (Math.abs(newRotation - snap) < 3) {
                newRotation = snap === 360 ? 0 : snap
                break
            }
        }

        onRotationChange(newRotation)
    }, [getAngle, onRotationChange])

    // Handle pointer up
    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        ; (e.target as HTMLElement).releasePointerCapture(e.pointerId)
        dragStartRef.current = null
        setIsActive(false)
        setShowAngle(false)
    }, [])

    if (!visible) return null

    return (
        <>
            {/* Line from image center to handle */}
            <svg
                className="absolute inset-0 pointer-events-none"
                style={{ overflow: 'visible' }}
            >
                <line
                    x1={imageCenterScreen.x}
                    y1={imageCenterScreen.y}
                    x2={handlePosition.x}
                    y2={handlePosition.y}
                    stroke="rgba(59, 130, 246, 0.5)"
                    strokeWidth="1"
                    strokeDasharray="4 2"
                />
            </svg>

            {/* Rotation handle */}
            <div
                className="absolute pointer-events-auto cursor-grab active:cursor-grabbing touch-none"
                style={{
                    left: handlePosition.x - HIT_AREA_SIZE / 2,
                    top: handlePosition.y - HIT_AREA_SIZE / 2,
                    width: HIT_AREA_SIZE,
                    height: HIT_AREA_SIZE,
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                {/* Visual handle */}
                <div
                    className={`absolute rounded-full transition-all duration-150 flex items-center justify-center ${isActive
                            ? 'bg-blue-500 shadow-lg shadow-blue-500/50 scale-125'
                            : 'bg-white border-2 border-blue-500 hover:bg-blue-100'
                        }`}
                    style={{
                        left: (HIT_AREA_SIZE - HANDLE_SIZE) / 2,
                        top: (HIT_AREA_SIZE - HANDLE_SIZE) / 2,
                        width: HANDLE_SIZE,
                        height: HANDLE_SIZE,
                    }}
                >
                    {/* Rotation icon */}
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={isActive ? 'white' : '#3B82F6'}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M21 12a9 9 0 1 1-9-9" />
                        <polyline points="21 3 21 9 15 9" />
                    </svg>
                </div>
            </div>

            {/* Angle indicator during drag */}
            {showAngle && (
                <div
                    className="absolute px-2 py-1 bg-black/80 text-white text-xs rounded font-mono pointer-events-none"
                    style={{
                        left: handlePosition.x + 20,
                        top: handlePosition.y - 10,
                    }}
                >
                    {Math.round(currentRotation)}°
                </div>
            )}
        </>
    )
}
