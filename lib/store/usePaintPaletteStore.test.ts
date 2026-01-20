import { describe, it, expect, beforeEach } from 'vitest'
import { usePaintPaletteStore } from './usePaintPaletteStore'

describe('usePaintPaletteStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        const store = usePaintPaletteStore.getState()
        store.clearSelection()
        // Clear saved palettes
        usePaintPaletteStore.setState({ savedPalettes: [], activePaletteId: null })
    })

    describe('togglePaint', () => {
        it('should add a paint when not selected', () => {
            const store = usePaintPaletteStore.getState()
            store.togglePaint('paint-1')
            expect(store.getSelectedPaintIds()).toContain('paint-1')
        })

        it('should remove a paint when already selected', () => {
            const store = usePaintPaletteStore.getState()
            store.togglePaint('paint-1')
            store.togglePaint('paint-1')
            expect(store.getSelectedPaintIds()).not.toContain('paint-1')
        })

        it('should set isDirty to true', () => {
            const store = usePaintPaletteStore.getState()
            store.togglePaint('paint-1')
            expect(usePaintPaletteStore.getState().isDirty).toBe(true)
        })
    })

    describe('selectPaint / deselectPaint', () => {
        it('should add paint only if not already selected', () => {
            const store = usePaintPaletteStore.getState()
            store.selectPaint('paint-1')
            store.selectPaint('paint-1') // duplicate
            expect(store.getSelectedPaintIds().filter(id => id === 'paint-1').length).toBe(1)
        })

        it('should remove paint when deselecting', () => {
            const store = usePaintPaletteStore.getState()
            store.selectPaint('paint-1')
            store.selectPaint('paint-2')
            store.deselectPaint('paint-1')
            expect(store.getSelectedPaintIds()).not.toContain('paint-1')
            expect(store.getSelectedPaintIds()).toContain('paint-2')
        })
    })

    describe('clearSelection', () => {
        it('should remove all selected paints', () => {
            const store = usePaintPaletteStore.getState()
            store.selectPaint('paint-1')
            store.selectPaint('paint-2')
            store.clearSelection()
            expect(store.getSelectedPaintIds()).toHaveLength(0)
        })

        it('should clear activePaletteId', () => {
            const store = usePaintPaletteStore.getState()
            usePaintPaletteStore.setState({ activePaletteId: 'some-palette' })
            store.clearSelection()
            expect(usePaintPaletteStore.getState().activePaletteId).toBe(null)
        })
    })

    describe('savePalette', () => {
        it('should create a new palette with current selection', () => {
            const store = usePaintPaletteStore.getState()
            store.selectPaint('paint-1')
            store.selectPaint('paint-2')
            const id = store.savePalette('My Palette')

            const state = usePaintPaletteStore.getState()
            expect(state.savedPalettes).toHaveLength(1)
            expect(state.savedPalettes[0].name).toBe('My Palette')
            expect(state.savedPalettes[0].paintIds).toEqual(['paint-1', 'paint-2'])
            expect(state.activePaletteId).toBe(id)
        })

        it('should set isDirty to false after saving', () => {
            const store = usePaintPaletteStore.getState()
            store.selectPaint('paint-1')
            store.savePalette('Test')
            expect(usePaintPaletteStore.getState().isDirty).toBe(false)
        })
    })

    describe('loadPalette', () => {
        it('should restore selection from saved palette', () => {
            const store = usePaintPaletteStore.getState()
            store.selectPaint('paint-1')
            store.selectPaint('paint-2')
            const id = store.savePalette('Saved')

            // Clear and load
            store.clearSelection()
            expect(store.getSelectedPaintIds()).toHaveLength(0)

            store.loadPalette(id)
            const state = usePaintPaletteStore.getState()
            expect(state.selectedPaintIds).toEqual(['paint-1', 'paint-2'])
            expect(state.activePaletteId).toBe(id)
        })
    })

    describe('isPaintSelected', () => {
        it('should return true for selected paints', () => {
            const store = usePaintPaletteStore.getState()
            store.selectPaint('paint-1')
            expect(store.isPaintSelected('paint-1')).toBe(true)
            expect(store.isPaintSelected('paint-2')).toBe(false)
        })
    })

    describe('isUsingPaintPalette', () => {
        it('should return true when paints are selected', () => {
            const store = usePaintPaletteStore.getState()
            expect(store.isUsingPaintPalette()).toBe(false)
            store.selectPaint('paint-1')
            expect(store.isUsingPaintPalette()).toBe(true)
        })
    })

    describe('deletePalette', () => {
        it('should remove palette from savedPalettes', () => {
            const store = usePaintPaletteStore.getState()
            store.selectPaint('paint-1')
            const id = store.savePalette('ToDelete')

            store.deletePalette(id)
            expect(usePaintPaletteStore.getState().savedPalettes).toHaveLength(0)
        })

        it('should clear activePaletteId if deleting active palette', () => {
            const store = usePaintPaletteStore.getState()
            store.selectPaint('paint-1')
            const id = store.savePalette('Active')

            store.deletePalette(id)
            expect(usePaintPaletteStore.getState().activePaletteId).toBe(null)
        })
    })
})
