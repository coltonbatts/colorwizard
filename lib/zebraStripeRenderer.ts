/**
 * Zebra stripe overlay renderer for visualizing value comparison problem areas.
 * Renders animated diagonal stripes on areas that differ from the reference.
 */

import { ComparisonResult } from './valueComparison'

/**
 * Options for rendering zebra stripes.
 */
export interface ZebraStripeOptions {
    /** Width of each stripe in pixels */
    stripeWidth: number
    /** Opacity of the overlay (0-1) */
    opacity: number
    /** Animation offset for scrolling effect (0-1, normalized) */
    animationOffset: number
    /** Color for "too light" areas (WIP lighter than reference) */
    tooLightColor: string
    /** Color for "too dark" areas (WIP darker than reference) */
    tooDarkColor: string
}

/**
 * Default options for zebra stripe rendering.
 */
export const DEFAULT_ZEBRA_OPTIONS: ZebraStripeOptions = {
    stripeWidth: 10,
    opacity: 0.6,
    animationOffset: 0,
    tooLightColor: '#3B82F6', // Blue
    tooDarkColor: '#EF4444'   // Red
}

/**
 * Parse a hex color to RGB components.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) {
        return { r: 0, g: 0, b: 0 }
    }
    return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    }
}

/**
 * Render zebra stripes onto a canvas based on comparison result.
 * Only renders stripes on problem areas (where directionMap is non-zero).
 * 
 * @param ctx Canvas 2D context to render to
 * @param comparisonResult Result from compareValues
 * @param options Rendering options
 */
export function renderZebraStripes(
    ctx: CanvasRenderingContext2D,
    comparisonResult: ComparisonResult,
    options: Partial<ZebraStripeOptions> = {}
): void {
    const opts = { ...DEFAULT_ZEBRA_OPTIONS, ...options }
    const { width, height, directionMap } = comparisonResult

    // Get existing canvas image data
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data

    const tooLightRgb = hexToRgb(opts.tooLightColor)
    const tooDarkRgb = hexToRgb(opts.tooDarkColor)

    // Calculate stripe pattern
    // Diagonal stripes: (x + y) % (stripeWidth * 2) < stripeWidth
    const stripeTotal = opts.stripeWidth * 2
    const animOffset = Math.floor(opts.animationOffset * stripeTotal)

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x
            const direction = directionMap[idx]

            if (direction === 0) continue // No problem here

            // Calculate diagonal stripe pattern with animation
            const stripePhase = (x + y + animOffset) % stripeTotal
            const isStripe = stripePhase < opts.stripeWidth

            if (!isStripe) continue // Not a stripe pixel

            // Get the color based on direction
            const color = direction > 0 ? tooLightRgb : tooDarkRgb

            // Blend with existing pixel
            const pixelIdx = idx * 4
            const alpha = opts.opacity
            const invAlpha = 1 - alpha

            data[pixelIdx] = Math.round(data[pixelIdx] * invAlpha + color.r * alpha)
            data[pixelIdx + 1] = Math.round(data[pixelIdx + 1] * invAlpha + color.g * alpha)
            data[pixelIdx + 2] = Math.round(data[pixelIdx + 2] * invAlpha + color.b * alpha)
            // Alpha channel remains unchanged
        }
    }

    ctx.putImageData(imageData, 0, 0)
}

/**
 * Create an overlay canvas with zebra stripes.
 * This can be composited over the original image.
 * 
 * @param comparisonResult Result from compareValues
 * @param options Rendering options
 * @returns HTMLCanvasElement with zebra stripe overlay (transparent background)
 */
export function createZebraOverlayCanvas(
    comparisonResult: ComparisonResult,
    options: Partial<ZebraStripeOptions> = {}
): HTMLCanvasElement {
    const opts = { ...DEFAULT_ZEBRA_OPTIONS, ...options }
    const { width, height, directionMap } = comparisonResult

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
        throw new Error('Could not get canvas context')
    }

    const tooLightRgb = hexToRgb(opts.tooLightColor)
    const tooDarkRgb = hexToRgb(opts.tooDarkColor)

    const stripeTotal = opts.stripeWidth * 2
    const animOffset = Math.floor(opts.animationOffset * stripeTotal)

    const imageData = ctx.createImageData(width, height)
    const data = imageData.data

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x
            const direction = directionMap[idx]
            const pixelIdx = idx * 4

            if (direction === 0) {
                // Transparent
                data[pixelIdx + 3] = 0
                continue
            }

            // Calculate diagonal stripe pattern with animation
            const stripePhase = (x + y + animOffset) % stripeTotal
            const isStripe = stripePhase < opts.stripeWidth

            if (!isStripe) {
                // Transparent gap
                data[pixelIdx + 3] = 0
                continue
            }

            // Get the color based on direction
            const color = direction > 0 ? tooLightRgb : tooDarkRgb

            data[pixelIdx] = color.r
            data[pixelIdx + 1] = color.g
            data[pixelIdx + 2] = color.b
            data[pixelIdx + 3] = Math.round(opts.opacity * 255)
        }
    }

    ctx.putImageData(imageData, 0, 0)
    return canvas
}
