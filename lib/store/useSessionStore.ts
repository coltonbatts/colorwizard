'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PinnedColor } from '../types/pinnedColor'
import { safeStorage } from './storage'
import { DEFAULT_VALUE_STEP_COUNT } from '../valueMode'

type SampledColor = {
    hex: string
    rgb: { r: number; g: number; b: number }
    hsl: { h: number; s: number; l: number }
    valueMetadata?: {
        y: number
        step: number
        range: [number, number]
        percentile: number
    }
} | null

interface SessionState {
    sampledColor: SampledColor
    activeHighlightColor: { r: number; g: number; b: number } | null
    highlightTolerance: number
    highlightMode: 'solid' | 'heatmap'
    pinnedColors: PinnedColor[]
    valueModeEnabled: boolean
    valueModeSteps: 5 | 7 | 9 | 11
    lastSampleTime: number

    setSampledColor: (color: SampledColor) => void
    setLastSampleTime: (time: number) => void
    setActiveHighlightColor: (color: SessionState['activeHighlightColor']) => void
    setHighlightTolerance: (tolerance: number) => void
    setHighlightMode: (mode: SessionState['highlightMode']) => void
    setPinnedColors: (colors: PinnedColor[]) => void
    setValueModeEnabled: (enabled: boolean) => void
    toggleValueMode: () => void
    setValueModeSteps: (steps: 5 | 7 | 9 | 11) => void
    pinColor: (newPin: PinnedColor) => void
    unpinColor: (id: string) => void
    clearPinned: () => void
}

export const useSessionStore = create<SessionState>()(
    persist(
        (set) => ({
            sampledColor: null,
            activeHighlightColor: null,
            highlightTolerance: 20,
            highlightMode: 'solid',
            pinnedColors: [],
            valueModeEnabled: false,
            valueModeSteps: DEFAULT_VALUE_STEP_COUNT,
            lastSampleTime: 0,

            setSampledColor: (sampledColor) => {
                if (sampledColor) {
                    set({ sampledColor, lastSampleTime: Date.now() })
                } else {
                    set({ sampledColor })
                }
            },
            setLastSampleTime: (lastSampleTime) => set({ lastSampleTime }),
            setActiveHighlightColor: (activeHighlightColor) => set({ activeHighlightColor }),
            setHighlightTolerance: (highlightTolerance) => set({ highlightTolerance }),
            setHighlightMode: (highlightMode) => set({ highlightMode }),
            setPinnedColors: (pinnedColors) => set({ pinnedColors }),
            setValueModeEnabled: (valueModeEnabled) => set({ valueModeEnabled }),
            toggleValueMode: () => set((state) => ({ valueModeEnabled: !state.valueModeEnabled })),
            setValueModeSteps: (valueModeSteps) => set({ valueModeSteps }),

            pinColor: (newPin) => set((state) => {
                const filtered = state.pinnedColors.filter((pinnedColor) => pinnedColor.hex !== newPin.hex)
                const next = [newPin, ...filtered].slice(0, 30)
                return { pinnedColors: next }
            }),
            unpinColor: (id) => set((state) => ({
                pinnedColors: state.pinnedColors.filter((pinnedColor) => pinnedColor.id !== id)
            })),
            clearPinned: () => set({ pinnedColors: [] }),
        }),
        {
            name: 'colorwizard-session',
            storage: safeStorage,
            partialize: (state) => ({
                pinnedColors: state.pinnedColors,
                valueModeEnabled: state.valueModeEnabled,
                valueModeSteps: state.valueModeSteps,
            }),
        }
    )
)
