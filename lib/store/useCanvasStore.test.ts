import { beforeEach, describe, expect, it } from 'vitest'
import { useCanvasStore } from './useCanvasStore'
import { getCanvasPersistenceStatus } from './storage'

/**
 * `setImage` decides what gets written to storage. The live image stays at full sampling
 * fidelity; only the persisted copy is bounded, and declining to persist has to be visible.
 */

/** Minimal stand-in - setImage only reads `.src`. */
const imageWithSrc = (src: string) => ({ src }) as HTMLImageElement

describe('useCanvasStore.setImage', () => {
    beforeEach(() => {
        useCanvasStore.setState({ image: null, referenceImage: null })
    })

    it('persists image.src when no bounded copy is supplied', () => {
        const img = imageWithSrc('data:image/png;base64,AAAA')
        useCanvasStore.getState().setImage(img)
        expect(useCanvasStore.getState().referenceImage).toBe('data:image/png;base64,AAAA')
    })

    it('persists the bounded copy instead of the full-fidelity src', () => {
        const full = imageWithSrc(`data:image/png;base64,${'A'.repeat(5000)}`)
        useCanvasStore.getState().setImage(full, 'data:image/jpeg;base64,SMALL')

        // The live image keeps its own high-fidelity source...
        expect(useCanvasStore.getState().image?.src).toContain('image/png')
        // ...while storage only carries the bounded one.
        expect(useCanvasStore.getState().referenceImage).toBe('data:image/jpeg;base64,SMALL')
    })

    it('stores nothing when no copy could be produced, and says so', () => {
        useCanvasStore.getState().setImage(imageWithSrc('data:image/png;base64,AAAA'), null)
        expect(useCanvasStore.getState().referenceImage).toBeNull()
        expect(getCanvasPersistenceStatus()).toEqual({ kind: 'reference-dropped' })
    })

    it('reports a healthy save when a bounded copy is stored', () => {
        useCanvasStore.getState().setImage(imageWithSrc('data:image/png;base64,AAAA'), 'data:image/jpeg;base64,OK')
        expect(getCanvasPersistenceStatus()).toEqual({ kind: 'ok' })
    })

    it('drops blob URLs, which do not survive a reload', () => {
        useCanvasStore.getState().setImage(imageWithSrc('blob:http://localhost/abc'))
        expect(useCanvasStore.getState().referenceImage).toBeNull()
    })

    it('ignores a repeat set of the same image', () => {
        const img = imageWithSrc('data:image/png;base64,AAAA')
        useCanvasStore.getState().setImage(img, 'data:image/jpeg;base64,FIRST')
        useCanvasStore.getState().setImage(img, 'data:image/jpeg;base64,SECOND')
        expect(useCanvasStore.getState().referenceImage).toBe('data:image/jpeg;base64,FIRST')
    })
})
