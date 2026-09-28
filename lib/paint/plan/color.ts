/**
 * Color conversions for plan code. OKLab here is the plain L, a, b of Björn Ottosson's
 * definition (L 0..1), matching what spectral.js reports, not scaled by 100.
 */
export type Oklab = [number, number, number]

const SRGB_TO_LINEAR = new Float64Array(256).map((_, i) => {
    const c = i / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
})

export function srgb8ToOklab(r: number, g: number, b: number): Oklab {
    const lr = SRGB_TO_LINEAR[r]
    const lg = SRGB_TO_LINEAR[g]
    const lb = SRGB_TO_LINEAR[b]
    const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
    const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
    const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
    return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ]
}

const toSrgb8 = (linear: number) => {
    const c = Math.min(1, Math.max(0, linear))
    return Math.round((c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055) * 255)
}

/** OKLab to 8-bit sRGB, clipped to the gamut. */
export function oklabToSrgb8(L: number, a: number, b: number): [number, number, number] {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
    return [
        toSrgb8(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
        toSrgb8(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
        toSrgb8(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    ]
}

export function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
}

export function hexToRgb(hex: string): [number, number, number] {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}

export function oklabToHex(L: number, a: number, b: number): string {
    return rgbToHex(...oklabToSrgb8(L, a, b))
}
