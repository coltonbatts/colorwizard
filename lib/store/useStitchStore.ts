'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { safeStorage } from './storage'

interface StitchState {
  fidelity: number
  maxColors: number
  symbolsEnabled: boolean
  gridlinesEnabled: boolean
  stitchOpacity: number
  highlightedDmcCode: string | null

  setFidelity: (fidelity: number) => void
  setMaxColors: (maxColors: number) => void
  setSymbolsEnabled: (enabled: boolean) => void
  setGridlinesEnabled: (enabled: boolean) => void
  setStitchOpacity: (opacity: number) => void
  setHighlightedDmcCode: (code: string | null) => void
  resetStitchSettings: () => void
}

const DEFAULT_STITCH_SETTINGS = {
  fidelity: 50,
  maxColors: 12,
  symbolsEnabled: true,
  gridlinesEnabled: true,
  stitchOpacity: 1.0,
  highlightedDmcCode: null,
}

export const useStitchStore = create<StitchState>()(
  persist(
    (set) => ({
      ...DEFAULT_STITCH_SETTINGS,

      setFidelity: (fidelity) => set({ fidelity: Math.min(120, Math.max(16, fidelity)) }),
      setMaxColors: (maxColors) => set({ maxColors: Math.min(40, Math.max(2, maxColors)) }),
      setSymbolsEnabled: (symbolsEnabled) => set({ symbolsEnabled }),
      setGridlinesEnabled: (gridlinesEnabled) => set({ gridlinesEnabled }),
      setStitchOpacity: (stitchOpacity) => set({ stitchOpacity: Math.min(1.0, Math.max(0.1, stitchOpacity)) }),
      setHighlightedDmcCode: (highlightedDmcCode) => set({ highlightedDmcCode }),
      resetStitchSettings: () => set(DEFAULT_STITCH_SETTINGS),
    }),
    {
      name: 'colorwizard-stitch',
      storage: safeStorage,
      partialize: (state) => ({
        fidelity: state.fidelity,
        maxColors: state.maxColors,
        symbolsEnabled: state.symbolsEnabled,
        gridlinesEnabled: state.gridlinesEnabled,
        stitchOpacity: state.stitchOpacity,
      }),
    }
  )
)
