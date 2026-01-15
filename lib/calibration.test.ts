import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Import types only - we'll test functions that don't require window first
// and mock window where needed
import type { CalibrationData, ZoomFingerprint } from './calibration'

describe('calibration', () => {
    // Store original window values (if exists)
    let originalWindow: typeof globalThis.window | undefined

    beforeEach(() => {
        // Create minimal window mock for node environment
        originalWindow = globalThis.window as typeof globalThis.window | undefined

        const localStorageData: Record<string, string> = {}

        // Create window object with mocked properties
        // @ts-ignore - creating mock window for node env
        globalThis.window = {
            devicePixelRatio: 2.0,
            visualViewport: { scale: 1.0 },
            localStorage: {
                getItem: (key: string) => localStorageData[key] ?? null,
                setItem: (key: string, value: string) => { localStorageData[key] = value },
                removeItem: (key: string) => { delete localStorageData[key] },
                clear: () => { Object.keys(localStorageData).forEach(k => delete localStorageData[k]) }
            }
        }

        // Also set localStorage on global for the module
        // @ts-ignore
        globalThis.localStorage = globalThis.window.localStorage
    })

    afterEach(() => {
        // @ts-ignore
        globalThis.window = originalWindow
        // @ts-ignore
        delete globalThis.localStorage
    })

    describe('constants', () => {
        it('CREDIT_CARD_WIDTH_INCHES is 3.370', async () => {
            const { CREDIT_CARD_WIDTH_INCHES } = await import('./calibration')
            expect(CREDIT_CARD_WIDTH_INCHES).toBe(3.370)
        })

        it('RULER_REFERENCES contains 2 inches option', async () => {
            const { RULER_REFERENCES } = await import('./calibration')
            const twoInches = RULER_REFERENCES.find(r => r.label === '2 inches')
            expect(twoInches).toBeDefined()
            expect(twoInches!.inches).toBe(2)
        })

        it('RULER_REFERENCES contains 5 cm option', async () => {
            const { RULER_REFERENCES } = await import('./calibration')
            const fiveCm = RULER_REFERENCES.find(r => r.label === '5 cm')
            expect(fiveCm).toBeDefined()
            expect(fiveCm!.inches).toBeCloseTo(5 / 2.54, 4)
        })
    })

    describe('getZoomFingerprint', () => {
        it('returns devicePixelRatio', async () => {
            const { getZoomFingerprint } = await import('./calibration')
            const fingerprint = getZoomFingerprint()
            expect(fingerprint.dpr).toBe(2.0)
        })

        it('returns viewport scale', async () => {
            const { getZoomFingerprint } = await import('./calibration')
            const fingerprint = getZoomFingerprint()
            expect(fingerprint.viewportScale).toBe(1.0)
        })

        it('returns null viewportScale when visualViewport not available', async () => {
            // @ts-ignore
            globalThis.window.visualViewport = null
            const { getZoomFingerprint } = await import('./calibration')
            const fingerprint = getZoomFingerprint()
            expect(fingerprint.viewportScale).toBeNull()
        })
    })

    describe('saveCalibration and loadCalibration', () => {
        it('stores and retrieves data from localStorage', async () => {
            const { saveCalibration, loadCalibration } = await import('./calibration')

            const data: CalibrationData = {
                pxPerInch: 96,
                method: 'credit_card',
                referenceInches: 3.370,
                createdAtISO: '2024-01-15T12:00:00Z',
                devicePixelRatio: 2.0,
                viewportScale: 1.0
            }

            saveCalibration(data)
            const loaded = loadCalibration()

            expect(loaded).not.toBeNull()
            expect(loaded!.pxPerInch).toBe(96)
            expect(loaded!.method).toBe('credit_card')
        })

        it('returns null if no data exists', async () => {
            const { loadCalibration } = await import('./calibration')
            const loaded = loadCalibration()
            expect(loaded).toBeNull()
        })

        it('returns null for invalid stored data', async () => {
            globalThis.localStorage.setItem('colorwizard:calibration:v1', 'invalid json')
            const { loadCalibration } = await import('./calibration')
            const loaded = loadCalibration()
            expect(loaded).toBeNull()
        })

        it('returns null for data with invalid pxPerInch (negative)', async () => {
            const invalidData = {
                pxPerInch: -1,
                method: 'credit_card',
                referenceInches: 3.370,
                createdAtISO: '2024-01-15T12:00:00Z',
                devicePixelRatio: 2.0,
                viewportScale: 1.0
            }
            globalThis.localStorage.setItem('colorwizard:calibration:v1', JSON.stringify(invalidData))
            const { loadCalibration } = await import('./calibration')
            const loaded = loadCalibration()
            expect(loaded).toBeNull()
        })

        it('returns null for data with invalid pxPerInch (zero)', async () => {
            const invalidData = {
                pxPerInch: 0,
                method: 'credit_card',
                referenceInches: 3.370,
                createdAtISO: '2024-01-15T12:00:00Z',
                devicePixelRatio: 2.0,
                viewportScale: 1.0
            }
            globalThis.localStorage.setItem('colorwizard:calibration:v1', JSON.stringify(invalidData))
            const { loadCalibration } = await import('./calibration')
            const loaded = loadCalibration()
            expect(loaded).toBeNull()
        })
    })

    describe('clearCalibration', () => {
        it('removes data from localStorage', async () => {
            const { saveCalibration, loadCalibration, clearCalibration } = await import('./calibration')

            const data: CalibrationData = {
                pxPerInch: 96,
                method: 'credit_card',
                referenceInches: 3.370,
                createdAtISO: '2024-01-15T12:00:00Z',
                devicePixelRatio: 2.0,
                viewportScale: 1.0
            }

            saveCalibration(data)
            expect(loadCalibration()).not.toBeNull()

            clearCalibration()
            expect(loadCalibration()).toBeNull()
        })
    })

    describe('isCalibrationStale', () => {
        it('returns true when DPR changes', async () => {
            const { isCalibrationStale } = await import('./calibration')
            const data: CalibrationData = {
                pxPerInch: 96,
                method: 'credit_card',
                referenceInches: 3.370,
                createdAtISO: '2024-01-15T12:00:00Z',
                devicePixelRatio: 1.0, // Different from current (2.0)
                viewportScale: 1.0
            }

            expect(isCalibrationStale(data)).toBe(true)
        })

        it('returns true when viewport scale changes', async () => {
            // @ts-ignore
            globalThis.window.visualViewport = { scale: 2.0 }
            const { isCalibrationStale } = await import('./calibration')

            const data: CalibrationData = {
                pxPerInch: 96,
                method: 'credit_card',
                referenceInches: 3.370,
                createdAtISO: '2024-01-15T12:00:00Z',
                devicePixelRatio: 2.0,
                viewportScale: 1.0 // Different from current (2.0)
            }

            expect(isCalibrationStale(data)).toBe(true)
        })

        it('returns false when fingerprint matches', async () => {
            const { isCalibrationStale } = await import('./calibration')
            const data: CalibrationData = {
                pxPerInch: 96,
                method: 'credit_card',
                referenceInches: 3.370,
                createdAtISO: '2024-01-15T12:00:00Z',
                devicePixelRatio: 2.0, // Matches current
                viewportScale: 1.0 // Matches current
            }

            expect(isCalibrationStale(data)).toBe(false)
        })

        it('handles null viewport scale gracefully', async () => {
            // @ts-ignore
            globalThis.window.visualViewport = null
            const { isCalibrationStale } = await import('./calibration')

            const data: CalibrationData = {
                pxPerInch: 96,
                method: 'credit_card',
                referenceInches: 3.370,
                createdAtISO: '2024-01-15T12:00:00Z',
                devicePixelRatio: 2.0,
                viewportScale: null
            }

            expect(isCalibrationStale(data)).toBe(false)
        })
    })

    describe('createCalibration', () => {
        it('creates CalibrationData with all required fields', async () => {
            const { createCalibration } = await import('./calibration')
            const data = createCalibration(96, 'credit_card', 3.370)

            expect(data.pxPerInch).toBe(96)
            expect(data.method).toBe('credit_card')
            expect(data.referenceInches).toBe(3.370)
            expect(data.devicePixelRatio).toBe(2.0) // From mocked window
            expect(data.viewportScale).toBe(1.0) // From mocked window
            expect(data.createdAtISO).toMatch(/^\d{4}-\d{2}-\d{2}T/)
        })

        it('includes current zoom fingerprint with custom values', async () => {
            // @ts-ignore
            globalThis.window.devicePixelRatio = 3.0
            // @ts-ignore
            globalThis.window.visualViewport = { scale: 1.5 }

            const { createCalibration } = await import('./calibration')
            const data = createCalibration(120, 'ruler', 2)

            expect(data.devicePixelRatio).toBe(3.0)
            expect(data.viewportScale).toBe(1.5)
        })
    })

    describe('pxToInches', () => {
        it('converts pixels to inches using calibration', async () => {
            const { pxToInches } = await import('./calibration')
            const calibration: CalibrationData = {
                pxPerInch: 96,
                method: 'credit_card',
                referenceInches: 3.370,
                createdAtISO: '2024-01-15T12:00:00Z',
                devicePixelRatio: 2.0,
                viewportScale: 1.0
            }

            expect(pxToInches(96, calibration)).toBe(1)
            expect(pxToInches(192, calibration)).toBe(2)
            expect(pxToInches(48, calibration)).toBe(0.5)
        })

        it('handles different pxPerInch values', async () => {
            const { pxToInches } = await import('./calibration')
            const calibration: CalibrationData = {
                pxPerInch: 120,
                method: 'ruler',
                referenceInches: 2,
                createdAtISO: '2024-01-15T12:00:00Z',
                devicePixelRatio: 2.0,
                viewportScale: 1.0
            }

            expect(pxToInches(120, calibration)).toBe(1)
            expect(pxToInches(240, calibration)).toBe(2)
        })
    })

    describe('inchesToPx', () => {
        it('converts inches to pixels using calibration', async () => {
            const { inchesToPx } = await import('./calibration')
            const calibration: CalibrationData = {
                pxPerInch: 96,
                method: 'credit_card',
                referenceInches: 3.370,
                createdAtISO: '2024-01-15T12:00:00Z',
                devicePixelRatio: 2.0,
                viewportScale: 1.0
            }

            expect(inchesToPx(1, calibration)).toBe(96)
            expect(inchesToPx(2, calibration)).toBe(192)
            expect(inchesToPx(0.5, calibration)).toBe(48)
        })
    })

    describe('inchesToCm', () => {
        it('converts inches to centimeters', async () => {
            const { inchesToCm } = await import('./calibration')
            expect(inchesToCm(1)).toBe(2.54)
            expect(inchesToCm(2)).toBe(5.08)
            expect(inchesToCm(0.5)).toBeCloseTo(1.27, 2)
        })

        it('returns 0 for 0 inches', async () => {
            const { inchesToCm } = await import('./calibration')
            expect(inchesToCm(0)).toBe(0)
        })
    })

    describe('CalibrationData structure', () => {
        it('includes all required fields when created', async () => {
            const data: CalibrationData = {
                pxPerInch: 96,
                method: 'credit_card',
                referenceInches: 3.370,
                createdAtISO: '2024-01-15T12:00:00.000Z',
                devicePixelRatio: 2.0,
                viewportScale: 1.0
            }

            expect(data).toHaveProperty('pxPerInch')
            expect(data).toHaveProperty('method')
            expect(data).toHaveProperty('referenceInches')
            expect(data).toHaveProperty('createdAtISO')
            expect(data).toHaveProperty('devicePixelRatio')
            expect(data).toHaveProperty('viewportScale')
        })

        it('method can be credit_card or ruler', () => {
            const creditCard: CalibrationData = {
                pxPerInch: 96,
                method: 'credit_card',
                referenceInches: 3.370,
                createdAtISO: '2024-01-15T12:00:00Z',
                devicePixelRatio: 2.0,
                viewportScale: 1.0
            }

            const ruler: CalibrationData = {
                pxPerInch: 96,
                method: 'ruler',
                referenceInches: 2,
                createdAtISO: '2024-01-15T12:00:00Z',
                devicePixelRatio: 2.0,
                viewportScale: 1.0
            }

            expect(creditCard.method).toBe('credit_card')
            expect(ruler.method).toBe('ruler')
        })
    })

    describe('round-trip storage', () => {
        it('save then load returns equivalent data', async () => {
            const { saveCalibration, loadCalibration } = await import('./calibration')

            const original: CalibrationData = {
                pxPerInch: 144,
                method: 'ruler',
                referenceInches: 2,
                createdAtISO: '2024-01-15T14:30:00.000Z',
                devicePixelRatio: 1.5,
                viewportScale: 1.25
            }

            saveCalibration(original)
            const loaded = loadCalibration()

            expect(loaded).toEqual(original)
        })
    })
})
