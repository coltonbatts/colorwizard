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
