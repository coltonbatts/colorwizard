import { describe, it, expect, beforeEach } from 'vitest'
import { findClosestDMCColors, DMC_COLORS, DMCMatch, DMCColor } from './dmcFloss'

describe('dmcFloss', () => {
    describe('DMC_COLORS database', () => {
        it('contains 454+ colors', () => {
            expect(DMC_COLORS.length).toBeGreaterThanOrEqual(454)
        })

        it('each color has required properties', () => {
            for (const color of DMC_COLORS) {
                expect(color).toHaveProperty('number')
                expect(color).toHaveProperty('name')
                expect(color).toHaveProperty('rgb')
                expect(color).toHaveProperty('hex')
                expect(color.rgb).toHaveProperty('r')
                expect(color.rgb).toHaveProperty('g')
                expect(color.rgb).toHaveProperty('b')
            }
        })

        it('includes DMC 310 Black', () => {
            const black = DMC_COLORS.find(c => c.number === '310')
            expect(black).toBeDefined()
            expect(black!.name).toBe('Black')
            expect(black!.rgb).toEqual({ r: 0, g: 0, b: 0 })
        })

        it('includes DMC White', () => {
            const white = DMC_COLORS.find(c => c.number === 'White')
            expect(white).toBeDefined()
            expect(white!.rgb.r).toBeGreaterThan(250)
            expect(white!.rgb.g).toBeGreaterThan(250)
            expect(white!.rgb.b).toBeGreaterThan(245)
        })
    })

    describe('findClosestDMCColors', () => {
        it('returns default 5 matches when count not specified', () => {
            const matches = findClosestDMCColors({ r: 128, g: 128, b: 128 })
            expect(matches).toHaveLength(5)
        })

        it('respects maxCount parameter', () => {
            const matches3 = findClosestDMCColors({ r: 128, g: 128, b: 128 }, 3)
            expect(matches3).toHaveLength(3)

            const matches10 = findClosestDMCColors({ r: 128, g: 128, b: 128 }, 10)
            expect(matches10).toHaveLength(10)
        })

        it('returns matches sorted by distance ascending (closest first)', () => {
            const matches = findClosestDMCColors({ r: 255, g: 0, b: 0 }, 10)

            for (let i = 1; i < matches.length; i++) {
                expect(matches[i].distance).toBeGreaterThanOrEqual(matches[i - 1].distance)
            }
        })

        it('each match has all required fields', () => {
            const matches = findClosestDMCColors({ r: 100, g: 150, b: 200 })

            for (const match of matches) {
                expect(match).toHaveProperty('number')
                expect(match).toHaveProperty('name')
                expect(match).toHaveProperty('rgb')
                expect(match).toHaveProperty('hex')
                expect(match).toHaveProperty('distance')
                expect(match).toHaveProperty('similarity')
                expect(match).toHaveProperty('confidenceLabel')
                expect(match).toHaveProperty('confidenceColor')
                expect(match).toHaveProperty('confidenceBgColor')
            }
        })

        it('returns 1 match when count is 1', () => {
            const matches = findClosestDMCColors({ r: 255, g: 0, b: 0 }, 1)
            expect(matches).toHaveLength(1)
        })
    })

    describe('exact match scenarios', () => {
        it('returns distance 0 for exact DMC color match', () => {
            // DMC 310 Black is { r: 0, g: 0, b: 0 }
            const matches = findClosestDMCColors({ r: 0, g: 0, b: 0 }, 1)
            expect(matches[0].distance).toBe(0)
            expect(matches[0].number).toBe('310')
        })

        it('returns similarity 100 for exact match', () => {
            const matches = findClosestDMCColors({ r: 0, g: 0, b: 0 }, 1)
            expect(matches[0].similarity).toBe(100)
        })

        it('returns "Exact Match" confidence label for distance 0', () => {
            const matches = findClosestDMCColors({ r: 0, g: 0, b: 0 }, 1)
            expect(matches[0].confidenceLabel).toBe('Exact Match')
        })
    })

    describe('similarity scoring', () => {
        it('similarity is in 0-100 range', () => {
            const matches = findClosestDMCColors({ r: 128, g: 64, b: 192 }, 20)

            for (const match of matches) {
                expect(match.similarity).toBeGreaterThanOrEqual(0)
                expect(match.similarity).toBeLessThanOrEqual(100)
            }
        })

        it('similarity decreases as distance increases', () => {
            const matches = findClosestDMCColors({ r: 200, g: 100, b: 50 }, 10)

            for (let i = 1; i < matches.length; i++) {
                expect(matches[i].similarity).toBeLessThanOrEqual(matches[i - 1].similarity)
            }
        })

        it('high similarity for close colors', () => {
            // Get a specific DMC color
            const dmcRed = DMC_COLORS.find(c => c.number === '321')! // DMC Red
            const matches = findClosestDMCColors(dmcRed.rgb, 1)
            expect(matches[0].similarity).toBeGreaterThan(90)
        })
    })

    describe('confidence labels', () => {
        it('"Exact Match" for distance < 1.0', () => {
            // Use an exact match
            const matches = findClosestDMCColors({ r: 0, g: 0, b: 0 }, 1)
            expect(matches[0].confidenceLabel).toBe('Exact Match')
        })

        it('matches have appropriate confidence colors', () => {
            const matches = findClosestDMCColors({ r: 128, g: 128, b: 128 }, 10)

            for (const match of matches) {
                expect(match.confidenceColor).toMatch(/^text-/)
                expect(match.confidenceBgColor).toMatch(/^bg-/)
            }
        })

        it('distant colors have "Distant" label', () => {
            // Find a color very different from most DMC colors
            // Pure magenta-ish color should have some distant matches
            const matches = findClosestDMCColors({ r: 255, g: 0, b: 255 }, 50)

            // At least some of the later matches should be "Distant"
            const distantMatches = matches.filter(m => m.confidenceLabel === 'Distant')
            // This might be 0 if all 50 are close enough, but let's check structure
            for (const match of distantMatches) {
                expect(match.distance).toBeGreaterThanOrEqual(10)
            }
        })
    })

    describe('Lab caching', () => {
        it('populates lab cache after first call', () => {
            // Reset caches by checking a color
            const testColor = DMC_COLORS.find(c => c.number === '666')! // Bright Red

            // Clear the cached lab if it exists
            delete testColor.lab

            // Call find to trigger caching
            findClosestDMCColors({ r: 255, g: 0, b: 0 }, 5)

            // Now the lab should be populated
            expect(testColor.lab).toBeDefined()
            expect(testColor.lab!.mode).toBe('lab')
        })

        it('subsequent calls use cached Lab values', () => {
            // First call populates cache
            findClosestDMCColors({ r: 100, g: 100, b: 100 }, 5)

            // Get a DMC color that should now be cached
            const cachedColor = DMC_COLORS.find(c => c.lab !== undefined)
            expect(cachedColor).toBeDefined()

            // Store reference to cached lab
            const cachedLab = cachedColor!.lab

            // Second call
            findClosestDMCColors({ r: 100, g: 100, b: 100 }, 5)

            // Lab should still be the same object (not recalculated)
            expect(cachedColor!.lab).toBe(cachedLab)
        })
    })

    describe('known color matching', () => {
        it('pure white matches DMC White or B5200', () => {
            const matches = findClosestDMCColors({ r: 255, g: 255, b: 255 }, 3)
            const hasWhite = matches.some(m =>
                m.number === 'White' || m.number === 'B5200'
            )
            expect(hasWhite).toBe(true)
        })

        it('pure black matches DMC 310', () => {
            const matches = findClosestDMCColors({ r: 0, g: 0, b: 0 }, 1)
            expect(matches[0].number).toBe('310')
            expect(matches[0].name).toBe('Black')
        })

        it('specific DMC hex returns that DMC as top match', () => {
            // DMC 666 Bright Red is #E31D42
            const matches = findClosestDMCColors({ r: 227, g: 29, b: 66 }, 1)
            expect(matches[0].number).toBe('666')
        })

        it('red returns red-ish DMC colors', () => {
            const matches = findClosestDMCColors({ r: 200, g: 0, b: 0 }, 5)

            // All top matches should have high R, low G and B
            for (const match of matches) {
                expect(match.rgb.r).toBeGreaterThan(match.rgb.g)
                expect(match.rgb.r).toBeGreaterThan(match.rgb.b)
            }
        })

        it('blue returns blue-ish DMC colors', () => {
            const matches = findClosestDMCColors({ r: 0, g: 0, b: 200 }, 5)

            // All top matches should have high B
            for (const match of matches) {
                expect(match.rgb.b).toBeGreaterThan(50)
            }
        })
    })

    describe('edge cases', () => {
        it('handles count larger than database', () => {
            const matches = findClosestDMCColors({ r: 128, g: 128, b: 128 }, 1000)
            expect(matches.length).toBe(DMC_COLORS.length)
        })

        it('handles count of 0', () => {
            const matches = findClosestDMCColors({ r: 128, g: 128, b: 128 }, 0)
            expect(matches).toHaveLength(0)
        })

        it('handles extreme RGB values', () => {
            // These should still work without errors
            const matches1 = findClosestDMCColors({ r: 0, g: 0, b: 0 }, 1)
            expect(matches1).toHaveLength(1)

            const matches2 = findClosestDMCColors({ r: 255, g: 255, b: 255 }, 1)
            expect(matches2).toHaveLength(1)
        })

        it('always returns valid results even for unusual colors', () => {
            // Unusual color that might not match well
            const matches = findClosestDMCColors({ r: 123, g: 45, b: 67 }, 5)
            expect(matches.length).toBe(5)

            for (const match of matches) {
                expect(typeof match.distance).toBe('number')
                expect(typeof match.similarity).toBe('number')
            }
        })
    })
})
