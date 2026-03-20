'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_PALETTE, Palette } from '../types/palette'
import { safeStorage } from './storage'

interface PaletteState {
    palettes: Palette[]
    setPalettes: (palettes: Palette[]) => void
    createPalette: (palette: Palette) => void
    updatePalette: (palette: Palette) => void
    deletePalette: (id: string) => void
    setActivePalette: (id: string) => void
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

