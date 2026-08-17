import { describe, expect, it, vi } from 'vitest'
import {
    PERSIST_BUDGET_CHARS,
    PERSIST_MAX_DIM,
    encodePersistableImage,
    estimateScaledPixels,
    exceedsPersistBudget,
    fitsPersistBudget,
    isRestorableSrc,
    planPersistAttempts,
    type CanvasEncoder,
} from './persistableImage'

/** Stand-in for the image source; the fake encoder never touches it. */
const SOURCE = {} as CanvasImageSource

/**
 * Encoder whose output size is proportional to pixel count, with JPEG quality acting as a
 * multiplier. Mirrors the real trade-off closely enough to exercise the ladder.
 */
function fakeEncoder(bytesPerPixel: { png: number; jpeg: number }): CanvasEncoder {
    return (_image, width, height, attempt) => {
        const pixels = width * height
        const size =
            attempt.mimeType === 'image/png'
                ? pixels * bytesPerPixel.png
                : pixels * bytesPerPixel.jpeg * (attempt.quality ?? 1)
        return `data:${attempt.mimeType};base64,${'a'.repeat(Math.max(1, Math.round(size)))}`
    }
}

describe('planPersistAttempts', () => {
    it('offers a lossless attempt first for small images', () => {
        const attempts = planPersistAttempts(800, 600)
        expect(attempts[0]).toEqual({ maxDim: PERSIST_MAX_DIM, mimeType: 'image/png' })
    })

    it('skips the lossless attempt for photographs that cannot fit as PNG', () => {
        const attempts = planPersistAttempts(4032, 3024)
        expect(attempts.every((a) => a.mimeType === 'image/jpeg')).toBe(true)
    })

    it('steps down quality before resolution', () => {
        const attempts = planPersistAttempts(4032, 3024)
        const fullDim = attempts.filter((a) => a.maxDim === PERSIST_MAX_DIM)
        expect(fullDim.length).toBeGreaterThan(1)
        expect(fullDim[0].quality).toBeGreaterThan(fullDim[1].quality!)
        // Resolution reductions come after the full-size attempts.
        expect(attempts.at(-1)!.maxDim).toBeLessThan(PERSIST_MAX_DIM)
    })

    it('returns nothing for degenerate dimensions', () => {
        expect(planPersistAttempts(0, 100)).toEqual([])
        expect(planPersistAttempts(100, -1)).toEqual([])
    })
})

describe('estimateScaledPixels', () => {
    it('leaves images already within the cap untouched', () => {
        expect(estimateScaledPixels(800, 600, 2048)).toBe(480_000)
    })

    it('scales down preserving aspect ratio', () => {
        // 4032x3024 -> 2048x1536
        expect(estimateScaledPixels(4032, 3024, 2048)).toBe(2048 * 1536)
    })
})

describe('budget helpers', () => {
    it('accepts strings within budget and rejects those over', () => {
        expect(fitsPersistBudget('a'.repeat(10))).toBe(true)
        expect(fitsPersistBudget('a'.repeat(PERSIST_BUDGET_CHARS + 1))).toBe(false)
    })

    it('flags oversized sources', () => {
        expect(exceedsPersistBudget(null)).toBe(false)
        expect(exceedsPersistBudget('a'.repeat(PERSIST_BUDGET_CHARS + 1))).toBe(true)
    })

    it('treats blob URLs as unrestorable because they die with the page', () => {
        expect(isRestorableSrc('blob:http://localhost/abc')).toBe(false)
        expect(isRestorableSrc('data:image/png;base64,AAAA')).toBe(true)
        expect(isRestorableSrc('/Users/me/photo.jpg')).toBe(true)
        expect(isRestorableSrc(null)).toBe(false)
    })
})

describe('encodePersistableImage', () => {
    it('keeps a small image lossless', () => {
        const result = encodePersistableImage(SOURCE, 800, 600, {
            encoder: fakeEncoder({ png: 0.5, jpeg: 0.3 }),
        })
        expect(result).not.toBeNull()
        expect(result!.attempt.mimeType).toBe('image/png')
        expect(result!.lossless).toBe(true)
    })

    it('falls back to JPEG for a 12MP photo and stays within budget', () => {
        const result = encodePersistableImage(SOURCE, 4032, 3024, {
            encoder: fakeEncoder({ png: 2, jpeg: 0.5 }),
        })
        expect(result).not.toBeNull()
        expect(result!.attempt.mimeType).toBe('image/jpeg')
        expect(result!.lossless).toBe(false)
        expect(result!.chars).toBeLessThanOrEqual(PERSIST_BUDGET_CHARS)
    })

    it('steps down resolution when quality reduction is not enough', () => {
        // Heavy encoder: only the smaller-dimension attempts can fit.
        const result = encodePersistableImage(SOURCE, 4032, 3024, {
            encoder: fakeEncoder({ png: 4, jpeg: 0.9 }),
        })
        expect(result).not.toBeNull()
        expect(result!.attempt.maxDim).toBeLessThan(PERSIST_MAX_DIM)
        expect(result!.chars).toBeLessThanOrEqual(PERSIST_BUDGET_CHARS)
    })

    it('returns null rather than emitting a value that would poison storage', () => {
        const result = encodePersistableImage(SOURCE, 4032, 3024, {
            encoder: fakeEncoder({ png: 50, jpeg: 50 }),
        })
        expect(result).toBeNull()
    })

    it('skips candidates the encoder cannot produce', () => {
        const encoder = vi.fn<CanvasEncoder>((_i, w, h, attempt) =>
            attempt.mimeType === 'image/png' ? null : `data:image/jpeg;base64,${'a'.repeat(w * h * 0.1)}`,
        )
        const result = encodePersistableImage(SOURCE, 800, 600, { encoder })
        expect(result).not.toBeNull()
        expect(result!.attempt.mimeType).toBe('image/jpeg')
    })

    it('honours a custom budget', () => {
        const encoder = fakeEncoder({ png: 0.5, jpeg: 0.3 })
        expect(encodePersistableImage(SOURCE, 800, 600, { encoder, budget: 10 })).toBeNull()
        expect(encodePersistableImage(SOURCE, 800, 600, { encoder, budget: 1_000_000 })).not.toBeNull()
    })
})
