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

// Explicit web `pinColor` writes must persist cleanly before subscribers observe
// the new state and must fail loudly when localStorage throws, while background
// session preferences keep the in-memory fallback. Letting Zustand's `persist`
// middleware serialize the snapshot avoids duplicating its private envelope.
type SessionListener = (state: SessionState, prevState: SessionState) => void

let strictWebWrite = false
let suppressStorageWrite = false
let deferSubscribers = false
let deferredPrevState: SessionState | null = null
const listenerUnsubs = new Map<SessionListener, () => void>()

const sessionPersistStorage = createJSONStorage<ReturnType<typeof persistedSession>>(() => {
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

const persistedSessionCreator = persist<SessionState, [], [], ReturnType<typeof persistedSession>>(
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
            deferSubscribers = true
            deferredPrevState = null
            strictWebWrite = true
            let persisted = false
            try {
                set({ pinnedColors: next })
                persisted = true
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
                deferSubscribers = false
                const prevToNotify = deferredPrevState
                deferredPrevState = null
                if (persisted && prevToNotify !== null) {
                    const committedState = get()
                    Array.from(listenerUnsubs.keys()).forEach((listener) => {
                        if (listenerUnsubs.has(listener)) {
                            listener(committedState, prevToNotify)
                        }
                    })
                }
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

export const useSessionStore = create<SessionState>()((set, get, api) => {
    const baseSubscribe = api.subscribe
    api.subscribe = (listener) => {
        const existingUnsub = listenerUnsubs.get(listener)
        if (existingUnsub) return existingUnsub

        const wrapped: SessionListener = (state, prevState) => {
            if (deferSubscribers) {
                if (deferredPrevState === null) deferredPrevState = prevState
                return
            }
            listener(state, prevState)
        }
        const baseUnsub = baseSubscribe(wrapped)
        const unsub = () => {
            listenerUnsubs.delete(listener)
            baseUnsub()
        }
        listenerUnsubs.set(listener, unsub)
        return unsub
    }

    return persistedSessionCreator(set, get, api as Parameters<typeof persistedSessionCreator>[2])
})
