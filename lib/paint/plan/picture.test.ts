import { describe, expect, it } from 'vitest'
import { loadCorpus } from './fixtures/corpus'
import { PALETTES } from './benchmark'
import { NO_PILE, planPicture } from './picture'

const image = loadCorpus('synthetic').find((i) => i.name === 'portrait-light')!

describe('planPicture', () => {
    it('maps every pixel to a pile and agrees with the score it reports', async () => {
        const result = await planPicture(image.data, image.width, image.height, 8, PALETTES.core6.pigments)
        expect(result.pile).toHaveLength(image.width * image.height)
        expect(result.miss).toHaveLength(image.width * image.height)
        expect(Math.max(...result.pile)).toBeLessThan(result.plan.piles.length)
        expect(result.pile.includes(NO_PILE)).toBe(false)
        // The share of pixels flagged as misses is the score's "visibly off" share, and the map's pile shares are its areas.
        const share = result.miss.reduce((s, m) => s + m, 0) / result.miss.length
        expect(share).toBeCloseTo(result.score.visiblyOffArea, 9)
        const counts = new Array(result.plan.piles.length).fill(0)
        for (const p of result.pile) counts[p]++
        counts.forEach((c, i) => expect(c / result.pile.length).toBeCloseTo(result.score.pileAreas[i], 9))
    }, 30000)

    it('is deterministic', async () => {
        const a = await planPicture(image.data, image.width, image.height, 5, PALETTES.core6.pigments)
        const b = await planPicture(image.data, image.width, image.height, 5, PALETTES.core6.pigments)
        expect(Buffer.from(a.pile).equals(Buffer.from(b.pile))).toBe(true)
        expect(a.plan.piles.map((p) => p.recipe.predictedHex)).toEqual(b.plan.piles.map((p) => p.recipe.predictedHex))
    }, 30000)

    it('leaves transparent pixels out of every pile', async () => {
        const data = new Uint8Array(image.data)
        for (let p = 0; p < 100; p++) data[p * 4 + 3] = 0
        const result = await planPicture(data, image.width, image.height, 5, PALETTES.core6.pigments)
        for (let p = 0; p < 100; p++) expect(result.pile[p]).toBe(NO_PILE)
        expect(result.pile[100]).not.toBe(NO_PILE)
    }, 30000)

    it('refuses a picture with nothing to plan', async () => {
        await expect(planPicture(new Uint8Array(16), 2, 2, 5, PALETTES.core6.pigments)).rejects.toThrow()
    })
})
