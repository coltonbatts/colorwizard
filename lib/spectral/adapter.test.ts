import { describe, it, expect, afterEach } from 'vitest'
import {
    mixPigments,
    deltaEOK,
    isSpectralAvailable,
    PALETTE,
    getPaletteColors,
    registerPigments,
    clearDynamicPigments,
    clearTransientColorCache,
    createColor,
    getCachedColorSync,
    getPigmentColorSync,
    getColorCacheStats,
    MAX_TRANSIENT_COLOR_CACHE_SIZE,
} from './adapter'

afterEach(() => {
    clearDynamicPigments()
    clearTransientColorCache()
})

describe('spectral adapter', () => {
    it('spectral.js should be available', async () => {
        const available = await isSpectralAvailable()
        expect(available).toBe(true)
    })

    it('mixing same color with itself returns similar hex', async () => {
        const result = await mixPigments([
            { pigmentId: 'cadmium-red', weight: 1 },
        ])

        // Should return cadmium red's hex
        expect(result.hex).toMatch(/^#[0-9A-Fa-f]{6}$/)

        // Calculate delta with original
        const cadmiumRed = PALETTE.find((p) => p.id === 'cadmium-red')!
        const delta = await deltaEOK(result.hex, cadmiumRed.hex)

        // Should be very close (allowing for tinting strength effects)
        expect(delta).toBeLessThan(5)
    })

    it('mixing red + yellow trends orange-ish', async () => {
        const result = await mixPigments([
            { pigmentId: 'cadmium-red', weight: 0.5 },
            { pigmentId: 'yellow-ochre', weight: 0.5 },
        ])

        expect(result.hex).toMatch(/^#[0-9A-Fa-f]{6}$/)

        // Parse RGB to check hue is in orange range
        const hex = result.hex.slice(1)
        const r = parseInt(hex.slice(0, 2), 16)
        const g = parseInt(hex.slice(2, 4), 16)
        const b = parseInt(hex.slice(4, 6), 16)

        // Orange should have high red, medium green, low blue
        expect(r).toBeGreaterThan(100)
        expect(g).toBeGreaterThan(20)
        expect(g).toBeLessThan(r)
        expect(b).toBeLessThan(g)
    })

    it('deltaEOK returns 0 for identical colors', async () => {
        const delta = await deltaEOK('#FF0000', '#FF0000')
        expect(delta).toBe(0)
    })

    it('deltaEOK returns sensible values for different colors', async () => {
        // Red vs Blue should have high delta
        const deltaRB = await deltaEOK('#FF0000', '#0000FF')
        expect(deltaRB).toBeGreaterThan(30)

        // Similar colors should have low delta
        const deltaPink = await deltaEOK('#FF0000', '#FF3030')
        expect(deltaPink).toBeLessThan(20)
    })

    it('mixing white and black produces gray', async () => {
        const result = await mixPigments([
            { pigmentId: 'titanium-white', weight: 0.5 },
            { pigmentId: 'ivory-black', weight: 0.5 },
        ])

        const hex = result.hex.slice(1)
        const r = parseInt(hex.slice(0, 2), 16)
        const g = parseInt(hex.slice(2, 4), 16)
        const b = parseInt(hex.slice(4, 6), 16)

        // Gray should have similar R, G, B values
        expect(Math.abs(r - g)).toBeLessThan(20)
        expect(Math.abs(g - b)).toBeLessThan(20)

        // Should be in middle range
        expect(r).toBeGreaterThan(50)
        expect(r).toBeLessThan(200)
    })

    it('caps transient sampled hex entries while keeping palette and registered pigments permanently cached', async () => {
        await getPaletteColors()
        const customPigment = { id: 'test-burnt-sienna', hex: '#6E2E1C', tintingStrength: 1.2 }
        await registerPigments([customPigment])

        const totalTransient = MAX_TRANSIENT_COLOR_CACHE_SIZE + 125
        for (let i = 0; i < totalTransient; i++) {
            const hex = `#${i.toString(16).padStart(6, '0').toUpperCase()}`
            await createColor(hex)
        }

        const stats = getColorCacheStats()
        expect(stats.transient).toBe(MAX_TRANSIENT_COLOR_CACHE_SIZE)
        expect(stats.palette).toBe(PALETTE.length)
        expect(stats.dynamic).toBe(1)

        // Oldest transient entry should have been evicted.
        expect(() => getCachedColorSync('#000000')).toThrow()
        // Most recent transient entry should remain cached.
        const lastHex = `#${(totalTransient - 1).toString(16).padStart(6, '0').toUpperCase()}`
        expect(getCachedColorSync(lastHex)).toBeDefined()

        // Pre-warmed PALETTE pigments and registered dynamic pigments must never be evicted.
        for (const pigment of PALETTE) {
            expect(getCachedColorSync(pigment.hex, pigment.tintingStrength)).toBeDefined()
            expect(getPigmentColorSync(pigment.id)).toBeDefined()
        }
        expect(getCachedColorSync(customPigment.hex, customPigment.tintingStrength)).toBeDefined()
        expect(getPigmentColorSync(customPigment.id)).toBeDefined()
    })

    it('refreshes LRU order when a transient color is accessed again before eviction', async () => {
        await isSpectralAvailable()
        const pinnedTransient = '#000001'
        const victimTransient = '#000002'
        await createColor(pinnedTransient)
        await createColor(victimTransient)

        // Fill up to capacity - 1, touching pinnedTransient so it becomes most-recently-used.
        for (let i = 3; i <= MAX_TRANSIENT_COLOR_CACHE_SIZE; i++) {
            await createColor(`#${i.toString(16).padStart(6, '0').toUpperCase()}`)
        }
        // Touch pinnedTransient via sync lookup before forcing one eviction.
        expect(getCachedColorSync(pinnedTransient)).toBeDefined()
        await createColor('#FFFFFF')

        expect(getColorCacheStats().transient).toBe(MAX_TRANSIENT_COLOR_CACHE_SIZE)
        expect(getCachedColorSync(pinnedTransient)).toBeDefined()
        expect(() => getCachedColorSync(victimTransient)).toThrow()
    })
})
