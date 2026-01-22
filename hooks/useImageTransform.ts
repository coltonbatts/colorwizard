'use client'

/**
 * useImageTransform - Hook for managing individual image transform state.
 * Used for both reference and WIP images in Check My Drawing feature.
 */

import { useState, useCallback, useMemo } from 'react'
import { CornerPoints, getDefaultCorners, isValidQuadrilateral } from '@/lib/perspectiveWarp'

export interface ImageTransform {
    /** Position on canvas (x, y) */
    position: { x: number; y: number }
    /** Scale factor (0.25 - 3.0 for WIP, 0.5 - 2.0 for reference) */
    scale: number
    /** Rotation in degrees (0-360, WIP only) */
    rotation: number
    /** Opacity (0-1, WIP only) */
    opacity: number
    /** Whether perspective mode is active */
    perspectiveEnabled: boolean
    /** Four corner positions for perspective warp */
    perspectiveCorners: CornerPoints | null
}

export interface UseImageTransformOptions {
    /** Whether this is the reference image (has fewer transform options) */
    isReference?: boolean
    /** Minimum scale (default: 0.25 for WIP, 0.5 for reference) */
    minScale?: number
    /** Maximum scale (default: 3.0 for WIP, 2.0 for reference) */
    maxScale?: number
    /** Image dimensions for calculating perspective corners */
    imageDimensions?: { width: number; height: number }
    /** Initial transform state */
    initialTransform?: Partial<ImageTransform>
}

export interface UseImageTransformReturn {
    /** Current transform state */
    transform: ImageTransform
    /** Set position */
    setPosition: (position: { x: number; y: number }) => void
    /** Move by delta */
    moveBy: (deltaX: number, deltaY: number) => void
    /** Set scale */
    setScale: (scale: number) => void
    /** Set rotation (WIP only) */
    setRotation: (rotation: number) => void
    /** Set opacity (WIP only) */
    setOpacity: (opacity: number) => void
    /** Toggle perspective mode */
    togglePerspective: () => void
    /** Set perspective corner */
    setPerspectiveCorner: (corner: keyof CornerPoints, position: { x: number; y: number }) => void
    /** Move all perspective corners by delta */
    movePerspectiveBy: (deltaX: number, deltaY: number) => void
    /** Scale perspective corners from center */
    scalePerspectiveFrom: (center: { x: number; y: number }, scaleFactor: number) => void
    /** Reset perspective to default */
    resetPerspective: () => void
    /** Reset all transforms */
    reset: () => void
    /** Match another image's size */
    matchSize: (otherDimensions: { width: number; height: number }) => void
    /** Get CSS transform string */
    getCssTransform: () => string
}

function getDefaultTransform(isReference: boolean): ImageTransform {
    return {
        position: { x: 0, y: 0 },
        scale: 1,
        rotation: 0,
        opacity: isReference ? 1 : 0.5,
        perspectiveEnabled: false,
        perspectiveCorners: null
    }
}

export function useImageTransform(
    options: UseImageTransformOptions = {}
): UseImageTransformReturn {
    const {
        isReference = false,
        minScale = isReference ? 0.5 : 0.25,
        maxScale = isReference ? 2.0 : 3.0,
        imageDimensions,
        initialTransform = {}
    } = options

    const defaultTransform = useMemo(() => ({
        ...getDefaultTransform(isReference),
        ...initialTransform
    }), [isReference, initialTransform])

    const [transform, setTransform] = useState<ImageTransform>(defaultTransform)

    // Set position
    const setPosition = useCallback((position: { x: number; y: number }) => {
        setTransform(prev => ({ ...prev, position }))
    }, [])

    // Move by delta
    const moveBy = useCallback((deltaX: number, deltaY: number) => {
        setTransform(prev => ({
            ...prev,
            position: {
                x: prev.position.x + deltaX,
                y: prev.position.y + deltaY
            }
        }))
    }, [])

    // Set scale
    const setScale = useCallback((scale: number) => {
        setTransform(prev => ({
            ...prev,
            scale: Math.max(minScale, Math.min(maxScale, scale))
        }))
    }, [minScale, maxScale])

    // Set rotation (WIP only)
    const setRotation = useCallback((rotation: number) => {
        if (isReference) return
        setTransform(prev => ({
            ...prev,
            rotation: ((rotation % 360) + 360) % 360 // Normalize to 0-360
        }))
    }, [isReference])

    // Set opacity (WIP only)
    const setOpacity = useCallback((opacity: number) => {
        if (isReference) return
        setTransform(prev => ({
            ...prev,
            opacity: Math.max(0, Math.min(1, opacity))
        }))
    }, [isReference])

    // Toggle perspective mode
    const togglePerspective = useCallback(() => {
        if (isReference) return
        setTransform(prev => {
            const enabling = !prev.perspectiveEnabled
            if (enabling && !prev.perspectiveCorners && imageDimensions) {
                // Initialize corners when enabling
                return {
                    ...prev,
                    perspectiveEnabled: true,
                    perspectiveCorners: getDefaultCorners(imageDimensions.width, imageDimensions.height)
                }
            }
            return {
                ...prev,
                perspectiveEnabled: enabling
            }
        })
    }, [isReference, imageDimensions])

    // Set perspective corner
    const setPerspectiveCorner = useCallback((
        corner: keyof CornerPoints,
        position: { x: number; y: number }
    ) => {
        setTransform(prev => {
            if (!prev.perspectiveCorners) return prev

            const newCorners: CornerPoints = {
                ...prev.perspectiveCorners,
                [corner]: position
            }

            // Validate the new configuration
            if (!isValidQuadrilateral(newCorners)) {
                return prev // Don't apply invalid configs
            }

            return {
                ...prev,
                perspectiveCorners: newCorners
            }
        })
    }, [])

    // Move all perspective corners by delta
    const movePerspectiveBy = useCallback((deltaX: number, deltaY: number) => {
        setTransform(prev => {
            if (!prev.perspectiveCorners) return prev

            return {
                ...prev,
                perspectiveCorners: {
                    topLeft: {
                        x: prev.perspectiveCorners.topLeft.x + deltaX,
                        y: prev.perspectiveCorners.topLeft.y + deltaY
                    },
                    topRight: {
                        x: prev.perspectiveCorners.topRight.x + deltaX,
                        y: prev.perspectiveCorners.topRight.y + deltaY
                    },
                    bottomLeft: {
                        x: prev.perspectiveCorners.bottomLeft.x + deltaX,
                        y: prev.perspectiveCorners.bottomLeft.y + deltaY
                    },
                    bottomRight: {
                        x: prev.perspectiveCorners.bottomRight.x + deltaX,
                        y: prev.perspectiveCorners.bottomRight.y + deltaY
                    }
                }
            }
        })
    }, [])

    // Scale perspective corners from center
    const scalePerspectiveFrom = useCallback((
        center: { x: number; y: number },
        scaleFactor: number
    ) => {
        setTransform(prev => {
            if (!prev.perspectiveCorners) return prev

            const scalePoint = (p: { x: number; y: number }) => ({
                x: center.x + (p.x - center.x) * scaleFactor,
                y: center.y + (p.y - center.y) * scaleFactor
            })

            return {
                ...prev,
                perspectiveCorners: {
                    topLeft: scalePoint(prev.perspectiveCorners.topLeft),
                    topRight: scalePoint(prev.perspectiveCorners.topRight),
                    bottomLeft: scalePoint(prev.perspectiveCorners.bottomLeft),
                    bottomRight: scalePoint(prev.perspectiveCorners.bottomRight)
                }
            }
        })
    }, [])

    // Reset perspective to default
    const resetPerspective = useCallback(() => {
        if (!imageDimensions) return
        setTransform(prev => ({
            ...prev,
            perspectiveCorners: getDefaultCorners(imageDimensions.width, imageDimensions.height)
        }))
    }, [imageDimensions])

    // Reset all transforms
    const reset = useCallback(() => {
        setTransform(prev => ({
            ...getDefaultTransform(isReference),
            // Keep perspective corners if they exist but reset to default
            perspectiveCorners: imageDimensions
                ? getDefaultCorners(imageDimensions.width, imageDimensions.height)
                : null
        }))
    }, [isReference, imageDimensions])

    // Match another image's size
    const matchSize = useCallback((otherDimensions: { width: number; height: number }) => {
        if (!imageDimensions) return
        const scaleX = otherDimensions.width / imageDimensions.width
        const scaleY = otherDimensions.height / imageDimensions.height
        const newScale = Math.min(scaleX, scaleY)
        setScale(newScale)
    }, [imageDimensions, setScale])

    // Get CSS transform string
    const getCssTransform = useCallback((): string => {
        const transforms: string[] = []

        // Position
        transforms.push(`translate(${transform.position.x}px, ${transform.position.y}px)`)

        // Scale
        if (transform.scale !== 1) {
            transforms.push(`scale(${transform.scale})`)
        }

        // Rotation (WIP only)
        if (!isReference && transform.rotation !== 0) {
            transforms.push(`rotate(${transform.rotation}deg)`)
        }

        return transforms.join(' ')
    }, [transform, isReference])

    return {
        transform,
        setPosition,
        moveBy,
        setScale,
        setRotation,
        setOpacity,
        togglePerspective,
        setPerspectiveCorner,
        movePerspectiveBy,
        scalePerspectiveFrom,
        resetPerspective,
        reset,
        matchSize,
        getCssTransform
    }
}
