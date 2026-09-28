'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_PALETTE, Palette, PaletteColor } from '../types/palette'
import { safeStorage } from './storage'

interface PaletteState {
    palettes: Palette[]
    setPalettes: (palettes: Palette[]) => void
    createPalette: (palette: Palette) => void
    updatePalette: (palette: Palette) => void
    deletePalette: (id: string) => void
    setActivePalette: (id: string) => void
    /** Add a color (library or the user's own tube) to a palette; no-op if it is already there. */
    addColorToPalette: (paletteId: string, color: PaletteColor) => void
    removeColorFromPalette: (paletteId: string, colorId: string) => void
}

export const usePaletteStore = create<PaletteState>()(
    persist(
        (set) => ({
            palettes: [DEFAULT_PALETTE],
            setPalettes: (palettes) => set({ palettes }),
            createPalette: (newPalette) => set((state) => ({
                palettes: [...state.palettes, newPalette]
            })),
            updatePalette: (updated) => set((state) => ({
                palettes: state.palettes.map((palette) => (
                    palette.id === updated.id ? updated : palette
                ))
            })),
            deletePalette: (id) => set((state) => {
                const filtered = state.palettes.filter((palette) => palette.id !== id)
                const deletedPalette = state.palettes.find((palette) => palette.id === id)

                if (deletedPalette?.isActive && filtered.length > 0) {
                    return {
                        palettes: filtered.map((palette, index) => (
                            index === 0 ? { ...palette, isActive: true } : { ...palette, isActive: false }
                        ))
                    }
                }

                return { palettes: filtered }
            }),
            addColorToPalette: (paletteId, color) => set((state) => ({
                palettes: state.palettes.map((palette) => (
                    palette.id !== paletteId || palette.isDefault || palette.colors.some((c) => c.id === color.id)
                        ? palette
                        : { ...palette, colors: [...palette.colors, color] }
                ))
            })),
            removeColorFromPalette: (paletteId, colorId) => set((state) => ({
                palettes: state.palettes.map((palette) => (
                    palette.id !== paletteId || palette.isDefault
                        ? palette
                        : { ...palette, colors: palette.colors.filter((c) => c.id !== colorId) }
                ))
            })),
            setActivePalette: (id) => set((state) => ({
                palettes: state.palettes.map((palette) => ({
                    ...palette,
                    isActive: palette.id === id,
                }))
            })),
        }),
        {
            name: 'colorwizard-palettes',
            storage: safeStorage,
            partialize: (state) => ({
                palettes: state.palettes,
            }),
        }
    )
)

