import { rgbToLab, deltaE, Lab } from './colorUtils'
import { DMC_COLORS, findClosestDMCColors, DMCMatch } from './dmcFloss'

export interface ShoppingListItem {
    dmcCode: string
    dmcName: string
    dmcHex: string
    coveragePct: number
    distanceScore: number // Average distance of pixels mapped to this color
    swatchLab: Lab // The actual center color of this cluster
}

export interface PaletteConfig {
    maxColors: number
    detailLevel: 'low' | 'medium' | 'high'
    minCoverageThreshold: number // 0-1 (e.g., 0.01 for 1%)
}

// Helper to get image data from an HTMLImageElement
function getImageData(img: HTMLImageElement, maxSize: number): ImageData {
    const canvas = document.createElement('canvas')
    let { width, height } = img

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

// Basic Median Cut implementation for quantization
// Returns representative RGB colors
function medianCut(data: Uint8ClampedArray, colorCount: number): { r: number, g: number, b: number }[] {
    // Collect all pixels (stride for speed if needed)
    const pixels: { r: number, g: number, b: number }[] = []
    for (let i = 0; i < data.length; i += 4) {
        // Skip transparent
        if (data[i + 3] < 128) continue
        pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] })
    }

    if (pixels.length === 0) return []

    // Recursive function to split boxes
    const boxes: { r: number, g: number, b: number }[][] = [pixels]

    while (boxes.length < colorCount) {
        // Find box with largest range in any dimension
        let maxRange = -1
        let splitIndex = -1
        let splitChannel: 'r' | 'g' | 'b' = 'r'

        for (let i = 0; i < boxes.length; i++) {
            const box = boxes[i]
            if (box.length === 0) continue

            let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0

            for (const p of box) {
                minR = Math.min(minR, p.r); maxR = Math.max(maxR, p.r)
                minG = Math.min(minG, p.g); maxG = Math.max(maxG, p.g)
                minB = Math.min(minB, p.b); maxB = Math.max(maxB, p.b)
            }

            const rRange = maxR - minR
            const gRange = maxG - minG
            const bRange = maxB - minB

            const boxMaxRange = Math.max(rRange, gRange, bRange)

            if (boxMaxRange > maxRange) {
                maxRange = boxMaxRange
                splitIndex = i
                splitChannel = rRange >= gRange && rRange >= bRange ? 'r' : (gRange >= bRange ? 'g' : 'b')
            }
        }

        if (splitIndex === -1) break // Cannot split further

        const boxToSplit = boxes[splitIndex]

        // Sort by largest range channel
        boxToSplit.sort((a, b) => a[splitChannel] - b[splitChannel])

        // Split
        const mid = Math.floor(boxToSplit.length / 2)
        const box1 = boxToSplit.slice(0, mid)
        const box2 = boxToSplit.slice(mid)

        boxes.splice(splitIndex, 1, box1, box2)
    }

    // Average colors in each box
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

export async function generateShoppingList(
    image: HTMLImageElement,
    config: PaletteConfig
): Promise<ShoppingListItem[]> {
    // 1. Get Image Data (Downscaled for performance)
    // For coverage, we want reasonable resolution (e.g. 600px)
    // For quantization, we can go smaller or sample
    const coverageSize = config.detailLevel === 'high' ? 800 : (config.detailLevel === 'medium' ? 600 : 400)
    const imageData = getImageData(image, coverageSize)
    const data = imageData.data

    // 2. Quantize
    // Using Median Cut to find representative colors
    // Adjust quantization count based on request + buffer to allow merging
    const quantizeCount = Math.min(config.maxColors * 2, 64)
    const paletteRGB = medianCut(data, quantizeCount)

    // 3. Map palette to DMC and Coverage
    const pixelCount = data.length / 4
    const counts = new Map<number, number>() // Index in palette -> count
    const distAccumulator = new Map<number, number>() // Index in palette -> total distance

    // Pre-convert palette to Lab
    const paletteLab = paletteRGB.map(c => rgbToLab(c.r, c.g, c.b))

    // Iterate all pixels to assign to nearest palette color
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue // Skip transparent

        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const lab = rgbToLab(r, g, b)

        // Find nearest palette color
        let minDist = Infinity
        let nearestIdx = -1

        for (let j = 0; j < paletteLab.length; j++) {
            const d = deltaE(lab, paletteLab[j])
            if (d < minDist) {
                minDist = d
                nearestIdx = j
            }
        }

        if (nearestIdx !== -1) {
            counts.set(nearestIdx, (counts.get(nearestIdx) || 0) + 1)
            distAccumulator.set(nearestIdx, (distAccumulator.get(nearestIdx) || 0) + minDist)
        }
    }

    // 4. Create initial list
    const initialList: ShoppingListItem[] = []

    for (let i = 0; i < paletteRGB.length; i++) {
        const count = counts.get(i) || 0
        if (count === 0) continue

        const coveragePct = (count / pixelCount) * 100
        if (coveragePct < config.minCoverageThreshold * 100) continue

        const avgDist = (distAccumulator.get(i) || 0) / count
        const dmcMatches = findClosestDMCColors(paletteRGB[i], 1)
        const bestMatch = dmcMatches[0]

        initialList.push({
            dmcCode: bestMatch.number,
            dmcName: bestMatch.name,
            dmcHex: bestMatch.hex,
            coveragePct: coveragePct,
            distanceScore: avgDist, // This is technically quantization error + dmc error? No, just quantization error relative to palette center. 
            // Actually `findClosestDMCColors` gives us the error from palette to DMC. 
            // Current `distanceScore` is just how well the palette represents the pixels.
            // Let's store that but maybe we want the DMC match quality too? 
            // Simplification: just use coverage for sorting.
            swatchLab: paletteLab[i]
        })
    }

    // 5. Merge duplicates (Same DMC code)
    const mergedMap = new Map<string, ShoppingListItem>()

    for (const item of initialList) {
        if (mergedMap.has(item.dmcCode)) {
            const existing = mergedMap.get(item.dmcCode)!
            existing.coveragePct += item.coveragePct
            // Weighted average for distance? Or just keep min?
            // Let's just sum coverage.
        } else {
            mergedMap.set(item.dmcCode, { ...item })
        }
    }

    // 6. Sort and Limit
    let finalItems = Array.from(mergedMap.values())
    finalItems.sort((a, b) => b.coveragePct - a.coveragePct)

    if (finalItems.length > config.maxColors) {
        finalItems = finalItems.slice(0, config.maxColors)
    }

    return finalItems
}
