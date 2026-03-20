import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import type { ColorCard } from './types/colorCard'

describe('colorCardStorage', () => {
    let originalWindow: typeof globalThis.window | undefined

    beforeEach(() => {
        originalWindow = globalThis.window as typeof globalThis.window | undefined

        const localStorageData: Record<string, string> = {}
        globalThis.window = {
            localStorage: {
                getItem: (key: string) => localStorageData[key] ?? null,
                setItem: (key: string, value: string) => { localStorageData[key] = value },
                removeItem: (key: string) => { delete localStorageData[key] },
                clear: () => { Object.keys(localStorageData).forEach((key) => delete localStorageData[key]) },
            } as any,
        } as any

        // @ts-expect-error test shim
        globalThis.localStorage = globalThis.window.localStorage
        vi.resetModules()
    })

    afterEach(() => {
        // @ts-expect-error test shim
        globalThis.window = originalWindow
        // @ts-expect-error test shim
        delete globalThis.localStorage
    })

    function makeCard(overrides: Partial<ColorCard> = {}): ColorCard {
        return {
            id: 'card-1',
            name: 'Card One',
            createdAt: 1000,
            updatedAt: 1000,
            color: {
                hex: '#123456',
                rgb: { r: 18, g: 52, b: 86 },
                hsl: { h: 210, s: 65, l: 20 },
                luminance: 0.12,
            },
            recipe: {
                sourceLabel: 'Heuristic mix',
                summary: 'Deep blue',
                ingredients: [],
                steps: [],
                notes: '',
                spectral: null,
            },
            matches: {
                dmc: [],
                paints: [],
            },
            ...overrides,
        }
    }

    it('normalizes legacy cards into the new metadata shape', async () => {
        globalThis.localStorage.setItem('colorwizard.cards.v1', JSON.stringify([{
            id: 'legacy-1',
            name: 'Legacy',
            createdAt: 123,
            color: {
                hex: '#abcdef',
                rgb: { r: 171, g: 205, b: 239 },
                hsl: { h: 210, s: 68, l: 80 },
                luminance: 0.8,
            },
            mixingSteps: ['Mix gently'],
        }]))

        const { getCards } = await import('./colorCardStorage')
        const cards = getCards()

        expect(cards).toHaveLength(1)
        expect(cards[0].status).toBe('idea')
        expect(cards[0].priority).toBe('medium')
        expect(cards[0].tags).toEqual([])
        expect(cards[0].project).toBeUndefined()
    })

    it('saves and updates metadata in localStorage', async () => {
        const { getCards, saveCard, updateCard } = await import('./colorCardStorage')
        const saved = saveCard(makeCard({ project: 'Alpha', tags: ['UI'], status: 'in-progress', priority: 'high', notes: 'Initial pass' }))

        expect(getCards()).toHaveLength(1)
        expect(saved.project).toBe('Alpha')

        const updated = updateCard(saved.id, { project: 'Beta', tags: ['UI', 'Deck'], notes: 'Refined' })
        expect(updated?.project).toBe('Beta')
        expect(updated?.tags).toEqual(['UI', 'Deck'])
        expect(getCards()[0].project).toBe('Beta')
    })

    it('duplicates cards with a new id while keeping metadata', async () => {
        const { duplicateCard } = await import('./colorCardStorage')
        const duplicate = duplicateCard(makeCard({ project: 'Launch', tags: ['urgent'], status: 'blocked', priority: 'urgent' }), { name: 'Copy' })

        expect(duplicate.id).not.toBe('card-1')
        expect(duplicate.name).toBe('Copy')
        expect(duplicate.project).toBe('Launch')
        expect(duplicate.tags).toEqual(['urgent'])
        expect(duplicate.status).toBe('blocked')
    })
})
