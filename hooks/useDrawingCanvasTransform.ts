'use client'

/**
 * useDrawingCanvasTransform - Hook for infinite canvas viewport in Check My Drawing.
 * Handles pan (spacebar+drag) and zoom (scroll wheel/pinch) for the drawing canvas.
 * Separate from the main useCanvasTransform to avoid conflicts.
 */

import { useState, useCallback, useRef, useEffect } from 'react'

export interface DrawingCanvasTransform {
    /** Canvas pan offset in pixels */
    pan: { x: number; y: number }
    /** Zoom level (0.25 = 25%, 1 = 100%, 4 = 400%) */
    zoom: number
}

export interface UseDrawingCanvasTransformOptions {
    /** Minimum zoom level (default: 0.25) */
    minZoom?: number
    /** Maximum zoom level (default: 4) */
    maxZoom?: number
    /** Initial transform state */
    initialTransform?: DrawingCanvasTransform
}

export interface UseDrawingCanvasTransformReturn {
    /** Current transform state */
    transform: DrawingCanvasTransform
    /** Whether spacebar is held (pan mode active) */
    isPanMode: boolean
    /** Whether currently dragging to pan */
    isDragging: boolean
    /** Set pan position */
    setPan: (pan: { x: number; y: number }) => void
    /** Set zoom level */
    setZoom: (zoom: number) => void
    /** Zoom at a specific point (for scroll wheel zoom) */
    zoomAtPoint: (delta: number, point: { x: number; y: number }) => void
    /** Reset to default view (centered, 100% zoom) */
    resetView: () => void
    /** Fit content to viewport */
    fitToView: (contentBounds: { width: number; height: number }, viewportSize: { width: number; height: number }) => void
    /** Start panning (call on mousedown when in pan mode) */
    startPan: (clientX: number, clientY: number) => void
    /** Update pan (call on mousemove when panning) */
    updatePan: (clientX: number, clientY: number) => void
    /** End panning */
    endPan: () => void
    /** Handle wheel event */
    handleWheel: (e: WheelEvent, containerRect: DOMRect) => void
    /** Handle pinch zoom */
    handlePinch: (distance: number, center: { x: number; y: number }) => void
    /** Start pinch tracking */
    startPinch: (distance: number, center: { x: number; y: number }) => void
    /** End pinch */
    endPinch: () => void
}

const DEFAULT_TRANSFORM: DrawingCanvasTransform = {
    pan: { x: 0, y: 0 },
    zoom: 1
}

export function useDrawingCanvasTransform(
    options: UseDrawingCanvasTransformOptions = {}
): UseDrawingCanvasTransformReturn {
    const {
        minZoom = 0.25,
        maxZoom = 4,
        initialTransform = DEFAULT_TRANSFORM
    } = options

    const [transform, setTransform] = useState<DrawingCanvasTransform>(initialTransform)
    const [isPanMode, setIsPanMode] = useState(false)
    const [isDragging, setIsDragging] = useState(false)

    // Track drag start position
    const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)

    // Track pinch zoom
    const lastPinchDistanceRef = useRef<number | null>(null)
    const lastPinchCenterRef = useRef<{ x: number; y: number } | null>(null)

    // Handle spacebar for pan mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't activate pan mode if user is typing in an input
            const target = e.target as HTMLElement
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return
            }

            if (e.code === 'Space' && !e.repeat) {
                e.preventDefault()
                setIsPanMode(true)
            }
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsPanMode(false)
                setIsDragging(false)
                dragStartRef.current = null
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, [])

    // Set pan position
    const setPan = useCallback((pan: { x: number; y: number }) => {
        setTransform(prev => ({ ...prev, pan }))
    }, [])

    // Set zoom level
    const setZoom = useCallback((zoom: number) => {
        setTransform(prev => ({
            ...prev,
            zoom: Math.max(minZoom, Math.min(maxZoom, zoom))
        }))
    }, [minZoom, maxZoom])

    // Zoom at a specific point (maintains point under cursor)
    const zoomAtPoint = useCallback((delta: number, point: { x: number; y: number }) => {
        setTransform(prev => {
            const zoomFactor = delta > 0 ? 0.9 : 1.1
            const newZoom = Math.max(minZoom, Math.min(maxZoom, prev.zoom * zoomFactor))

            if (newZoom === prev.zoom) return prev

            // Calculate new pan to keep the point stationary
            const zoomRatio = newZoom / prev.zoom
            const newPanX = point.x - (point.x - prev.pan.x) * zoomRatio
            const newPanY = point.y - (point.y - prev.pan.y) * zoomRatio

            return {
                pan: { x: newPanX, y: newPanY },
                zoom: newZoom
            }
        })
    }, [minZoom, maxZoom])

    // Reset to default view
    const resetView = useCallback(() => {
        setTransform(DEFAULT_TRANSFORM)
    }, [])

    // Fit content to viewport
    const fitToView = useCallback((
        contentBounds: { width: number; height: number },
        viewportSize: { width: number; height: number }
    ) => {
        const padding = 40 // Padding around content
        const availableWidth = viewportSize.width - padding * 2
        const availableHeight = viewportSize.height - padding * 2

        const scaleX = availableWidth / contentBounds.width
        const scaleY = availableHeight / contentBounds.height
        const zoom = Math.min(scaleX, scaleY, 1) // Don't zoom in beyond 100%

        // Center the content
        const panX = (viewportSize.width - contentBounds.width * zoom) / 2
        const panY = (viewportSize.height - contentBounds.height * zoom) / 2

        setTransform({ pan: { x: panX, y: panY }, zoom })
    }, [])

    // Pan handlers
    const startPan = useCallback((clientX: number, clientY: number) => {
        setIsDragging(true)
        dragStartRef.current = {
            x: clientX,
            y: clientY,
            panX: transform.pan.x,
            panY: transform.pan.y
        }
    }, [transform.pan])

    const updatePan = useCallback((clientX: number, clientY: number) => {
        if (!isDragging || !dragStartRef.current) return

        const deltaX = clientX - dragStartRef.current.x
        const deltaY = clientY - dragStartRef.current.y
        setPan({
            x: dragStartRef.current.panX + deltaX,
            y: dragStartRef.current.panY + deltaY
        })
    }, [isDragging, setPan])

    const endPan = useCallback(() => {
        setIsDragging(false)
        dragStartRef.current = null
    }, [])

    // Wheel handler for zoom
    const handleWheel = useCallback((e: WheelEvent, containerRect: DOMRect) => {
        e.preventDefault()
        const point = {
            x: e.clientX - containerRect.left,
            y: e.clientY - containerRect.top
        }
        zoomAtPoint(e.deltaY, point)
    }, [zoomAtPoint])

    // Pinch handlers
    const startPinch = useCallback((distance: number, center: { x: number; y: number }) => {
        lastPinchDistanceRef.current = distance
        lastPinchCenterRef.current = center
    }, [])

    const handlePinch = useCallback((distance: number, center: { x: number; y: number }) => {
        if (!lastPinchDistanceRef.current || !lastPinchCenterRef.current) return

        const scale = distance / lastPinchDistanceRef.current

        setTransform(prev => {
            const newZoom = Math.max(minZoom, Math.min(maxZoom, prev.zoom * scale))

            // Calculate pan delta
            const panDeltaX = center.x - lastPinchCenterRef.current!.x
            const panDeltaY = center.y - lastPinchCenterRef.current!.y

            // Apply zoom around center point
            const zoomRatio = newZoom / prev.zoom
            const newPanX = center.x - (center.x - prev.pan.x) * zoomRatio + panDeltaX
            const newPanY = center.y - (center.y - prev.pan.y) * zoomRatio + panDeltaY

            return {
                pan: { x: newPanX, y: newPanY },
                zoom: newZoom
            }
        })

        lastPinchDistanceRef.current = distance
        lastPinchCenterRef.current = center
    }, [minZoom, maxZoom])

    const endPinch = useCallback(() => {
        lastPinchDistanceRef.current = null
        lastPinchCenterRef.current = null
    }, [])

    return {
        transform,
        isPanMode,
        isDragging,
        setPan,
        setZoom,
        zoomAtPoint,
        resetView,
        fitToView,
        startPan,
        updatePan,
        endPan,
        handleWheel,
        handlePinch,
        startPinch,
        endPinch
    }
}
