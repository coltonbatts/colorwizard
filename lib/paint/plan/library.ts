/**
 * The recipe library: every whole-part recipe a palette can make (up to a few pigments and
 * a few parts), each with its predicted swatch. Plans choose piles from this table instead
 * of asking the per-color solver, which lets them
 *   - judge candidates by the metric users see (ΔE00 of the predicted swatch), not the
 *     solver's OKLab objective,
 *   - get whole-part recipes by construction (no "no clean ratio" piles), and
 *   - plan with no solver calls at all.
 *
 * Swatches come from the same spectral.js mix the solver's printed recipes use
 * (mixPigmentsSync with the parts as weights), so a library recipe means what a solver
 * recipe means. Like everything here it is a MODEL prediction, not measured paint.
 */
import { converter } from 'culori'
import { getPaletteColors, getSpectralSync, getPigmentColorSync, isSpectralAvailable, registerPigments } from '../../spectral/adapter'
import type { Pigment } from '../../spectral/types'
import type { Color as SpectralColor } from 'spectral.js'
import { hexToRgb } from './color'

const toLab = converter('lab65')

export interface LibraryOptions {
    /** Most pigments in one recipe (default 4, the most the solver uses) */
    maxPigments?: number
    /** Most total parts in a recipe (default 16, the solver's limit) */
    maxParts?: number
    /** Cap on recipes per pigment-count, so palettes with many tubes stay tractable (default 45000) */
    maxPerSize?: number
}

export interface RecipeLibrary {
    key: string
    pigments: Pigment[]
    size: number
    /** CIELAB D65 (l, a, b) of each recipe's predicted swatch, 3 per recipe */
    lab: Float64Array
    /** Predicted swatch as 8-bit sRGB (what recipe.predictedHex would say), 3 per recipe */
    rgb: Uint8Array
    /** Parts of each pigment, `pigments.length` per recipe (0 when unused) */
    parts: Uint8Array
    totalParts: Uint8Array
    pigmentCount: Uint8Array
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

/** All ways to split `total` into `slots` positive integers. */
function* compositions(total: number, slots: number): Generator<number[]> {
    if (slots === 1) {
        yield [total]
        return
    }
    for (let first = 1; first <= total - (slots - 1); first++) for (const rest of compositions(total - first, slots - 1)) yield [first, ...rest]
}

function* subsets(n: number, size: number, start = 0): Generator<number[]> {
    if (size === 0) {
        yield []
        return
    }
    for (let i = start; i <= n - size; i++) for (const tail of subsets(n, size - 1, i + 1)) yield [i, ...tail]
}

const binomial = (n: number, k: number) => {
    let out = 1
    for (let i = 1; i <= k; i++) out = (out * (n - k + i)) / i
    return Math.round(out)
}

/** Number of recipes with `size` pigments (all present) and at most `parts` total, ratios not reduced. */
const recipesUpTo = (size: number, parts: number) => binomial(parts, size)

/** Largest parts limit (≤ maxParts) at which one pigment-count stays within the cap. */
function partsLimit(n: number, size: number, maxParts: number, cap: number): number {
    let parts = maxParts
    while (parts > size && binomial(n, size) * recipesUpTo(size, parts) > cap) parts--
    return parts
}

const libraryCache = new Map<string, Promise<RecipeLibrary>>()

export function libraryKey(pigments: Pigment[], options: LibraryOptions = {}): string {
    return [pigments.map((p) => `${p.id}:${p.hex}:${p.tintingStrength}`).join(','), options.maxPigments ?? 4, options.maxParts ?? 16, options.maxPerSize ?? 45000].join('|')
}

export function getLibrary(pigments: Pigment[], options: LibraryOptions = {}): Promise<RecipeLibrary> {
    const key = libraryKey(pigments, options)
    let library = libraryCache.get(key)
    if (!library) {
        library = buildLibrary(pigments, options, key)
        libraryCache.set(key, library)
    }
    return library
}

export async function buildLibrary(pigments: Pigment[], options: LibraryOptions = {}, key = libraryKey(pigments, options)): Promise<RecipeLibrary> {
    if (pigments.length === 0) throw new Error('Palette must contain at least one color')
    if (!(await isSpectralAvailable())) throw new Error('spectral.js is not available')
    await getPaletteColors()
    await registerPigments(pigments.map((p) => ({ id: p.id, hex: p.hex, tintingStrength: p.tintingStrength })))

    const spectral = getSpectralSync()
    const colors: SpectralColor[] = pigments.map((p) => getPigmentColorSync(p.id))
    const n = pigments.length
    const maxPigments = Math.min(options.maxPigments ?? 4, n)
    const maxParts = options.maxParts ?? 16
    const cap = options.maxPerSize ?? 45000

    const labs: number[] = []
    const rgbs: number[] = []
    const partsOut: number[] = []
    const totals: number[] = []
    const counts: number[] = []

    for (let size = 1; size <= maxPigments; size++) {
        const limit = size === 1 ? 1 : partsLimit(n, size, maxParts, cap)
        for (const ids of subsets(n, size)) {
            for (let total = size; total <= limit; total++) {
                if (size === 1 && total > 1) break
                for (const split of compositions(total, size)) {
                    if (size > 1 && split.reduce(gcd) > 1) continue
                    const args: Array<[SpectralColor, number]> = ids.map((id, i) => [colors[id], split[i]])
                    const hex = spectral.mix(...args).toString({ format: 'hex' })
                    const lab = toLab(hex)!
                    labs.push(lab.l, lab.a, lab.b)
                    rgbs.push(...hexToRgb(hex))
                    const row = new Array<number>(n).fill(0)
                    ids.forEach((id, i) => (row[id] = split[i]))
                    partsOut.push(...row)
                    totals.push(total)
                    counts.push(size)
                }
            }
        }
    }

    return {
        key,
        pigments,
        size: totals.length,
        lab: Float64Array.from(labs),
        rgb: Uint8Array.from(rgbs),
        parts: Uint8Array.from(partsOut),
        totalParts: Uint8Array.from(totals),
        pigmentCount: Uint8Array.from(counts),
    }
}
