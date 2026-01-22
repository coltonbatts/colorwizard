/**
 * Grayscale conversion utilities using proper luminance formula.
 * Uses the formula: 0.299*R + 0.587*G + 0.114*B
 * This matches human perception of brightness (ITU-R BT.601).
 */

/**
 * Convert RGB values to grayscale using luminance formula.
 * @param r Red channel (0-255)
 * @param g Green channel (0-255)
 * @param b Blue channel (0-255)
 * @returns Grayscale value (0-255)
 */
export function rgbToGrayscale(r: number, g: number, b: number): number {
    return Math.round(0.299 * r + 0.587 * g + 0.114 * b)
}

/**
 * Convert entire ImageData to grayscale.
 * Returns a new ImageData object (does not modify the original).
 * @param imageData Source ImageData
 * @returns New ImageData with grayscale values
 */
export function imageDataToGrayscale(imageData: ImageData): ImageData {
    const data = imageData.data
    const newData = new Uint8ClampedArray(data.length)

    for (let i = 0; i < data.length; i += 4) {
        const gray = rgbToGrayscale(data[i], data[i + 1], data[i + 2])
        newData[i] = gray     // R
        newData[i + 1] = gray // G
        newData[i + 2] = gray // B
        newData[i + 3] = data[i + 3] // A (preserve alpha)
    }

    return new ImageData(newData, imageData.width, imageData.height)
}

/**
 * Create a grayscale canvas from an image.
 * @param image Source HTMLImageElement
 * @returns HTMLCanvasElement with grayscale rendering
 */
export function createGrayscaleCanvas(image: HTMLImageElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth || image.width
    canvas.height = image.naturalHeight || image.height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
        throw new Error('Could not get canvas context')
    }

    // Draw the original image
    ctx.drawImage(image, 0, 0)

    // Get image data and convert to grayscale
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const grayscaleData = imageDataToGrayscale(imageData)

    // Put grayscale data back
    ctx.putImageData(grayscaleData, 0, 0)

    return canvas
}

/**
 * Extract grayscale values from an image as a flat array.
 * @param image Source HTMLImageElement
 * @returns Uint8ClampedArray of grayscale values (one per pixel)
 */
export function extractGrayscaleValues(image: HTMLImageElement): {
    values: Uint8ClampedArray
    width: number
    height: number
} {
    const canvas = document.createElement('canvas')
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
        throw new Error('Could not get canvas context')
    }

    ctx.drawImage(image, 0, 0)
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data

    const values = new Uint8ClampedArray(width * height)
    for (let i = 0; i < values.length; i++) {
        const idx = i * 4
        values[i] = rgbToGrayscale(data[idx], data[idx + 1], data[idx + 2])
    }

    return { values, width, height }
}
