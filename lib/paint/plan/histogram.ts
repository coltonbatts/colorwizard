/**
 * A picture as a color histogram: each distinct color once, with how many pixels have
 * it. Everything in the plan (clustering, scoring) works on this, so pixel counts are
 * the area weights and identical pictures always give identical histograms.
 */
import { srgb8ToOklab } from './color'

export interface Histogram {
    /** Number of distinct colors */
    size: number
    /** 8-bit sRGB, 3 bytes per color, in ascending packed-RGB order */
    rgb: Uint8Array
    /** Pixels per color */
    count: Float64Array
    /** OKLab (L, a, b), 3 numbers per color */
    oklab: Float64Array
    /** Total pixels counted */
    total: number
}

export interface HistogramOptions {
    /** Pixels with alpha below this are ignored (default 128) */
    alphaMin?: number
    /**
     * Keep only this many high bits of each channel (1..8, default 8). Fewer bits merge
     * near colors, which makes a much smaller histogram for fitting; the merged color is
     * the bucket's pixel-count-weighted mean, so nothing drifts. Score on the full one.
     */
    bits?: number
}

/** `rgba` is 4 bytes per pixel, as ImageData.data or a decoded PNG. */
export function buildHistogram(rgba: ArrayLike<number>, options: HistogramOptions = {}): Histogram {
    const alphaMin = options.alphaMin ?? 128
    const bits = options.bits ?? 8
    const shift = 8 - bits
    const counts = new Map<number, number>()
    const sums = shift > 0 ? new Map<number, [number, number, number]>() : null

    for (let i = 0; i + 3 < rgba.length; i += 4) {
        if (rgba[i + 3] < alphaMin) continue
        const r = rgba[i]
        const g = rgba[i + 1]
        const b = rgba[i + 2]
        const key = ((r >> shift) << 16) | ((g >> shift) << 8) | (b >> shift)
        counts.set(key, (counts.get(key) ?? 0) + 1)
        if (sums) {
            const sum = sums.get(key)
            if (sum) {
                sum[0] += r
                sum[1] += g
                sum[2] += b
            } else sums.set(key, [r, g, b])
        }
    }

    const keys = [...counts.keys()].sort((a, b) => a - b)
    const size = keys.length
    const rgb = new Uint8Array(size * 3)
    const count = new Float64Array(size)
    const oklab = new Float64Array(size * 3)
    let total = 0
    keys.forEach((key, i) => {
        const n = counts.get(key)!
        const sum = sums?.get(key)
        const r = sum ? Math.round(sum[0] / n) : key >> 16
        const g = sum ? Math.round(sum[1] / n) : (key >> 8) & 255
        const b = sum ? Math.round(sum[2] / n) : key & 255
        rgb.set([r, g, b], i * 3)
        count[i] = n
        total += n
        oklab.set(srgb8ToOklab(r, g, b), i * 3)
    })
    return { size, rgb, count, oklab, total }
}

/**
 * Merge a histogram's near colors so it has at most `maxColors` entries: the finest
 * bit depth that fits. Each merged color is the pixel-weighted mean of what it replaces.
 * Plans FIT on this and are SCORED on the full histogram.
 */
export function coarsenHistogram(hist: Histogram, maxColors: number): Histogram {
    if (hist.size <= maxColors) return hist
    for (let bits = 7; bits >= 1; bits--) {
        const shift = 8 - bits
        const groups = new Map<number, [number, number, number, number]>()
        for (let i = 0; i < hist.size; i++) {
            const n = hist.count[i]
            const key = ((hist.rgb[i * 3] >> shift) << 16) | ((hist.rgb[i * 3 + 1] >> shift) << 8) | (hist.rgb[i * 3 + 2] >> shift)
            const g = groups.get(key)
            if (g) {
                g[0] += n
                g[1] += n * hist.rgb[i * 3]
                g[2] += n * hist.rgb[i * 3 + 1]
                g[3] += n * hist.rgb[i * 3 + 2]
            } else groups.set(key, [n, n * hist.rgb[i * 3], n * hist.rgb[i * 3 + 1], n * hist.rgb[i * 3 + 2]])
        }
        if (groups.size > maxColors && bits > 1) continue
        const keys = [...groups.keys()].sort((a, b) => a - b)
        const rgb = new Uint8Array(keys.length * 3)
        const count = new Float64Array(keys.length)
        const oklab = new Float64Array(keys.length * 3)
        keys.forEach((key, i) => {
            const [n, r, g, b] = groups.get(key)!
            rgb.set([Math.round(r / n), Math.round(g / n), Math.round(b / n)], i * 3)
            count[i] = n
            oklab.set(srgb8ToOklab(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]), i * 3)
        })
        return { size: keys.length, rgb, count, oklab, total: hist.total }
    }
    return hist
}
