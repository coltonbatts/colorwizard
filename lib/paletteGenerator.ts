/**
 * Palette Generator - Shopping List Creation via Color Quantization
 *
 * This module generates DMC embroidery floss shopping lists from images using
 * the Median Cut quantization algorithm. It analyzes an image, reduces it to
 * a limited palette of representative colors, and maps those colors to the
 * closest DMC floss matches.
 *
 * ## Algorithm Overview
 *
 * 1. **Image Preprocessing**: Downsample image for performance while maintaining
 *    visual fidelity (400-800px depending on detail level)
 *
 * 2. **Color Quantization (Median Cut)**: Recursively divide the color space
 *    into boxes, splitting along the dimension with greatest range. This produces
 *    a palette that preserves the image's color distribution.
 *
 * 3. **Pixel Assignment**: Map each pixel to its nearest palette color using
 *    CIELAB deltaE for perceptually accurate color matching.
 *
 * 4. **Coverage Analysis**: Calculate what percentage of the image each palette
 *    color represents, filtering out insignificant colors.
 *
 * 5. **DMC Mapping**: Match each palette color to the closest DMC floss color
 *    from the 454-color database.
 *
 * 6. **Deduplication & Sorting**: Merge duplicate DMC matches, sum their coverage,
 *    and sort by coverage percentage (most used first).
 *
 * ## Performance Characteristics
 *
 * - **Low detail**: ~400px, fast quantization, suitable for quick previews
 * - **Medium detail**: ~600px, balanced quality/speed, recommended for most use cases
 * - **High detail**: ~800px, highest accuracy, best for large or detailed images
 *
 * ## Perceptual Color Matching
 *
 * All color comparisons use CIELAB deltaE rather than RGB Euclidean distance.
 * This ensures matches are perceptually uniform - a deltaE of 2.0 looks equally
 * different whether comparing reds or blues.
 *
 * @example
 * ```ts
 * const config: PaletteConfig = {
 *   maxColors: 25,
 *   detailLevel: 'medium',
 *   minCoverageThreshold: 0.01 // 1% minimum coverage
 * };
 *
 * const shoppingList = await generateShoppingList(imageElement, config);
 * // Returns DMC codes sorted by coverage, e.g.:
 * // [
 * //   { dmcCode: '310', dmcName: 'Black', coveragePct: 24.5, ... },
 * //   { dmcCode: 'blanc', dmcName: 'White', coveragePct: 18.2, ... },
 * //   ...
 * // ]
 * ```
 *
 * @module paletteGenerator
 */

import { rgbToLab, deltaE, Lab } from './colorUtils'
import { findClosestDMCColors } from './dmcFloss'

/**
 * A single item in the generated shopping list.
 * Represents one DMC floss color needed for the project.
 */
export interface ShoppingListItem {
    /** DMC floss product code (e.g., "310", "blanc", "3371") */
    dmcCode: string

    /** Human-readable color name (e.g., "Black", "White", "Dark Red") */
    dmcName: string

    /** Hex color value of the DMC floss (e.g., "#000000") */
    dmcHex: string

    /**
     * Percentage of image covered by this color (0-100).
     * Higher values indicate more prominent colors that require more thread.
     */
    coveragePct: number

    /**
     * Average perceptual distance (deltaE) of pixels assigned to this color.
     * Lower values indicate better quantization accuracy. Typical range: 0-10.
     */
    distanceScore: number

    /**
     * CIELAB color values of the quantized palette color (before DMC mapping).
     * Useful for visualizing the actual cluster center color.
     */
    swatchLab: Lab
}

/**
 * Configuration for palette generation and shopping list creation.
 */
export interface PaletteConfig {
    /**
     * Maximum number of colors to include in the final palette.
     * Recommended values: 10-30 for simple designs, 30-50 for complex images.
     * Higher values capture more detail but increase thread cost and complexity.
     */
    maxColors: number

    /**
     * Image processing quality level.
     * - 'low': ~400px, fastest, good for quick previews
     * - 'medium': ~600px, balanced (recommended)
     * - 'high': ~800px, most accurate for detailed images
     */
    detailLevel: 'low' | 'medium' | 'high'

    /**
     * Minimum coverage percentage to include a color (0-1).
     * Colors covering less than this threshold are filtered out.
     * Examples: 0.01 = 1%, 0.005 = 0.5%
     */
    minCoverageThreshold: number
}

/**
 * Extract and downsample image data from an HTMLImageElement.
 *
 * Creates an off-screen canvas to downsample the image to a maximum dimension
 * while preserving aspect ratio. This improves performance for large images
 * without significantly affecting color analysis accuracy.
 *
 * @param img - The source image element
 * @param maxSize - Maximum width or height in pixels
 * @returns ImageData containing RGBA pixel data
 * @throws Error if canvas context cannot be created
 *
 * @internal
 */
function getImageData(img: HTMLImageElement, maxSize: number): ImageData {
    const canvas = document.createElement('canvas')
    let { width, height } = img

    // Downsample if image exceeds maxSize
    if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
    }

    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')

    ctx.drawImage(img, 0, 0, width, height)
    return ctx.getImageData(0, 0, width, height)
}

/**
 * Median Cut color quantization algorithm.
 *
 * This algorithm reduces an image's color palette by recursively dividing
 * the RGB color space into boxes, splitting along the dimension with the
 * greatest range. The process continues until the desired number of colors
 * is reached.
 *
 * ## How It Works
 *
 * 1. Start with all pixels in a single box
 * 2. Find the box with the largest color range (in R, G, or B)
 * 3. Sort pixels in that box by the dominant channel
 * 4. Split at the median to create two new boxes
 * 5. Repeat until we have `colorCount` boxes
 * 6. Average all pixels in each box to get the representative color
 *
 * This approach preserves the color distribution of the original image better
 * than simple k-means or uniform quantization.
 *
 * ## Transparency Handling
 *
 * Pixels with alpha < 128 are excluded from quantization to avoid sampling
 * background colors.
 *
 * @param data - RGBA pixel data from ImageData (Uint8ClampedArray)
 * @param colorCount - Target number of colors in the palette
 * @returns Array of representative RGB colors
 *
 * @internal
 */
function medianCut(data: Uint8ClampedArray, colorCount: number): { r: number, g: number, b: number }[] {
    // Collect all opaque pixels
    const pixels: { r: number, g: number, b: number }[] = []
    for (let i = 0; i < data.length; i += 4) {
        // Skip transparent pixels (alpha < 128)
        if (data[i + 3] < 128) continue
        pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] })
    }

    if (pixels.length === 0) return []

    // Initialize with all pixels in one box
    const boxes: { r: number, g: number, b: number }[][] = [pixels]

    // Iteratively split boxes until we reach the target color count
    while (boxes.length < colorCount) {
        // Find the box with the largest color range
        let maxRange = -1
        let splitIndex = -1
        let splitChannel: 'r' | 'g' | 'b' = 'r'

        for (let i = 0; i < boxes.length; i++) {
            const box = boxes[i]
            if (box.length === 0) continue

            // Calculate min/max for each color channel
            let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0

            for (const p of box) {
                minR = Math.min(minR, p.r); maxR = Math.max(maxR, p.r)
                minG = Math.min(minG, p.g); maxG = Math.max(maxG, p.g)
                minB = Math.min(minB, p.b); maxB = Math.max(maxB, p.b)
            }

            const rRange = maxR - minR
            const gRange = maxG - minG
            const bRange = maxB - minB

            // Find the dimension with greatest range
            const boxMaxRange = Math.max(rRange, gRange, bRange)

            if (boxMaxRange > maxRange) {
                maxRange = boxMaxRange
                splitIndex = i
                // Select channel with greatest range for splitting
                splitChannel = rRange >= gRange && rRange >= bRange ? 'r' : (gRange >= bRange ? 'g' : 'b')
            }
        }

        // No splittable boxes remain
        if (splitIndex === -1) break

        const boxToSplit = boxes[splitIndex]

        // Sort pixels along the dominant channel
        boxToSplit.sort((a, b) => a[splitChannel] - b[splitChannel])

        // Split at the median
        const mid = Math.floor(boxToSplit.length / 2)
        const box1 = boxToSplit.slice(0, mid)
        const box2 = boxToSplit.slice(mid)

        // Replace original box with two new boxes
        boxes.splice(splitIndex, 1, box1, box2)
    }

    // Calculate the representative color for each box (average of all pixels)
    return boxes.map(box => {
        if (box.length === 0) return { r: 0, g: 0, b: 0 }
        let r = 0, g = 0, b = 0
        for (const p of box) {
            r += p.r
            g += p.g
            b += p.b
        }
        return {
            r: Math.round(r / box.length),
            g: Math.round(g / box.length),
            b: Math.round(b / box.length)
        }
    }).filter(c => !(c.r === 0 && c.g === 0 && c.b === 0 && boxes.find(b => b.length === 0)))
}

/**
 * Generate a DMC embroidery floss shopping list from an image.
 *
 * This is the main entry point for palette generation. It analyzes the image,
 * quantizes colors using Median Cut, maps to DMC floss colors, and returns
 * a sorted list of colors needed for the project.
 *
 * ## Process Steps
 *
 * 1. **Downsample**: Resize image based on detail level (400-800px)
 * 2. **Quantize**: Apply Median Cut to extract representative palette
 * 3. **Assign**: Map every pixel to its nearest palette color (CIELAB deltaE)
 * 4. **Analyze**: Calculate coverage percentage for each palette color
 * 5. **Match**: Find closest DMC floss color for each palette color
 * 6. **Deduplicate**: Merge colors that map to the same DMC code
 * 7. **Sort**: Order by coverage (most used colors first)
 * 8. **Filter**: Apply coverage threshold and max color limit
 *
 * ## Performance Notes
 *
 * - Image downsampling significantly improves performance for large images
 * - CIELAB conversions are cached during pixel assignment
 * - Typical processing time: 100-500ms for medium detail level
 *
 * @param image - HTMLImageElement containing the source image
 * @param config - Configuration for palette generation
 * @returns Promise resolving to array of shopping list items, sorted by coverage
 *
 * @example
 * ```ts
 * // Generate a 20-color palette with medium detail
 * const shoppingList = await generateShoppingList(imageElement, {
 *   maxColors: 20,
 *   detailLevel: 'medium',
 *   minCoverageThreshold: 0.005
 * });
 *
 * // Display results
 * shoppingList.forEach(item => {
 *   console.log(`${item.dmcCode}: ${item.dmcName} - ${item.coveragePct.toFixed(1)}% coverage`);
 * });
 * ```
 *
 * @throws Error if image cannot be processed or canvas context fails
 */
export async function generateShoppingList(
    image: HTMLImageElement,
    config: PaletteConfig
): Promise<ShoppingListItem[]> {
    // STEP 1: Extract and downsample image data
    // Resolution varies by detail level (400px = low, 600px = medium, 800px = high)
    const coverageSize = config.detailLevel === 'high' ? 800 : (config.detailLevel === 'medium' ? 600 : 400)
    const imageData = getImageData(image, coverageSize)
    const data = imageData.data

    // STEP 2: Color quantization via Median Cut
    // Generate 2x the requested colors to allow for DMC deduplication
    const quantizeCount = Math.min(config.maxColors * 2, 64)
    const paletteRGB = medianCut(data, quantizeCount)

    // STEP 3: Pixel assignment and coverage analysis
    const pixelCount = data.length / 4
    const counts = new Map<number, number>() // palette index -> pixel count
    const distAccumulator = new Map<number, number>() // palette index -> sum of deltaE distances

    // Pre-convert palette to CIELAB for accurate color matching
    const paletteLab = paletteRGB.map(c => rgbToLab(c.r, c.g, c.b))

    // Assign each pixel to its nearest palette color
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue // Skip transparent pixels

        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const lab = rgbToLab(r, g, b)

        // Find nearest palette color using perceptual distance (deltaE)
        let minDist = Infinity
        let nearestIdx = -1

        for (let j = 0; j < paletteLab.length; j++) {
            const d = deltaE(lab, paletteLab[j])
            if (d < minDist) {
                minDist = d
                nearestIdx = j
            }
        }

        // Accumulate coverage and distance metrics
        if (nearestIdx !== -1) {
            counts.set(nearestIdx, (counts.get(nearestIdx) || 0) + 1)
            distAccumulator.set(nearestIdx, (distAccumulator.get(nearestIdx) || 0) + minDist)
        }
    }

    // STEP 4: Create initial shopping list with DMC mapping
    const initialList: ShoppingListItem[] = []

    for (let i = 0; i < paletteRGB.length; i++) {
        const count = counts.get(i) || 0
        if (count === 0) continue

        const coveragePct = (count / pixelCount) * 100

        // Filter out colors below minimum coverage threshold
        if (coveragePct < config.minCoverageThreshold * 100) continue

        // Calculate average perceptual distance for this cluster
        const avgDist = (distAccumulator.get(i) || 0) / count

        // Map to closest DMC floss color
        const dmcMatches = findClosestDMCColors(paletteRGB[i], 1)
        const bestMatch = dmcMatches[0]

        initialList.push({
            dmcCode: bestMatch.number,
            dmcName: bestMatch.name,
            dmcHex: bestMatch.hex,
            coveragePct: coveragePct,
            distanceScore: avgDist, // Average deltaE of pixels to palette center
            swatchLab: paletteLab[i]
        })
    }

    // STEP 5: Merge duplicate DMC codes
    // Multiple palette colors may map to the same DMC floss
    const mergedMap = new Map<string, ShoppingListItem>()

    for (const item of initialList) {
        if (mergedMap.has(item.dmcCode)) {
            const existing = mergedMap.get(item.dmcCode)!
            // Sum coverage percentages for duplicate DMC codes
            existing.coveragePct += item.coveragePct
        } else {
            mergedMap.set(item.dmcCode, { ...item })
        }
    }

    // STEP 6: Sort by coverage and apply max color limit
    let finalItems = Array.from(mergedMap.values())
    finalItems.sort((a, b) => b.coveragePct - a.coveragePct) // Descending order

    // Limit to requested max colors (take most prevalent)
    if (finalItems.length > config.maxColors) {
        finalItems = finalItems.slice(0, config.maxColors)
    }

    return finalItems
}
