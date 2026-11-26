'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { PinnedColor } from '../types/pinnedColor'
import { DEFAULT_VALUE_STEP_COUNT } from '../valueMode'
import { isDesktopApp } from '../desktop/detect'
import { playColorSelectionSound } from '../audio/colorSelectionSound'

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
    selectionSoundEnabled: boolean

    setSampledColor: (color: SampledColor) => void
    selectSampledColor: (color: SampledColor) => void
    setSelectionSoundEnabled: (enabled: boolean) => void
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

const persistedSession = (state: SessionState) => ({
    pinnedColors: state.pinnedColors,
    valueModeEnabled: state.valueModeEnabled,
    valueModeSteps: state.valueModeSteps,
    selectionSoundEnabled: state.selectionSoundEnabled,
})

// Explicit web `pinColor` writes must fail loudly when localStorage throws, while
// background session preferences keep the in-memory fallback. Letting Zustand's
// `persist` middleware serialize the snapshot avoids duplicating its private envelope.
let strictWebWrite = false
let suppressStorageWrite = false

const sessionPersistStorage = createJSONStorage(() => {
    const memoryStorage: Record<string, string> = {}

    return {
        getItem: (name: string): string | null => {
            try {
                if (typeof window === 'undefined') return null
                return window.localStorage.getItem(name) ?? memoryStorage[name] ?? null
            } catch {
                return memoryStorage[name] ?? null
            }
        },
        setItem: (name: string, value: string): void => {
            if (suppressStorageWrite) return
            if (strictWebWrite) {
                window.localStorage.setItem(name, value)
                memoryStorage[name] = value
                return
            }
            try {
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(name, value)
                }
                memoryStorage[name] = value
            } catch {
                memoryStorage[name] = value
            }
        },
        removeItem: (name: string): void => {
            try {
                if (typeof window !== 'undefined') {
                    window.localStorage.removeItem(name)
                }
                delete memoryStorage[name]
            } catch {
                delete memoryStorage[name]
            }
        },
    }
})

export const useSessionStore = create<SessionState>()(
    persist(
        (set, get) => ({
            sampledColor: null,
            activeHighlightColor: null,
            highlightTolerance: 20,
            highlightMode: 'solid',
            pinnedColors: [],
            valueModeEnabled: false,
            valueModeSteps: DEFAULT_VALUE_STEP_COUNT,
            lastSampleTime: 0,
            selectionSoundEnabled: true,

            setSampledColor: (sampledColor) => {
                if (sampledColor) {
                    set({ sampledColor, lastSampleTime: Date.now() })
                } else {
                    set({ sampledColor })
                }
            },
            setLastSampleTime: (lastSampleTime) => set({ lastSampleTime }),
            selectSampledColor: (color) => {
                get().setSampledColor(color)
                if (color) void playColorSelectionSound(() => get().selectionSoundEnabled)
            },
            setSelectionSoundEnabled: (selectionSoundEnabled) => set({ selectionSoundEnabled }),
            setActiveHighlightColor: (activeHighlightColor) => set({ activeHighlightColor }),
            setHighlightTolerance: (highlightTolerance) => set({ highlightTolerance }),
            setHighlightMode: (highlightMode) => set({ highlightMode }),
            setPinnedColors: (pinnedColors) => set({ pinnedColors }),
            setValueModeEnabled: (valueModeEnabled) => set({ valueModeEnabled }),
            toggleValueMode: () => set((state) => ({ valueModeEnabled: !state.valueModeEnabled })),
            setValueModeSteps: (valueModeSteps) => set({ valueModeSteps }),

            pinColor: (newPin) => {
                const prevPinnedColors = get().pinnedColors
                const filtered = prevPinnedColors.filter((pinnedColor) => pinnedColor.hex !== newPin.hex)
                const next = [newPin, ...filtered].slice(0, 30)
                if (typeof window === 'undefined' || isDesktopApp()) {
                    set({ pinnedColors: next })
                    return
                }
                strictWebWrite = true
                try {
                    set({ pinnedColors: next })
                } catch (err) {
                    strictWebWrite = false
                    suppressStorageWrite = true
                    try {
                        set({ pinnedColors: prevPinnedColors })
                    } finally {
                        suppressStorageWrite = false
                    }
                    throw err
                } finally {
                    strictWebWrite = false
                }
            },
            unpinColor: (id) => set((state) => ({
                pinnedColors: state.pinnedColors.filter((pinnedColor) => pinnedColor.id !== id)
            })),
            clearPinned: () => set({ pinnedColors: [] }),
        }),
        {
            name: 'colorwizard-session',
            storage: sessionPersistStorage,
            partialize: persistedSession,
        }
    )
)
