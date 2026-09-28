/**
 * A tiny procedural painting toolkit for the plan corpus: smooth-shaded shapes,
 * gradients and fractal noise, composited in linear light and written out as sRGB.
 * Everything is deterministic (no Math.random), so the corpus can be regenerated
 * byte for byte.
 */
import { seededRandom } from '../rng'
import type { RawImage } from './png'

/** Linear-light RGB, 0..1 */
export type RGB = [number, number, number]
type Layer = readonly [RGB, number]

/** Design-space size; the canvas renders at `scale`× this and is box-filtered down. */
export const DESIGN_W = 256
export const DESIGN_H = 192

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toSrgb = (c: number) => {
    const v = Math.min(1, Math.max(0, c))
    return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
}

export const hex = (h: string): RGB => [1, 3, 5].map((i) => toLinear(parseInt(h.slice(i, i + 2), 16) / 255)) as RGB
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
export const scale = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k]
export const add = (a: RGB, b: RGB): RGB => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const smoothstep = (e0: number, e1: number, x: number) => {
    const t = clamp01((x - e0) / (e1 - e0))
    return t * t * (3 - 2 * t)
}

/** Piecewise-linear ramp through [t, color] stops (colors interpolate in linear light). */
export function ramp(stops: Array<[number, RGB]>, t: number): RGB {
    if (t <= stops[0][0]) return stops[0][1]
    for (let i = 1; i < stops.length; i++) {
        if (t <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]))
    }
    return stops[stops.length - 1][1]
}

// --- noise ------------------------------------------------------------------

function hash(ix: number, iy: number, seed: number): number {
    let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 2147483647)
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export function valueNoise(x: number, y: number, seed = 0): number {
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const fx = x - ix
    const fy = y - iy
    const sx = fx * fx * (3 - 2 * fx)
    const sy = fy * fy * (3 - 2 * fy)
    const top = hash(ix, iy, seed) * (1 - sx) + hash(ix + 1, iy, seed) * sx
    const bottom = hash(ix, iy + 1, seed) * (1 - sx) + hash(ix + 1, iy + 1, seed) * sx
    return top * (1 - sy) + bottom * sy
}

/** Fractal noise in 0..1 */
export function fbm(x: number, y: number, octaves = 4, seed = 0): number {
    let sum = 0
    let amp = 0.5
    let norm = 0
    let f = 1
    for (let o = 0; o < octaves; o++) {
        sum += amp * valueNoise(x * f, y * f, seed + o * 17)
        norm += amp
        amp *= 0.5
        f *= 2
    }
    return sum / norm
}

// --- shapes -----------------------------------------------------------------

/** Anti-aliased coverage (0..1) from a signed distance in design units; `soft` widens the edge. */
export const cover = (signedDistance: number, soft = 0.8) => clamp01(0.5 - signedDistance / soft)

export const ellipseSd = (u: number, v: number, cx: number, cy: number, rx: number, ry: number) =>
    (Math.hypot((u - cx) / rx, (v - cy) / ry) - 1) * Math.min(rx, ry)

export const rectSd = (u: number, v: number, x0: number, y0: number, x1: number, y1: number) => {
    const dx = Math.max(x0 - u, u - x1)
    const dy = Math.max(y0 - v, v - y1)
    return dx > 0 && dy > 0 ? Math.hypot(dx, dy) : Math.max(dx, dy)
}

/** Lambert term for a point on an ellipsoid of radii (rx, ry) centered at (cx, cy). */
export function ellipsoidLight(u: number, v: number, cx: number, cy: number, rx: number, ry: number, light: [number, number, number]) {
    const nx = (u - cx) / rx
    const ny = (v - cy) / ry
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))
    const len = Math.hypot(...light)
    return { lambert: clamp01((nx * light[0] + ny * light[1] + nz * light[2]) / len), nx, ny, nz }
}

// --- canvas -----------------------------------------------------------------

export class Canvas {
    readonly width: number
    readonly height: number
    readonly data: Float32Array

    constructor(readonly ss = 2) {
        this.width = DESIGN_W * ss
        this.height = DESIGN_H * ss
        this.data = new Float32Array(this.width * this.height * 3)
    }

    /** Composite `fn(u, v)` over the canvas; return null (or alpha 0) to leave a pixel alone. */
    paint(fn: (u: number, v: number) => Layer | null): void {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const layer = fn((x + 0.5) / this.ss, (y + 0.5) / this.ss)
                if (!layer || layer[1] <= 0) continue
                const [color, alpha] = layer
                const i = (y * this.width + x) * 3
                const a = Math.min(1, alpha)
                this.data[i] += (color[0] - this.data[i]) * a
                this.data[i + 1] += (color[1] - this.data[i + 1]) * a
                this.data[i + 2] += (color[2] - this.data[i + 2]) * a
            }
        }
    }

    /**
     * Box-filter to the design size, convert to sRGB, add faint sensor noise (σ ≈ 1 level,
     * seeded) and return 8-bit RGBA. `exposure` scales linear light before clipping.
     */
    toImage(seed: number, exposure = 1): RawImage {
        const rand = seededRandom(seed)
        const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())
        const data = new Uint8Array(DESIGN_W * DESIGN_H * 4)
        for (let y = 0; y < DESIGN_H; y++) {
            for (let x = 0; x < DESIGN_W; x++) {
                const out = (y * DESIGN_W + x) * 4
                for (let c = 0; c < 3; c++) {
                    let sum = 0
                    for (let dy = 0; dy < this.ss; dy++) {
                        for (let dx = 0; dx < this.ss; dx++) sum += this.data[((y * this.ss + dy) * this.width + x * this.ss + dx) * 3 + c]
                    }
                    const value = toSrgb((sum / (this.ss * this.ss)) * exposure) * 255 + gauss() * 1.0
                    data[out + c] = Math.min(255, Math.max(0, Math.round(value)))
                }
                data[out + 3] = 255
            }
        }
        return { width: DESIGN_W, height: DESIGN_H, data }
    }
}
