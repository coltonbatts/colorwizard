import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildHistogram } from '../histogram'
import { FIXTURES_DIR, loadCorpus } from './corpus'
import { decodePng, encodePng } from './png'

describe('corpus', () => {
    it('round-trips an image through the PNG codec', () => {
        const image = loadCorpus('synthetic')[0]
        const again = decodePng(encodePng(image))
        expect(again.width).toBe(image.width)
        expect(Buffer.from(again.data).equals(Buffer.from(image.data))).toBe(true)
    })

    it('has the regimes the benchmark needs, at a size the repo can carry', () => {
        const corpus = loadCorpus('synthetic')
        expect(corpus.map((image) => image.name)).toEqual([
            'fruit-saturated', 'high-key', 'interior-warm', 'landscape', 'low-key', 'portrait-deep', 'portrait-light', 'still-life-muted', 'sunset',
        ])
        for (const image of corpus) {
            expect(image.width).toBe(256)
            expect(image.height).toBe(192)
        }
        const bytes = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.png')).reduce((sum, f) => sum + statSync(join(FIXTURES_DIR, f)).size, 0)
        expect(bytes).toBeLessThan(2 * 1024 * 1024)
    })

    it('documents every image in the README', () => {
        const readme = readFileSync(join(FIXTURES_DIR, 'README.md'), 'utf8')
        for (const file of readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.png'))) expect(readme).toContain(`\`${file}\``)
    })

    it('really spans high-key, low-key and low-chroma pictures', () => {
        const stats = new Map(loadCorpus('synthetic').map((image) => {
            const hist = buildHistogram(image.data)
            let L = 0
            let chroma = 0
            let maxChroma = 0
            for (let i = 0; i < hist.size; i++) {
                const c = Math.hypot(hist.oklab[i * 3 + 1], hist.oklab[i * 3 + 2])
                L += hist.count[i] * hist.oklab[i * 3]
                chroma += hist.count[i] * c
                maxChroma = Math.max(maxChroma, c)
            }
            return [image.name, { L: L / hist.total, chroma: chroma / hist.total, maxChroma }]
        }))
        // Measured: high-key L 0.97, low-key L 0.22, muted max chroma 0.04, fruit max chroma 0.20.
        expect(stats.get('high-key')!.L).toBeGreaterThan(0.9)
        expect(stats.get('low-key')!.L).toBeLessThan(0.3)
        expect(stats.get('still-life-muted')!.maxChroma).toBeLessThan(0.06)
        expect(stats.get('fruit-saturated')!.maxChroma).toBeGreaterThan(0.18)
        expect(stats.get('fruit-saturated')!.chroma).toBeGreaterThan(3 * stats.get('still-life-muted')!.chroma)
    })
})
