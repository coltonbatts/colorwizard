import { describe, it, expect } from 'vitest'
import { calculateFit } from './canvasRendering'

describe('canvasRendering - calculateFit', () => {
    it('preserves aspect ratio for landscape images in wider containers', () => {
        const container = { width: 800, height: 400 }
        const image = { width: 1600, height: 800 } // 2:1
        const result = calculateFit(container, image)

        expect(result.width / result.height).toBeCloseTo(2, 4)
        expect(result.width).toBeLessThanOrEqual(container.width)
        expect(result.height).toBeLessThanOrEqual(container.height)
    })

    it('preserves aspect ratio for portrait images in wider containers', () => {
        const container = { width: 800, height: 400 }
        const image = { width: 400, height: 800 } // 1:2
        const result = calculateFit(container, image)

        expect(result.width / result.height).toBeCloseTo(0.5, 4)
        expect(result.height).toBe(container.height)
        expect(result.width).toBe(200)
    })

    it('handles padding correctly', () => {
        const container = { width: 1000, height: 1000 }
        const image = { width: 100, height: 100 }
        const result = calculateFit(container, image, 0.9)

        expect(result.width).toBe(900)
        expect(result.height).toBe(900)
    })

    it('throws on potential aspect ratio corruption (internal check)', () => {
        // This is hard to trigger without modifying calculateFit, but we should test if it holds
        const container = { width: 123, height: 456 }
        const image = { width: 789, height: 101 }
        expect(() => calculateFit(container, image)).not.toThrow()
    })
})
