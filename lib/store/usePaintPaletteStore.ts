/**
 * Paint Palette Store
 * 
 * Manages user's paint palette selections for recipe solving.
 * Uses catalog Paint IDs (e.g., "winsor-newton/winton/titanium-white").
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================================================
// Types
// ============================================================================

/**
 * A saved paint palette configuration.
 */
export interface PaintPalette {
    /** Unique identifier */
    id: string
    /** User-defined palette name */
    name: string
    /** Catalog Paint IDs in this palette */
    paintIds: string[]
    /** Creation timestamp */
    createdAt: number
    /** Last update timestamp */
    updatedAt: number
}

/**
 * Generate a unique ID for new palettes.
 */
function generatePaletteId(): string {
    return `paint-palette-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ============================================================================
// Store
// ============================================================================

interface PaintPaletteState {
    // Current working selection
    selectedPaintIds: string[]

    // Saved palettes
    savedPalettes: PaintPalette[]

    // Active palette (null = unsaved working selection)
    activePaletteId: string | null

    // Track if current selection is modified from saved palette
    isDirty: boolean

    // Actions
    togglePaint: (paintId: string) => void
    selectPaint: (paintId: string) => void
    deselectPaint: (paintId: string) => void
    selectMultiple: (paintIds: string[]) => void
    clearSelection: () => void

    // Palette management
    savePalette: (name: string) => string
    loadPalette: (paletteId: string) => void
    updatePalette: (paletteId: string) => void
    deletePalette: (paletteId: string) => void

    // Getters
    getSelectedPaintIds: () => string[]
    isUsingPaintPalette: () => boolean
    getActivePalette: () => PaintPalette | null
    isPaintSelected: (paintId: string) => boolean
}

export const usePaintPaletteStore = create<PaintPaletteState>()(
    persist(
        (set, get) => ({
            selectedPaintIds: [],
            savedPalettes: [],
            activePaletteId: null,
            isDirty: false,

            togglePaint: (paintId) => {
                const current = get().selectedPaintIds
                const index = current.indexOf(paintId)

                if (index >= 0) {
                    // Remove
                    set({
                        selectedPaintIds: current.filter(id => id !== paintId),
                        isDirty: true
                    })
                } else {
                    // Add
                    set({
                        selectedPaintIds: [...current, paintId],
                        isDirty: true
                    })
                }
            },

            selectPaint: (paintId) => {
                const current = get().selectedPaintIds
                if (!current.includes(paintId)) {
                    set({
                        selectedPaintIds: [...current, paintId],
                        isDirty: true
                    })
                }
            },

            deselectPaint: (paintId) => {
                set({
                    selectedPaintIds: get().selectedPaintIds.filter(id => id !== paintId),
                    isDirty: true
                })
            },

            selectMultiple: (paintIds) => {
                const current = new Set(get().selectedPaintIds)
                paintIds.forEach(id => current.add(id))
                set({
                    selectedPaintIds: Array.from(current),
                    isDirty: true
                })
            },

            clearSelection: () => {
                set({
                    selectedPaintIds: [],
                    activePaletteId: null,
                    isDirty: false
                })
            },

            savePalette: (name) => {
                const id = generatePaletteId()
                const now = Date.now()

                const newPalette: PaintPalette = {
                    id,
                    name,
                    paintIds: [...get().selectedPaintIds],
                    createdAt: now,
                    updatedAt: now
                }

                set(state => ({
                    savedPalettes: [...state.savedPalettes, newPalette],
                    activePaletteId: id,
                    isDirty: false
                }))

                return id
            },

            loadPalette: (paletteId) => {
                const palette = get().savedPalettes.find(p => p.id === paletteId)
                if (palette) {
                    set({
                        selectedPaintIds: [...palette.paintIds],
                        activePaletteId: paletteId,
                        isDirty: false
                    })
                }
            },

            updatePalette: (paletteId) => {
                const now = Date.now()
                set(state => ({
                    savedPalettes: state.savedPalettes.map(p =>
                        p.id === paletteId
                            ? { ...p, paintIds: [...state.selectedPaintIds], updatedAt: now }
                            : p
                    ),
                    isDirty: false
                }))
            },

            deletePalette: (paletteId) => {
                set(state => {
                    const filtered = state.savedPalettes.filter(p => p.id !== paletteId)
                    return {
                        savedPalettes: filtered,
                        activePaletteId: state.activePaletteId === paletteId ? null : state.activePaletteId
                    }
                })
            },

            getSelectedPaintIds: () => get().selectedPaintIds,

            isUsingPaintPalette: () => get().selectedPaintIds.length > 0,

            getActivePalette: () => {
                const { savedPalettes, activePaletteId } = get()
                return savedPalettes.find(p => p.id === activePaletteId) || null
            },

            isPaintSelected: (paintId) => get().selectedPaintIds.includes(paintId)
        }),
        {
            name: 'colorwizard-paint-palette',
            partialize: (state) => ({
                selectedPaintIds: state.selectedPaintIds,
                savedPalettes: state.savedPalettes,
                activePaletteId: state.activePaletteId
            })
        }
    )
)
