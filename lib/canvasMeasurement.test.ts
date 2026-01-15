import { describe, it, expect } from 'vitest'
import { imageToCanvasUnits, canvasUnitsToImagePixels } from './calibration'

describe('canvas measurement logic', () => {
    describe('imageToCanvasUnits', () => {
        it('calculates units correctly for a standard case', () => {
            // 500px in a 1000px width image on a 10 inch canvas should be 5 inches
            expect(imageToCanvasUnits(500, 1000, 10)).toBe(5)
        })

        it('handles different aspect ratios', () => {
            // 200px in a 800px image on a 20 inch canvas
            expect(imageToCanvasUnits(200, 800, 20)).toBe(5)
        })

        it('handles zero pixels', () => {
            expect(imageToCanvasUnits(0, 1000, 10)).toBe(0)
        })
    })

    describe('canvasUnitsToImagePixels', () => {
        it('calculates pixels correctly for a standard case', () => {
            // 5 inches on a 10 inch canvas with a 1000px image should be 500px
            expect(canvasUnitsToImagePixels(5, 10, 1000)).toBe(500)
        })

        it('handles zero units', () => {
            expect(canvasUnitsToImagePixels(0, 10, 1000)).toBe(0)
        })
    })
})
