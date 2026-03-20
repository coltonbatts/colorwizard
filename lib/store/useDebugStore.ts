'use client'

import { create } from 'zustand'

interface DebugState {
    debugModeEnabled: boolean
    setDebugModeEnabled: (enabled: boolean) => void
    toggleDebugMode: () => void
}

export const useDebugStore = create<DebugState>()((set) => ({
    debugModeEnabled: false,
    setDebugModeEnabled: (debugModeEnabled) => set({ debugModeEnabled }),
    toggleDebugMode: () => set((state) => ({ debugModeEnabled: !state.debugModeEnabled })),
}))

