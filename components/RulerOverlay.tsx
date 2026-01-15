'use client'

import { useMemo, useState } from 'react'
import { CalibrationData, pxToInches, inchesToCm, canvasToScreen, TransformState } from '@/lib/calibration'
import { MeasurementLayer } from '@/lib/types/measurement'

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
    /** External measurement points in CANVAS-SPACE (controlled mode) */
    measurePointA?: Point | null
    measurePointB?: Point | null
    /** Current transform state (zoom and pan) for rendering canvas-space points to screen */
    transformState?: TransformState
    /** Current measurement layer (reference or painting) */
    measurementLayer?: MeasurementLayer
}

/** Get color based on measurement layer */
function getLayerColor(layer: MeasurementLayer | undefined): string {
    switch (layer) {
        case 'reference': return '#3b82f6' // Blue
        case 'painting': return '#ef4444'  // Red
        default: return '#3b82f6' // Default blue
    }
}

/** Get layer label for display */
function getLayerLabel(layer: MeasurementLayer | undefined): string {
    switch (layer) {
        case 'reference': return 'Reference'
        case 'painting': return 'Painting'
        default: return ''
    }
}

export default function RulerOverlay({
    gridEnabled,
    gridSpacing,
    calibration,
    measureEnabled,
    measurePointA: externalPointA,
    measurePointB: externalPointB,
    onMeasurePointsChange,
    transformState,
    measurementLayer
}: RulerOverlayProps) {
    // Internal state for uncontrolled mode
    const [internalPointA, setInternalPointA] = useState<Point | null>(null)
    const [internalPointB, setInternalPointB] = useState<Point | null>(null)

    // Use external or internal state (canvas-space coordinates)
    const pointA = externalPointA !== undefined ? externalPointA : internalPointA
    const pointB = externalPointB !== undefined ? externalPointB : internalPointB

    // Default transform state (no zoom/pan)
    const transform: TransformState = transformState || { zoomLevel: 1, panOffset: { x: 0, y: 0 } }

    // Convert canvas-space points to screen-space for rendering
    const screenPointA = useMemo(() => {
        if (!pointA) return null
        return canvasToScreen(pointA.x, pointA.y, transform)
    }, [pointA, transform])

    const screenPointB = useMemo(() => {
        if (!pointB) return null
        return canvasToScreen(pointB.x, pointB.y, transform)
    }, [pointB, transform])

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

    // Calculate distance between points (in canvas-space for accurate measurement)
    const measurementInfo = useMemo(() => {
        if (!pointA || !pointB || !calibration) return null

        // Distance is calculated in canvas-space (transform-invariant)
        const distancePx = Math.sqrt(
            Math.pow(pointB.x - pointA.x, 2) + Math.pow(pointB.y - pointA.y, 2)
        )

        const distanceInches = pxToInches(distancePx, calibration)
        const distanceCm = inchesToCm(distanceInches)

        // Midpoint in screen-space (for label positioning)
        const midX = screenPointA && screenPointB ? (screenPointA.x + screenPointB.x) / 2 : 0
        const midY = screenPointA && screenPointB ? (screenPointA.y + screenPointB.y) / 2 : 0

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
    }, [pointA, pointB, calibration, screenPointA, screenPointB])

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

    const layerColor = getLayerColor(measurementLayer)
    const layerLabel = getLayerLabel(measurementLayer)

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
            {measureEnabled && (screenPointA || screenPointB) && (
                <svg
                    className="absolute inset-0 pointer-events-none"
                    style={{ width: '100%', height: '100%' }}
                >
                    {/* Line between points */}
                    {screenPointA && screenPointB && (
                        <>
                            <line
                                x1={screenPointA.x}
                                y1={screenPointA.y}
                                x2={screenPointB.x}
                                y2={screenPointB.y}
                                stroke={layerColor}
                                strokeWidth="2"
                                strokeDasharray="6 4"
                            />
                            {/* End markers */}
                            <circle cx={screenPointA.x} cy={screenPointA.y} r="6" fill={layerColor} stroke="#fff" strokeWidth="2" />
                            <circle cx={screenPointB.x} cy={screenPointB.y} r="6" fill={layerColor} stroke="#fff" strokeWidth="2" />
                        </>
                    )}

                    {/* Single point marker when only A is set */}
                    {screenPointA && !screenPointB && (
                        <circle cx={screenPointA.x} cy={screenPointA.y} r="6" fill={layerColor} stroke="#fff" strokeWidth="2" />
                    )}
                </svg>
            )}

            {/* Distance Label */}
            {measureEnabled && measurementInfo && screenPointA && screenPointB && (
                <div
                    className="absolute pointer-events-none bg-gray-900/90 text-white px-3 py-2 rounded-lg text-sm font-mono shadow-lg border border-gray-700"
                    style={{
                        left: measurementInfo.midX,
                        top: measurementInfo.midY - 50,
                        transform: 'translateX(-50%)',
                        borderColor: layerColor
                    }}
                >
                    {layerLabel && (
                        <div className="text-xs mb-1" style={{ color: layerColor }}>
                            {layerLabel}
                        </div>
                    )}
                    <div className="font-semibold" style={{ color: layerColor }}>
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
