import { converter } from 'culori'
import { describe, expect, it } from 'vitest'
import type { SpectralRecipe } from '../../spectral/types'
import { hexToRgb, oklabToSrgb8, rgbToHex, srgb8ToOklab } from './color'
import { loadCorpus } from './fixtures/corpus'
import { buildHistogram } from './histogram'
import { kmeans } from './kmeans'
import { assignPixels, scorePlan } from './metrics'
import type { Plan, PlanPile } from './types'

/** RGBA pixels: `colors` is [hex, how many pixels]. */
function pixels(colors: Array<[string, number]>): Uint8Array {
    const out: number[] = []
    for (const [hex, n] of colors) for (let i = 0; i < n; i++) out.push(...hexToRgb(hex), 255)
    return Uint8Array.from(out)
}

function pile(targetHex: string, swatchHex: string, over: Partial<SpectralRecipe> = {}, pigments = ['titanium-white', 'ivory-black']): PlanPile {
    const recipe: SpectralRecipe = {
        ingredients: pigments.map((id, i) => ({ pigment: { id, name: id, hex: '#000000', tintingStrength: 1 }, weight: 1 / pigments.length, percentage: '50%', parts: i + 1 })),
        predictedHex: swatchHex,
        error: 0,
        error00: 0,
        matchQuality: 'Excellent',
        paintable: true,
        totalParts: 3,
        steps: [],
        ...over,
    }
    return { targetHex, recipe, area: 0 }
}

describe('color conversion', () => {
    const oklab = converter('oklab')

    it('agrees with culori and round-trips every 8-bit color it is given', () => {
        for (let r = 0; r < 256; r += 51) for (let g = 0; g < 256; g += 51) for (let b = 0; b < 256; b += 51) {
            const [L, a, bb] = srgb8ToOklab(r, g, b)
            const ref = oklab({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 })!
            expect(Math.abs(L - ref.l)).toBeLessThan(2e-3)
            expect(Math.abs(a - ref.a)).toBeLessThan(2e-3)
            expect(Math.abs(bb - ref.b)).toBeLessThan(2e-3)
            expect(oklabToSrgb8(L, a, bb)).toEqual([r, g, b])
        }
    })

    it('clips out-of-gamut OKLab to valid sRGB', () => {
        for (const value of oklabToSrgb8(0.7, 0.4, 0.3)) expect(value).toBeGreaterThanOrEqual(0)
        expect(rgbToHex(0, 15, 255)).toBe('#000FFF')
    })
})

describe('histogram', () => {
    it('counts each color once, skips transparent pixels, and is order-stable', () => {
        const data = pixels([['#FF0000', 2], ['#0000FF', 1]])
        const withAlpha = Uint8Array.from([...data, 9, 9, 9, 0])
        const hist = buildHistogram(withAlpha)
        expect(hist.size).toBe(2)
        expect(hist.total).toBe(3)
        expect([...hist.count]).toEqual([1, 2]) // blue (0x0000FF) sorts before red (0xFF0000)
        expect([...hist.rgb]).toEqual([0, 0, 255, 255, 0, 0])
    })

    it('merges near colors at fewer bits without moving the color', () => {
        const hist = buildHistogram(pixels([['#FA0000', 3], ['#FD0000', 1]]), { bits: 4 })
        expect(hist.size).toBe(1)
        expect(hist.total).toBe(4)
        expect(hist.rgb[0]).toBe(251) // (3×250 + 253) / 4, rounded
    })
})

describe('k-means', () => {
    const cluster = (a: string, b: string) => buildHistogram(pixels([[a, 60], [b, 40], ['#101010', 25], ['#F0F0F0', 25]]))

    it('is deterministic for a seed, and different seeds may differ', () => {
        const hist = buildHistogram(loadCorpus('synthetic')[2].data)
        const a = kmeans(hist, 8, { seed: 3 })
        const b = kmeans(hist, 8, { seed: 3 })
        expect([...a.centers]).toEqual([...b.centers])
        expect([...a.assignment]).toEqual([...b.assignment])
    })

    it('orders clusters dark to light and reports area', () => {
        const result = kmeans(cluster('#C03020', '#2040C0'), 4)
        const lightness = Array.from({ length: result.k }, (_, c) => result.centers[c * 3])
        expect(lightness).toEqual([...lightness].sort((x, y) => x - y))
        expect(result.weight.reduce((s, w) => s + w, 0)).toBe(150)
    })

    it('is weighted by area: one cluster tracks the heavy color, not the midpoint', () => {
        const hist = buildHistogram(pixels([['#808080', 990], ['#FFFFFF', 10]]))
        const [L] = kmeans(hist, 1).centers
        const mid = srgb8ToOklab(0x80, 0x80, 0x80)[0]
        const white = srgb8ToOklab(255, 255, 255)[0]
        expect(L).toBeGreaterThan(mid)
        expect(L).toBeLessThan(mid + 0.02 * (white - mid) * 1.0 + 1e-9)
    })

    it('makes fewer clusters when the picture has fewer colors', () => {
        expect(kmeans(buildHistogram(pixels([['#FF0000', 5], ['#00FF00', 5]])), 8).k).toBe(2)
    })
})

describe('plan metrics', () => {
    const halves = buildHistogram(pixels([['#404040', 50], ['#E0E0E0', 50]]))

    it('scores a plan whose swatches are the picture colors as perfect', () => {
        const plan: Plan = { budget: 2, piles: [pile('#404040', '#404040'), pile('#E0E0E0', '#E0E0E0')] }
        const score = scorePlan(halves, plan)
        expect(score.meanDeltaE00).toBeCloseTo(0, 9)
        expect(score.p95DeltaE00).toBeCloseTo(0, 9)
        expect(score.unreachableArea).toBe(0)
        expect(score.visiblyOffArea).toBe(0)
        expect(score.pileAreas).toEqual([0.5, 0.5])
        expect(score.meanValueError).toBeCloseTo(0, 9)
    })

    it('measures the predicted swatch, not the color the pile was solved for', () => {
        // The pile was solved for the exact color, but the model predicts something else.
        const plan: Plan = { budget: 1, piles: [pile('#404040', '#808080')] }
        const one = buildHistogram(pixels([['#404040', 10]]))
        expect(scorePlan(one, plan).meanDeltaE00).toBeGreaterThan(15)
    })

    it('weights by area: a big well-matched region outweighs a small badly matched one', () => {
        const hist = buildHistogram(pixels([['#404040', 95], ['#E00000', 5]]))
        const plan: Plan = { budget: 1, piles: [pile('#404040', '#404040')] }
        const score = scorePlan(hist, plan)
        expect(score.visiblyOffArea).toBeCloseTo(0.05, 9)
        expect(score.meanDeltaE00).toBeGreaterThan(1)
        expect(score.meanDeltaE00).toBeLessThan(0.05 * 90)
        expect(score.p95DeltaE00).toBeCloseTo(0, 9) // the worst 5% is exactly at the 95th percentile boundary
    })

    it('counts unreachable area by the pile label, and totals parts and pigments', () => {
        const plan: Plan = {
            budget: 2,
            piles: [
                pile('#404040', '#404040'),
                pile('#E0E0E0', '#E0E0E0', { matchQuality: 'Poor', paintable: false, totalParts: undefined }, ['titanium-white', 'cadmium-red', 'phthalo-blue']),
            ],
        }
        const score = scorePlan(halves, plan)
        expect(score.unreachableArea).toBe(0.5)
        expect(score.totalParts).toBe(3) // the unpaintable pile adds none
        expect(score.unpaintablePiles).toBe(1)
        expect(score.distinctPigments).toBe(4)
        expect(score.pileCount).toBe(2)
    })

    it('flags piles that cover almost nothing', () => {
        const hist = buildHistogram(pixels([['#404040', 99], ['#E0E0E0', 1]]))
        const plan: Plan = { budget: 2, piles: [pile('#404040', '#404040'), pile('#E0E0E0', '#E0E0E0')] }
        expect(scorePlan(hist, plan).minorPiles).toBe(1)
    })

    it('assigns each color to its nearest swatch, which is never worse than assigning by target', () => {
        const hist = buildHistogram(loadCorpus('synthetic')[6].data)
        const plan: Plan = {
            budget: 3,
            piles: [pile('#202020', '#5A4A3A'), pile('#909090', '#A09080'), pile('#F0F0F0', '#E8E0D0')],
        }
        const swatch = scorePlan(hist, plan, 'swatch')
        const center = scorePlan(hist, plan, 'center')
        expect(swatch.meanDeltaE00).toBeLessThanOrEqual(center.meanDeltaE00 + 1e-9)
        const { pile: assigned } = assignPixels(hist, plan)
        expect(Math.max(...assigned)).toBeLessThan(3)
    })
})
