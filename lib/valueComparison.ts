/**
 * Value comparison utilities for comparing reference and WIP images.
 * Detects areas where values differ and whether they are too light or too dark.
 */

import { extractGrayscaleValues } from './grayscaleConvert'

/**
 * Result of comparing two images for value differences.
 */
export interface ComparisonResult {
    /** Absolute difference for each pixel (0-255) */
    differenceMap: Uint8ClampedArray
    /** Direction for each pixel: 1 = WIP too light, -1 = WIP too dark, 0 = within threshold */
    directionMap: Int8Array
    /** Width of the comparison (uses smaller of two images) */
    width: number
    /** Height of the comparison (uses smaller of two images) */
    height: number
    /** Overall statistics */
    stats: {
        avgDifference: number
        problemAreaPercentage: number
        tooLightPercentage: number
        tooDarkPercentage: number
    }
}

/**
 * Compare two images for value differences.
 * Images are first converted to grayscale, then compared pixel-by-pixel.
 * Since images may be different sizes, the comparison uses the overlapping area.
 * 
 * @param reference Reference image
 * @param wip Work-in-progress image
 * @param threshold Difference threshold for marking as "problem area" (default: 25)
 * @returns ComparisonResult with difference and direction maps
 */
export function compareValues(
    reference: HTMLImageElement,
    wip: HTMLImageElement,
    threshold: number = 25
): ComparisonResult {
    const refData = extractGrayscaleValues(reference)
    const wipData = extractGrayscaleValues(wip)

    // Use the smaller dimensions for comparison
    const width = Math.min(refData.width, wipData.width)
    const height = Math.min(refData.height, wipData.height)
    const pixelCount = width * height

    const differenceMap = new Uint8ClampedArray(pixelCount)
    const directionMap = new Int8Array(pixelCount)

    let totalDifference = 0
    let problemPixels = 0
    let tooLightPixels = 0
    let tooDarkPixels = 0

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const outIdx = y * width + x
            const refIdx = y * refData.width + x
            const wipIdx = y * wipData.width + x

            const refValue = refData.values[refIdx]
            const wipValue = wipData.values[wipIdx]

            // Calculate absolute difference
            const diff = Math.abs(wipValue - refValue)
            differenceMap[outIdx] = diff
            totalDifference += diff

            // Determine direction (positive = WIP is lighter)
            if (diff > threshold) {
                problemPixels++
                if (wipValue > refValue) {
                    directionMap[outIdx] = 1 // WIP too light
                    tooLightPixels++
                } else {
                    directionMap[outIdx] = -1 // WIP too dark
                    tooDarkPixels++
                }
            } else {
                directionMap[outIdx] = 0 // Within threshold
            }
        }
    }

    return {
        differenceMap,
        directionMap,
        width,
        height,
        stats: {
            avgDifference: totalDifference / pixelCount,
            problemAreaPercentage: (problemPixels / pixelCount) * 100,
            tooLightPercentage: (tooLightPixels / pixelCount) * 100,
            tooDarkPercentage: (tooDarkPixels / pixelCount) * 100
        }
    }
}

/**
 * Scale comparison result to match canvas dimensions.
 * This is useful when rendering the overlay at a different size than the comparison.
 * 
 * @param result Original comparison result
 * @param targetWidth Target canvas width
 * @param targetHeight Target canvas height
 * @returns Scaled comparison result
 */
export function scaleComparisonResult(
    result: ComparisonResult,
    targetWidth: number,
    targetHeight: number
): ComparisonResult {
    const { width, height, differenceMap, directionMap } = result

    const scaledPixelCount = targetWidth * targetHeight
    const scaledDifferenceMap = new Uint8ClampedArray(scaledPixelCount)
    const scaledDirectionMap = new Int8Array(scaledPixelCount)

    const scaleX = width / targetWidth
    const scaleY = height / targetHeight

    for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < targetWidth; x++) {
            const targetIdx = y * targetWidth + x

            // Map back to source coordinates
            const srcX = Math.floor(x * scaleX)
            const srcY = Math.floor(y * scaleY)
            const srcIdx = srcY * width + srcX

            scaledDifferenceMap[targetIdx] = differenceMap[srcIdx]
            scaledDirectionMap[targetIdx] = directionMap[srcIdx]
        }
    }

    return {
        ...result,
        differenceMap: scaledDifferenceMap,
        directionMap: scaledDirectionMap,
        width: targetWidth,
        height: targetHeight
    }
}
