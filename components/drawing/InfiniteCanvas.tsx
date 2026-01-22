'use client'

/**
 * InfiniteCanvas - Core infinite canvas component with pan/zoom capabilities.
 * Renders both reference and WIP images as layers on a virtual canvas.
 */

import { useRef, useEffect, useCallback, useState, memo } from 'react'
import { useDrawingCanvasTransform, DrawingCanvasTransform } from '@/hooks/useDrawingCanvasTransform'
import CanvasImage from './CanvasImage'
import TransformHandles, { TransformMode } from './TransformHandles'

export type SelectedImage = 'reference' | 'wip' | null

export interface CanvasImageData {
    image: HTMLImageElement
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
}

interface InfiniteCanvasProps {
    /** Reference image data */
    referenceImage: CanvasImageData | null
    /** WIP image data */
    wipImage: CanvasImageData | null
    /** Currently selected image */
    selectedImage: SelectedImage
    /** Callback when image is selected */
    onSelectImage: (image: SelectedImage) => void
    /** Callback when reference image transforms change */
    onReferenceTransformChange?: (transform: Partial<CanvasImageData['transform']>) => void
    /** Callback when WIP image transforms change */
    onWipTransformChange?: (transform: Partial<CanvasImageData['transform']>) => void
    /** Whether grayscale mode is enabled */
    isGrayscale: boolean
    /** Callback when canvas transform changes */
    onCanvasTransformChange?: (transform: DrawingCanvasTransform) => void
    /** External canvas transform (for resetting) */
    canvasTransform?: DrawingCanvasTransform
    /** Custom class name */
    className?: string
    /** Children (for overlays) */
    children?: React.ReactNode
}

function InfiniteCanvas({
    referenceImage,
    wipImage,
    selectedImage,
    onSelectImage,
    onReferenceTransformChange,
    onWipTransformChange,
    isGrayscale,
    onCanvasTransformChange,
    canvasTransform: externalTransform,
    className = '',
    children
}: InfiniteCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })

    // Canvas transform hook
    const {
        transform: canvasT,
        isPanMode,
        isDragging: isPanning,
        startPan,
        updatePan,
        endPan,
        handleWheel,
        startPinch,
        handlePinch,
        endPinch,
        resetView,
        fitToView
    } = useDrawingCanvasTransform({
        initialTransform: externalTransform
    })

    // Track image dragging
    const [isDraggingImage, setIsDraggingImage] = useState(false)
    const dragStartRef = useRef<{ x: number; y: number } | null>(null)

    // Update container size on resize
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect()
                setContainerSize({ width: rect.width, height: rect.height })
            }
        }

        updateSize()
        const resizeObserver = new ResizeObserver(updateSize)
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current)
        }
        return () => resizeObserver.disconnect()
    }, [])

    // Sync external transform
    useEffect(() => {
        if (onCanvasTransformChange) {
            onCanvasTransformChange(canvasT)
        }
    }, [canvasT, onCanvasTransformChange])

    // Handle wheel events
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const onWheel = (e: WheelEvent) => {
            e.preventDefault()
            const rect = container.getBoundingClientRect()
            handleWheel(e, rect)
        }

        container.addEventListener('wheel', onWheel, { passive: false })
        return () => container.removeEventListener('wheel', onWheel)
    }, [handleWheel])

    // Check if point is within image bounds
    const isPointInImage = useCallback((
        point: { x: number; y: number },
        imageData: CanvasImageData | null
    ): boolean => {
        if (!imageData) return false

        const { image, transform: imgT } = imageData
        const { position, scale } = imgT

        // Simple bound check (doesn't account for rotation/perspective complexity but good for selection)
        const width = image.width * scale
        const height = image.height * scale
        const left = position.x
        const top = position.y
        const right = left + width
        const bottom = top + height

        return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom
    }, [])

    // Convert client coords to canvas coords
    const clientToCanvas = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
        if (!containerRef.current) return { x: 0, y: 0 }
        const rect = containerRef.current.getBoundingClientRect()
        return {
            x: (clientX - rect.left - canvasT.pan.x) / canvasT.zoom,
            y: (clientY - rect.top - canvasT.pan.y) / canvasT.zoom
        }
    }, [canvasT])

    // Handle mouse down
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (isPanMode) {
            startPan(e.clientX, e.clientY)
            return
        }

        const canvasPoint = clientToCanvas(e.clientX, e.clientY)

        // Check if clicking on WIP
        if (isPointInImage(canvasPoint, wipImage)) {
            onSelectImage('wip')
            setIsDraggingImage(true)
            dragStartRef.current = { x: e.clientX, y: e.clientY }
            return
        }

        // Check if clicking on reference
        if (isPointInImage(canvasPoint, referenceImage)) {
            onSelectImage('reference')
            setIsDraggingImage(true)
            dragStartRef.current = { x: e.clientX, y: e.clientY }
            return
        }

        onSelectImage(null)
    }, [isPanMode, clientToCanvas, isPointInImage, wipImage, referenceImage, onSelectImage, startPan])

    // Handle mouse move
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isPanMode && isPanning) {
            updatePan(e.clientX, e.clientY)
            return
        }

        if (isDraggingImage && dragStartRef.current && selectedImage) {
            const deltaX = (e.clientX - dragStartRef.current.x) / canvasT.zoom
            const deltaY = (e.clientY - dragStartRef.current.y) / canvasT.zoom
            dragStartRef.current = { x: e.clientX, y: e.clientY }

            if (selectedImage === 'reference' && onReferenceTransformChange && referenceImage) {
                onReferenceTransformChange({
                    position: {
                        x: referenceImage.transform.position.x + deltaX,
                        y: referenceImage.transform.position.y + deltaY
                    }
                })
            } else if (selectedImage === 'wip' && onWipTransformChange && wipImage) {
                onWipTransformChange({
                    position: {
                        x: wipImage.transform.position.x + deltaX,
                        y: wipImage.transform.position.y + deltaY
                    }
                })
            }
        }
    }, [isPanMode, isPanning, updatePan, isDraggingImage, selectedImage, canvasT.zoom, referenceImage, wipImage, onReferenceTransformChange, onWipTransformChange])

    // Handle mouse up
    const handleMouseUp = useCallback(() => {
        endPan()
        setIsDraggingImage(false)
        dragStartRef.current = null
    }, [endPan])

    // Determine Transform Mode
    const getTransformMode = (type: 'reference' | 'wip'): TransformMode => {
        if (type === 'reference') return 'basic'
        if (wipImage?.transform.perspectiveEnabled) return 'perspective'
        return 'rotation' // WIP defaults to rotation mode when selected
    }

    const handleRotationChange = useCallback((rotation: number) => {
        if (onWipTransformChange) {
            onWipTransformChange({ rotation })
        }
    }, [onWipTransformChange])

    const handlePerspectiveCornerChange = useCallback((
        corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight',
        position: { x: number; y: number }
    ) => {
        if (onWipTransformChange && wipImage?.transform.perspectiveCorners) {
            onWipTransformChange({
                perspectiveCorners: {
                    ...wipImage.transform.perspectiveCorners,
                    [corner]: position
                }
            })
        }
    }, [onWipTransformChange, wipImage])

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full overflow-hidden bg-gray-900 ${className}`}
            style={{
                cursor: isPanMode
                    ? (isPanning ? 'grabbing' : 'grab')
                    : 'default',
                touchAction: 'none'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={(e) => {
                if (e.touches.length === 2) {
                    const t1 = e.touches[0], t2 = e.touches[1]
                    startPinch(Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY),
                        { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 })
                }
            }}
            onTouchMove={(e) => {
                if (e.touches.length === 2) {
                    const t1 = e.touches[0], t2 = e.touches[1]
                    handlePinch(Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY),
                        { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 })
                }
            }}
            onTouchEnd={endPinch}
        >
            {/* Canvas Layer */}
            <div
                className="absolute w-full h-full"
                style={{
                    transform: `translate(${canvasT.pan.x}px, ${canvasT.pan.y}px) scale(${canvasT.zoom})`,
                    transformOrigin: '0 0',
                }}
            >
                {referenceImage && (
                    <CanvasImage
                        image={referenceImage.image}
                        transform={{ ...referenceImage.transform, perspectiveEnabled: false, perspectiveCorners: null }}
                        isSelected={selectedImage === 'reference'}
                        isReference={true}
                        isGrayscale={isGrayscale}
                        zIndex={1}
                    />
                )}
                {wipImage && (
                    <CanvasImage
                        image={wipImage.image}
                        transform={wipImage.transform}
                        isSelected={selectedImage === 'wip'}
                        isReference={false}
                        isGrayscale={isGrayscale}
                        zIndex={2}
                    />
                )}
            </div>

            {/* Handles Overlay */}
            {selectedImage === 'reference' && referenceImage && (
                <TransformHandles
                    imageType="reference"
                    imageDimensions={{ width: referenceImage.image.width, height: referenceImage.image.height }}
                    imagePosition={referenceImage.transform.position}
                    imageScale={referenceImage.transform.scale}
                    imageRotation={0}
                    mode="basic"
                    isSelected={true}
                    canvasTransform={canvasT}
                    perspectiveCorners={null}
                />
            )}
            {selectedImage === 'wip' && wipImage && (
                <TransformHandles
                    imageType="wip"
                    imageDimensions={{ width: wipImage.image.width, height: wipImage.image.height }}
                    imagePosition={wipImage.transform.position}
                    imageScale={wipImage.transform.scale}
                    imageRotation={wipImage.transform.rotation}
                    mode={getTransformMode('wip')}
                    isSelected={true}
                    canvasTransform={canvasT}
                    perspectiveCorners={wipImage.transform.perspectiveCorners}
                    onRotationChange={handleRotationChange}
                    onPerspectiveCornerChange={handlePerspectiveCornerChange}
                />
            )}

            {children}

            {/* UI Overlays */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/70 text-white text-xs rounded-full pointer-events-none transition-opacity duration-200">
                {isPanMode ? 'Pan Mode (Spaceheld)' : 'Direct Transform Mode'}
            </div>

            <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/70 text-white text-xs rounded-full pointer-events-none">
                {Math.round(canvasT.zoom * 100)}%
            </div>

            {!referenceImage && (
                <div className="absolute inset-0 flex items-center justify-center p-8 bg-gray-900/50 backdrop-blur-sm">
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-gray-400 mb-2">No Reference Image</h2>
                        <p className="text-gray-500">Go back and upload a photo to start comparing.</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default memo(InfiniteCanvas)
