import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * These cover the failure that silently lost every canvas setting: a reference image
 * overruns the localStorage quota, the write throws, and the whole bucket goes with it.
 */

class QuotaError extends Error {
    name = 'QuotaExceededError'
    constructor() {
        super('quota exceeded')
    }
}

interface FakeLocalStorage {
    store: Map<string, string>
    limit: number
    setItem: (k: string, v: string) => void
    getItem: (k: string) => string | null
    removeItem: (k: string) => void
}

function installFakeLocalStorage(limit: number): FakeLocalStorage {
    const store = new Map<string, string>()
    const fake: FakeLocalStorage = {
        store,
        limit,
        setItem(k, v) {
            if (v.length > fake.limit) throw new QuotaError()
            store.set(k, v)
        },
        getItem: (k) => store.get(k) ?? null,
        removeItem: (k) => void store.delete(k),
    }

    vi.stubGlobal('window', { localStorage: fake })
    return fake
}

const snapshot = (referenceImage: string | null, extra: Record<string, unknown> = {}) =>
    JSON.stringify({
        state: {
            referenceImage,
            surfaceImage: null,
            canvasSettings: { widthInches: 20 },
            valueScaleSettings: { steps: 5 },
            ...extra,
        },
        version: 0,
    })

async function loadStorageModule() {
    vi.resetModules()
    return import('./storage')
}

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('isQuotaExceededError', () => {
    it('recognises the standard and legacy shapes', async () => {
        const { isQuotaExceededError } = await loadStorageModule()
        expect(isQuotaExceededError(new QuotaError())).toBe(true)
        expect(isQuotaExceededError({ name: 'NS_ERROR_DOM_QUOTA_REACHED' })).toBe(true)
        expect(isQuotaExceededError({ code: 22 })).toBe(true)
        expect(isQuotaExceededError({ code: 1014 })).toBe(true)
        expect(isQuotaExceededError(new Error('nope'))).toBe(false)
        expect(isQuotaExceededError(null)).toBe(false)
    })
})

describe('dropHeavyCanvasFields', () => {
    it('nulls the image fields and keeps settings', async () => {
        const { dropHeavyCanvasFields } = await loadStorageModule()
        const shrunk = dropHeavyCanvasFields(snapshot('data:image/jpeg;base64,AAAA'))
        expect(shrunk).not.toBeNull()
        const parsed = JSON.parse(shrunk!)
        expect(parsed.state.referenceImage).toBeNull()
        expect(parsed.state.canvasSettings).toEqual({ widthInches: 20 })
        expect(parsed.state.valueScaleSettings).toEqual({ steps: 5 })
    })

    it('returns null when there is nothing heavy to drop', async () => {
        const { dropHeavyCanvasFields } = await loadStorageModule()
        expect(dropHeavyCanvasFields(snapshot(null))).toBeNull()
    })

    it('returns null for malformed input instead of throwing', async () => {
        const { dropHeavyCanvasFields } = await loadStorageModule()
        expect(dropHeavyCanvasFields('not json')).toBeNull()
        expect(dropHeavyCanvasFields('null')).toBeNull()
    })
})

describe('canvasPersistStorage quota handling', () => {
    beforeEach(() => {
        vi.resetModules()
    })

    it('writes through and reports ok when the value fits', async () => {
        const fake = installFakeLocalStorage(10_000)
        const { canvasPersistStorage, getCanvasPersistenceStatus } = await loadStorageModule()

        canvasPersistStorage!.setItem('colorwizard-canvas', JSON.parse(snapshot('data:image/jpeg;base64,AAAA')))

        expect(fake.store.get('colorwizard-canvas')).toBeTruthy()
        expect(getCanvasPersistenceStatus()).toEqual({ kind: 'ok' })
    })

    it('keeps settings when the reference image overruns the quota', async () => {
        // Big enough for the settings-only snapshot, too small for one carrying an image.
        const fake = installFakeLocalStorage(300)
        const { canvasPersistStorage, getCanvasPersistenceStatus } = await loadStorageModule()

        const huge = `data:image/png;base64,${'a'.repeat(5_000)}`
        canvasPersistStorage!.setItem('colorwizard-canvas', JSON.parse(snapshot(huge)))

        const written = fake.store.get('colorwizard-canvas')
        expect(written).toBeTruthy()

        const parsed = JSON.parse(written!)
        expect(parsed.state.referenceImage).toBeNull()
        // The settings that used to be lost with it survive.
        expect(parsed.state.canvasSettings).toEqual({ widthInches: 20 })
        expect(getCanvasPersistenceStatus()).toEqual({ kind: 'reference-dropped' })
    })

    it('reports failure when even the shrunk snapshot cannot be written', async () => {
        installFakeLocalStorage(1)
        const { canvasPersistStorage, getCanvasPersistenceStatus } = await loadStorageModule()

        canvasPersistStorage!.setItem(
            'colorwizard-canvas',
            JSON.parse(snapshot(`data:image/png;base64,${'a'.repeat(5_000)}`)),
        )

        expect(getCanvasPersistenceStatus()).toEqual({ kind: 'failed' })
    })

    it('notifies subscribers when persistence degrades', async () => {
        installFakeLocalStorage(300)
        const { canvasPersistStorage, subscribeToCanvasPersistence } = await loadStorageModule()

        const seen: string[] = []
        subscribeToCanvasPersistence((s) => seen.push(s.kind))

        canvasPersistStorage!.setItem(
            'colorwizard-canvas',
            JSON.parse(snapshot(`data:image/png;base64,${'a'.repeat(5_000)}`)),
        )

        expect(seen).toContain('reference-dropped')
    })
})
