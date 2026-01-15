'use client'

import { useMemo, useState } from 'react'
import { CalibrationData, pxToInches, inchesToCm, imageToScreen, TransformState, imageToCanvasUnits } from '@/lib/calibration'
import { MeasurementLayer } from '@/lib/types/measurement'
import { CanvasSettings } from '@/lib/types/canvas'

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
    /** External measurement points in IMAGE-SPACE (controlled mode) */
    measurePointA?: Point | null
    measurePointB?: Point | null
    /** Current transform state (zoom and pan) for rendering canvas-space points to screen */
    transformState?: TransformState
    /** Current measurement layer (reference or painting) */
    measurementLayer?: MeasurementLayer
    /** The image being measured (for original dimensions) */
    image?: HTMLImageElement | null
    /** Canvas settings for real-world scaling */
    canvasSettings?: CanvasSettings
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
    measurementLayer,
    image,
    canvasSettings
}: RulerOverlayProps) {
    // Internal state for uncontrolled mode
    const [internalPointA, setInternalPointA] = useState<Point | null>(null)
    const [internalPointB, setInternalPointB] = useState<Point | null>(null)

    // Use external or internal state (image-space coordinates)
    const pointA = externalPointA !== undefined ? externalPointA : internalPointA
    const pointB = externalPointB !== undefined ? externalPointB : internalPointB

    // Default transform state (no zoom/pan)
    const transform: TransformState = transformState || { zoomLevel: 1, panOffset: { x: 0, y: 0 } }

    // Convert image-space points to screen-space for rendering
    const screenPointA = useMemo(() => {
        if (!pointA || !image) return null
        return imageToScreen(pointA.x, pointA.y, transform, image.width, image.height)
    }, [pointA, transform, image])

    const screenPointB = useMemo(() => {
        if (!pointB || !image) return null
        return imageToScreen(pointB.x, pointB.y, transform, image.width, image.height)
    }, [pointB, transform, image])

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
        if (!gridEnabled || !calibration || !transform.imageDrawInfo || !image) return {}

        // Scale grid spacing to current image fit scale
        const spacingPx = gridSpacing * calibration.pxPerInch

        // The grid should be aligned with the image's top-left corner
        const gridX = (transform.imageDrawInfo.x * transform.zoomLevel) + transform.panOffset.x
        const gridY = (transform.imageDrawInfo.y * transform.zoomLevel) + transform.panOffset.y

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
            backgroundSize: `${spacingPx}px ${spacingPx}px`,
            backgroundPosition: `${gridX}px ${gridY}px`
        }
    }, [gridEnabled, calibration, gridSpacing, transform, image])

    // Calculate distance between points (in image-space for accurate measurement)
    const measurementInfo = useMemo(() => {
        if (!pointA || !pointB || !calibration || !image || !transform.imageDrawInfo) return null

        // Distance in image pixels
        const distanceImagePx = Math.sqrt(
            Math.pow(pointB.x - pointA.x, 2) + Math.pow(pointB.y - pointA.y, 2)
        )

        // Convert image pixels to fitted canvas pixels
        const fitScale = transform.imageDrawInfo.width / image.width
        const distanceFittedPx = distanceImagePx * fitScale

        let distanceInches = pxToInches(distanceFittedPx, calibration)

        // Override with canvas-relative measurement if enabled
        if (canvasSettings?.enabled) {
            // We use the width as the reference for scaling
            // Units can be inches or cm
            const distanceUnits = imageToCanvasUnits(distanceImagePx, image.width, canvasSettings.width)

            if (canvasSettings.unit === 'in') {
                distanceInches = distanceUnits
            } else {
                // Convert cm to inches internally for the rest of the logic
                distanceInches = distanceUnits / 2.54
            }
        }

        const distanceCm = inchesToCm(distanceInches)

        // Midpoint in screen-space (for label positioning)
        const midX = screenPointA && screenPointB ? (screenPointA.x + screenPointB.x) / 2 : 0
        const midY = screenPointA && screenPointB ? (screenPointA.y + screenPointB.y) / 2 : 0

        // Angle for line rotation (not used for SVG line, but could be useful)
        const angle = Math.atan2(pointB.y - pointA.y, pointB.x - pointA.x) * (180 / Math.PI)

        return {
            distanceImagePx,
            distanceInches,
            distanceCm,
            midX,
            midY,
            angle
        }
    }, [pointA, pointB, calibration, screenPointA, screenPointB, image, transform.imageDrawInfo])

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
