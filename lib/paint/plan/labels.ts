/**
 * Where to print pile numbers on the repainted picture, so a painter can see which pile goes
 * where without a color key. Pure, deterministic, React-free.
 *
 * A number sits in a round badge. A badge hides the pixels under it, so what tells the reader
 * "this is pile 4" is the color around it. A spot is therefore scored by PURITY: the share of
 * the disc `surround` x the badge radius (badge and a ring around it) that belongs to the pile.
 * A badge goes where its own pile has the highest purity, at least `minPurity`, with the
 * badge's center on a pixel of its own pile, as deep inside the region as ties allow. Two
 * badges never touch. A pile with no such spot (a thin band, a speckle) is reported as
 * unlabeled instead of being drawn over other piles: the card says so.
 *
 * Coordinates are in pixels of the pile map; a pixel (x, y) covers [x, x+1) x [y, y+1), and a
 * label's (x, y) is the pixel it is centered on (draw it at x + 0.5, y + 0.5).
 */

export interface LabelOptions {
    /** Badge radius, in pixels of the pile map */
    radius: number
    /** Least share (0..1) of the disc around a badge that must belong to its pile (default 0.6) */
    minPurity?: number
    /** The disc purity is measured on, in badge radii: the badge plus a ring around it (default 1.4) */
    surround?: number
    /** Room between two badges, in radii: centers are at least (2 + gap) radii apart (default 0.5) */
    gap?: number
    /** Most badges per pile (default 1). Later badges need a much cleaner spot and sit far from the pile's earlier ones. */
    perPile?: number
}

export interface PlacedLabel {
    pile: number
    x: number
    y: number
}

export interface LabelPlacement {
    labels: PlacedLabel[]
    /** Piles that own pixels but have no room for a badge, ascending */
    unlabeled: number[]
}

export const DEFAULT_MIN_PURITY = 0.6
export const DEFAULT_SURROUND = 1.4
const FAR = 1e9

/** One dimension of the squared Euclidean distance transform (Felzenszwalb and Huttenlocher). */
function edt1d(f: Float64Array, n: number, out: Float64Array, v: Int32Array, z: Float64Array): void {
    let k = 0
    v[0] = 0
    z[0] = -1e20
    z[1] = 1e20
    for (let q = 1; q < n; q++) {
        let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
        while (s <= z[k]) {
            k--
            s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
        }
        k++
        v[k] = q
        z[k] = s
        z[k + 1] = 1e20
    }
    k = 0
    for (let q = 0; q < n; q++) {
        while (z[k + 1] < q) k++
        out[q] = (q - v[k]) * (q - v[k]) + f[v[k]]
    }
}

/**
 * For every pixel of `pile` (the pile map), the distance to the nearest pixel that is not
 * pile `id`; the outside of the picture counts as not pile `id`. 0 for pixels of other piles.
 */
export function distanceToOtherPiles(pile: Uint8Array, width: number, height: number, id: number): Float32Array {
    const w = width + 2
    const h = height + 2
    const grid = new Float64Array(w * h)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (pile[y * width + x] === id) grid[(y + 1) * w + x + 1] = FAR

    const n = Math.max(w, h)
    const line = new Float64Array(n)
    const out = new Float64Array(n)
    const v = new Int32Array(n)
    const z = new Float64Array(n + 1)
    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) line[y] = grid[y * w + x]
        edt1d(line, h, out, v, z)
        for (let y = 0; y < h; y++) grid[y * w + x] = out[y]
    }
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) line[x] = grid[y * w + x]
        edt1d(line, w, out, v, z)
        for (let x = 0; x < w; x++) grid[y * w + x] = out[x]
    }

    const dist = new Float32Array(width * height)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) dist[y * width + x] = pile[y * width + x] === id ? Math.sqrt(grid[(y + 1) * w + x + 1]) : 0
    return dist
}

/** Half-width of each row of the disc of radius `rad`: pixels whose centers are within `rad` of the center. */
function discSpans(rad: number): { half: number[]; size: number } {
    const reach = Math.floor(rad)
    const half: number[] = []
    let size = 0
    for (let dy = -reach; dy <= reach; dy++) {
        const h = Math.floor(Math.sqrt(Math.max(0, rad * rad - dy * dy)))
        half.push(h)
        size += 2 * h + 1
    }
    return { half, size }
}

/**
 * Pixels of pile `id` inside the disc of radius `rad` around every pixel of pile `id`, as a
 * share (0..1) of the disc's pixels. Outside the picture counts as not the pile. 0 elsewhere.
 */
export function purityMap(pile: Uint8Array, width: number, height: number, id: number, rad: number): Float32Array {
    const { half, size } = discSpans(rad)
    const reach = half.length >> 1
    const stride = width + 1
    const rows = new Int32Array(height * stride) // prefix sums of "is pile id" along each row
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) rows[y * stride + x + 1] = rows[y * stride + x] + (pile[y * width + x] === id ? 1 : 0)

    const out = new Float32Array(width * height)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (pile[y * width + x] !== id) continue
            let owned = 0
            for (let dy = -reach; dy <= reach; dy++) {
                const yy = y + dy
                if (yy < 0 || yy >= height) continue
                const h = half[dy + reach]
                const lo = Math.max(0, x - h)
                const hi = Math.min(width - 1, x + h)
                owned += rows[yy * stride + hi + 1] - rows[yy * stride + lo]
            }
            out[y * width + x] = owned / size
        }
    }
    return out
}

export function placeLabels(pile: Uint8Array, width: number, height: number, count: number, options: LabelOptions): LabelPlacement {
    const r = options.radius
    const minPurity = options.minPurity ?? DEFAULT_MIN_PURITY
    const surround = options.surround ?? DEFAULT_SURROUND
    const apart = (2 + (options.gap ?? 0.5)) * r
    const perPile = Math.max(1, options.perPile ?? 1)

    // score = purity, then depth inside the region (so a clean region gets its badge in the middle, not at a corner)
    const purity: Float32Array[] = []
    const score: Float32Array[] = []
    const purest = new Float64Array(count)
    for (let p = 0; p < count; p++) {
        const pur = purityMap(pile, width, height, p, r * surround)
        const dist = distanceToOtherPiles(pile, width, height, p)
        const s = new Float32Array(pur.length)
        for (let i = 0; i < pur.length; i++) {
            if (pur[i] === 0) continue
            s[i] = pur[i] + Math.min(dist[i] / (4 * r), 1) / 1000
            if (pur[i] > purest[p]) purest[p] = pur[i]
        }
        purity.push(pur)
        score.push(s)
    }

    const labels: PlacedLabel[] = []
    const clear = (x: number, y: number) => labels.every((l) => (l.x - x) ** 2 + (l.y - y) ** 2 >= apart * apart)

    /**
     * The best-scoring spot in pile p that is pure enough, clear of every badge, and `far` from p's own.
     * Where many spots tie (a long ridge of equal depth, a flat deep interior) the one nearest
     * the middle of the tie wins, so a badge sits in the middle of a stripe, not at its top.
     */
    const best = (p: number, min: number, far: number) => {
        const s = score[p]
        const own = labels.filter((l) => l.pile === p)
        const admissible = (i: number) => {
            if (purity[p][i] < min) return false
            const x = i % width
            const y = (i - x) / width
            if (!clear(x, y)) return false
            return far <= 0 || !own.some((l) => (l.x - x) ** 2 + (l.y - y) ** 2 < far * far)
        }
        let bestS = -1
        for (let i = 0; i < s.length; i++) if (s[i] > bestS && admissible(i)) bestS = s[i]
        if (bestS < 0) return -1
        const tied: number[] = []
        let sx = 0
        let sy = 0
        for (let i = 0; i < s.length; i++) {
            if (s[i] < bestS - 1e-6 || !admissible(i)) continue
            tied.push(i)
            sx += i % width
            sy += Math.floor(i / width)
        }
        const cx = sx / tied.length
        const cy = sy / tied.length
        let bestAt = tied[0]
        let bestD = Infinity
        for (const i of tied) {
            const d = ((i % width) - cx) ** 2 + (Math.floor(i / width) - cy) ** 2
            if (d < bestD) {
                bestD = d
                bestAt = i
            }
        }
        return bestAt
    }
    const at = (i: number, p: number): PlacedLabel => ({ pile: p, x: i % width, y: (i - (i % width)) / width })

    // Piles with the least room choose first: they have the fewest places to go.
    const order = Array.from({ length: count }, (_, p) => p)
        .filter((p) => purest[p] >= minPurity)
        .sort((a, b) => purest[a] - purest[b] || a - b)
    for (const p of order) {
        const i = best(p, minPurity, 0)
        if (i >= 0) labels.push(at(i, p))
    }

    // Big or scattered piles get more badges, far apart, once everyone has one.
    for (let round = 1; round < perPile; round++) {
        for (let p = 0; p < count; p++) {
            if (!labels.some((l) => l.pile === p)) continue
            const i = best(p, Math.max(minPurity, 0.9), 8 * r)
            if (i >= 0) labels.push(at(i, p))
        }
    }

    const labeled = new Set(labels.map((l) => l.pile))
    const owns = new Uint8Array(count)
    for (let i = 0; i < pile.length; i++) if (pile[i] < count) owns[pile[i]] = 1
    const unlabeled = Array.from({ length: count }, (_, p) => p).filter((p) => owns[p] && !labeled.has(p))
    labels.sort((a, b) => a.pile - b.pile || a.y - b.y || a.x - b.x)
    return { labels, unlabeled }
}
