/**
 * Shared utility for calculating how to fit an image into a container canvas
 * while preserving aspect ratio.
 */

export interface Rect {
    width: number
    height: number
}

export interface DrawInfo {
    x: number
    y: number
    width: number
    height: number
    scale: number
}

/**
 * Calculates the centered draw rectangle for an image to fit in a container.
 * @param container The dimensions of the container canvas
 * @param image The natural dimensions of the source image
 * @param padding Factor to reduce the image size (e.g., 0.9 for 10% margin)
 */
export function calculateFit(container: Rect, image: Rect, padding: number = 1): DrawInfo {
    const scale = Math.min(
        container.width / image.width,
        container.height / image.height
    ) * padding

    const width = image.width * scale
    const height = image.height * scale
    const x = (container.width - width) / 2
    const y = (container.height - height) / 2

    // Integrity check: aspect ratio must be preserved within floating point epsilon
    const sourceAspect = image.width / image.height
    const destAspect = width / height
    if (Math.abs(sourceAspect - destAspect) > 0.0001) {
        throw new Error(`Reference Integrity Violation: Aspect ratio mismatch (${sourceAspect} vs ${destAspect})`)
    }

    return { x, y, width, height, scale }
}
