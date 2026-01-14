'use client'

import { useMemo, useState } from 'react'
import { CalibrationData, pxToInches, inchesToCm } from '@/lib/calibration'

interface Point {
    x: number
    y: number
}

interface RulerOverlayProps {
    /** Whether ruler grid is enabled */
    gridEnabled: boolean
    /** Grid spacing in inches */
    gridSpacing: 0.25 | 0.5 | 1 | 2
    /** Calibration data (required for ruler to show) */
    calibration: CalibrationData | null
    /** Whether measurement mode is enabled */
    measureEnabled: boolean
    /** Container dimensions for the overlay */
    containerRef: React.RefObject<HTMLDivElement>
    /** Callback when measurement points change (for external state management) */
    onMeasurePointsChange?: (pointA: Point | null, pointB: Point | null) => void
    /** External measurement points (controlled mode) */
    measurePointA?: Point | null
    measurePointB?: Point | null
}

export default function RulerOverlay({
    gridEnabled,
    gridSpacing,
    calibration,
    measureEnabled,
    measurePointA: externalPointA,
    measurePointB: externalPointB,
    onMeasurePointsChange
}: RulerOverlayProps) {
    // Internal state for uncontrolled mode
    const [internalPointA, setInternalPointA] = useState<Point | null>(null)
    const [internalPointB, setInternalPointB] = useState<Point | null>(null)

    // Use external or internal state
    const pointA = externalPointA !== undefined ? externalPointA : internalPointA
    const pointB = externalPointB !== undefined ? externalPointB : internalPointB

    const setPointA = (p: Point | null) => {
        if (onMeasurePointsChange) {
            onMeasurePointsChange(p, pointB ?? null)
        } else {
            setInternalPointA(p)
        }
    }

    const setPointB = (p: Point | null) => {
        if (onMeasurePointsChange) {
            onMeasurePointsChange(pointA ?? null, p)
        } else {
            setInternalPointB(p)
        }
    }

    // Calculate grid pattern
    const gridStyle = useMemo(() => {
        if (!gridEnabled || !calibration) return {}

        const spacingPx = gridSpacing * calibration.pxPerInch

        return {
            backgroundImage: `
        repeating-linear-gradient(
          to right,
          rgba(255, 255, 255, 0.15) 0px,
          rgba(255, 255, 255, 0.15) 1px,
          transparent 1px,
          transparent ${spacingPx}px
        ),
        repeating-linear-gradient(
          to bottom,
          rgba(255, 255, 255, 0.15) 0px,
          rgba(255, 255, 255, 0.15) 1px,
          transparent 1px,
          transparent ${spacingPx}px
        )
      `.replace(/\s+/g, ' '),
            backgroundSize: `${spacingPx}px ${spacingPx}px`
        }
    }, [gridEnabled, calibration, gridSpacing])

    // Calculate distance between points
    const measurementInfo = useMemo(() => {
        if (!pointA || !pointB || !calibration) return null

        const distancePx = Math.sqrt(
            Math.pow(pointB.x - pointA.x, 2) + Math.pow(pointB.y - pointA.y, 2)
        )

        const distanceInches = pxToInches(distancePx, calibration)
        const distanceCm = inchesToCm(distanceInches)

        // Midpoint for label positioning
        const midX = (pointA.x + pointB.x) / 2
        const midY = (pointA.y + pointB.y) / 2

        // Angle for line rotation (not used for SVG line, but could be useful)
        const angle = Math.atan2(pointB.y - pointA.y, pointB.x - pointA.x) * (180 / Math.PI)

        return {
            distancePx,
            distanceInches,
            distanceCm,
            midX,
            midY,
            angle
        }
    }, [pointA, pointB, calibration])

    const clearMeasurement = () => {
        if (onMeasurePointsChange) {
            onMeasurePointsChange(null, null)
        } else {
            setInternalPointA(null)
            setInternalPointB(null)
        }
    }

    // Don't render if neither grid nor measure is enabled
    if (!gridEnabled && !measureEnabled) return null

    // Need calibration for anything to work
    if (!calibration) return null

    return (
        <>
            {/* Grid Overlay - uses CSS gradient */}
            {gridEnabled && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={gridStyle}
                />
            )}

            {/* Measurement Overlay - uses SVG for the line */}
            {measureEnabled && (pointA || pointB) && (
                <svg
                    className="absolute inset-0 pointer-events-none"
                    style={{ width: '100%', height: '100%' }}
                >
                    {/* Line between points */}
                    {pointA && pointB && (
                        <>
                            <line
                                x1={pointA.x}
                                y1={pointA.y}
                                x2={pointB.x}
                                y2={pointB.y}
                                stroke="#3b82f6"
                                strokeWidth="2"
                                strokeDasharray="6 4"
                            />
                            {/* End markers */}
                            <circle cx={pointA.x} cy={pointA.y} r="6" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
                            <circle cx={pointB.x} cy={pointB.y} r="6" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
                        </>
                    )}

                    {/* Single point marker when only A is set */}
                    {pointA && !pointB && (
                        <circle cx={pointA.x} cy={pointA.y} r="6" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
                    )}
                </svg>
            )}

            {/* Distance Label */}
            {measureEnabled && measurementInfo && (
                <div
                    className="absolute pointer-events-none bg-gray-900/90 text-white px-3 py-2 rounded-lg text-sm font-mono shadow-lg border border-gray-700"
                    style={{
                        left: measurementInfo.midX,
                        top: measurementInfo.midY - 40,
                        transform: 'translateX(-50%)'
                    }}
                >
                    <div className="text-blue-400 font-semibold">
                        {measurementInfo.distanceInches.toFixed(2)}&quot;
                    </div>
                    <div className="text-gray-400 text-xs">
                        {measurementInfo.distanceCm.toFixed(1)} cm
                    </div>
                </div>
            )}

            {/* Clear button when measurement exists */}
            {measureEnabled && (pointA || pointB) && (
                <button
                    onClick={clearMeasurement}
                    className="absolute top-2 right-2 px-3 py-1 bg-gray-800/90 hover:bg-gray-700 text-gray-300 text-xs rounded-md border border-gray-600 transition-colors pointer-events-auto"
                >
                    Clear Measurement
                </button>
            )}
        </>
    )
}
