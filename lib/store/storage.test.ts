import { describe, expect, vi, beforeEach, afterEach, it } from 'vitest'

const isDesktopMocks = vi.hoisted(() => ({
    isDesktopApp: vi.fn<boolean, []>(() => false),
}))

vi.mock('@/lib/desktop/detect', () => ({
    isDesktopApp: () => isDesktopMocks.isDesktopApp(),
}))

import { sessionPersistStorage } from './storage'

const KEY = 'colorwizard-session-test'

describe('sessionPersistStorage', () => {
    let localStorageBacking: Record<string, string>

    beforeEach(() => {
        localStorageBacking = {}

        globalThis.window = {
            localStorage: {
                getItem: (key: string) => localStorageBacking[key] ?? null,
                setItem: (key: string, value: string) => {
                    localStorageBacking[key] = value
                },
                removeItem: (key: string) => {
                    delete localStorageBacking[key]
                },
                clear: () => {
                    localStorageBacking = {}
                },
            },
        } as unknown as Window & typeof globalThis

        ;(globalThis as unknown as { localStorage: Storage }).localStorage = globalThis.window.localStorage as Storage

        isDesktopMocks.isDesktopApp.mockReturnValue(false)
    })

    afterEach(() => {
        vi.clearAllMocks()
        Reflect.deleteProperty(globalThis, 'window')
        Reflect.deleteProperty(globalThis, 'localStorage')
    })

    const readRaw = (): string | null =>
        typeof globalThis.localStorage !== 'undefined' ? globalThis.localStorage.getItem(KEY) : null

    describe('web (DesktopApp=false)', () => {
        beforeEach(() => {
            isDesktopMocks.isDesktopApp.mockReturnValue(false)
        })

        it('persists pinned colors through getItem/setItem round-trip', () => {
            const pin = {
                id: 'p1',
                hex: '#336699',
                rgb: { r: 51, g: 102, b: 153 },
                hsl: { h: 210, s: 0.5, l: 0.4 },
                label: 'Ink',
                timestamp: 1,
                spectralRecipe: null,
                fallbackRecipe: { ingredientCount: 0, steps: [] },
                dmcMatches: [],
            }

            sessionPersistStorage.setItem(KEY, {
                state: { pinnedColors: [pin], valueModeEnabled: false, valueModeSteps: 5 },
                version: 0,
            })

            expect(readRaw()).toBeTruthy()
            expect(readRaw()).toContain('#336699')

            const parsed = sessionPersistStorage.getItem(KEY)
            expect(parsed).toMatchObject({
                state: expect.objectContaining({
                    pinnedColors: [pin],
                    valueModeSteps: 5,
                }),
                version: 0,
            })
        })
    })

    describe('desktop (DesktopApp=true)', () => {
        beforeEach(() => {
            isDesktopMocks.isDesktopApp.mockReturnValue(true)
        })

        it('stores session JSON without pinnedColors so SQLite owns pins', () => {
            const pin = {
                id: 'p1',
                hex: '#ff0000',
                rgb: { r: 255, g: 0, b: 0 },
                hsl: { h: 0, s: 1, l: 0.5 },
                label: 'R',
                timestamp: 1,
                spectralRecipe: null,
                fallbackRecipe: { ingredientCount: 0, steps: [] },
                dmcMatches: [],
            }
            sessionPersistStorage.setItem(KEY, {
                state: { pinnedColors: [pin], valueModeEnabled: true, valueModeSteps: 11 },
                version: 0,
            })

            expect(readRaw()).toBeTruthy()
            expect(readRaw()).toContain('"pinnedColors":[]')
            expect(readRaw()).not.toContain('#ff0000')

            const parsed = sessionPersistStorage.getItem(KEY)
            expect(parsed).toMatchObject({
                state: expect.objectContaining({
                    pinnedColors: [],
                    valueModeEnabled: true,
                    valueModeSteps: 11,
                }),
                version: 0,
            })
        })

        it('strips pinnedColors when rehydrating from legacy blob in localStorage', () => {
            globalThis.window.localStorage.setItem(
                KEY,
                JSON.stringify({
                    state: {
                        pinnedColors: [
                            {
                                id: 'old',
                                hex: '#000000',
                                rgb: { r: 0, g: 0, b: 0 },
                                hsl: { h: 0, s: 0, l: 0 },
                                label: 'Stale',
                                timestamp: 1,
                                spectralRecipe: null,
                                fallbackRecipe: { ingredientCount: 0, steps: [] },
                                dmcMatches: [],
                            },
                        ],
                        valueModeEnabled: false,
                        valueModeSteps: 7,
                    },
                    version: 0,
                }),
            )

            const parsed = sessionPersistStorage.getItem(KEY)
            expect(parsed?.state?.pinnedColors).toEqual([])
            expect(parsed?.state?.valueModeSteps).toBe(7)
        })
    })
})
