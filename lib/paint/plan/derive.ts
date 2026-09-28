/**
 * Derived piles: mix a pile from another pile instead of from scratch ("3 parts of pile A
 * plus 1 part white"). It buys two things the from-scratch library cannot: tints finer
 * than 16 whole parts allow (dilute a mid tint, in measurable steps), and fewer things to
 * measure. Only one level deep: a base is always a scratch pile.
 *
 * In the model a base counts as its pigments in the proportions of its recipe; k parts of
 * it plus d parts of a pigment is one pigment-level mix with those weights.
 */
import { converter } from 'culori'
import { getPigmentColorSync, getSpectralSync } from '../../spectral/adapter'
import type { Color as SpectralColor } from 'spectral.js'
import { hexToRgb } from './color'
import type { RecipeLibrary } from './library'

const toLab = converter('lab65')

export interface DeriveOptions {
    /** Most parts of the base pile in a derived recipe (default 8) */
    maxBaseParts?: number
    /** Most parts of the added pigment (default 8) */
    maxExtraParts?: number
}

export interface DerivedCandidate {
    baseParts: number
    pigment: number
    extraParts: number
    rgb: [number, number, number]
    lab: [number, number, number]
    /** Bit i set for each pigment the mix contains */
    mask: number
    /** Flattened pigment weights (sum 1), one per palette pigment */
    weights: Float64Array
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
const cache = new WeakMap<RecipeLibrary, Map<string, DerivedCandidate[]>>()

/** Every "k parts of the base + d parts of one pigment" mix, reduced, for one scratch pile. */
export function derivedCandidates(lib: RecipeLibrary, baseIndex: number, options: DeriveOptions = {}): DerivedCandidate[] {
    const maxBase = options.maxBaseParts ?? 8
    const maxExtra = options.maxExtraParts ?? 8
    let byBase = cache.get(lib)
    if (!byBase) cache.set(lib, (byBase = new Map()))
    const key = `${baseIndex}:${maxBase}:${maxExtra}`
    const hit = byBase.get(key)
    if (hit) return hit

    const n = lib.pigments.length
    const spectral = getSpectralSync()
    const colors: SpectralColor[] = lib.pigments.map((p) => getPigmentColorSync(p.id))
    const total = lib.totalParts[baseIndex]
    const out: DerivedCandidate[] = []
    for (let k = 1; k <= maxBase; k++) {
        for (let d = 1; d <= maxExtra; d++) {
            if (gcd(k, d) > 1) continue
            for (let pigment = 0; pigment < n; pigment++) {
                const w = new Float64Array(n)
                for (let i = 0; i < n; i++) w[i] = (k * lib.parts[baseIndex * n + i]) / total
                w[pigment] += d
                const sum = w.reduce((a, b) => a + b, 0)
                const args: Array<[SpectralColor, number]> = []
                let mask = 0
                for (let i = 0; i < n; i++) {
                    if (w[i] > 0) {
                        args.push([colors[i], w[i]])
                        if (i < 31) mask |= 1 << i
                    }
                }
                const hex = spectral.mix(...args).toString({ format: 'hex' })
                const lab = toLab(hex)!
                out.push({
                    baseParts: k,
                    pigment,
                    extraParts: d,
                    rgb: hexToRgb(hex),
                    lab: [lab.l, lab.a, lab.b],
                    mask,
                    weights: w.map((x) => x / sum),
                })
            }
        }
    }
    byBase.set(key, out)
    return out
}
