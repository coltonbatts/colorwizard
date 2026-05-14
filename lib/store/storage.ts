import { createJSONStorage } from 'zustand/middleware'
import { isDesktopApp } from '@/lib/desktop/detect'

/**
 * Pinned colors are per SQLite project (`TauriPersistence`); stripping them here keeps
 * `colorwizard-session` localStorage from rehydrating or caching another project's pins
 * before async DB hydrate. Value-mode fields still persist in localStorage on desktop.
 */
function sessionPersistStripPinned(raw: string): string {
    try {
        const parsed = JSON.parse(raw) as { state?: Record<string, unknown>; version?: number }
        if (parsed?.state && typeof parsed.state === 'object') {
            parsed.state = { ...parsed.state, pinnedColors: [] }
        }
        return JSON.stringify(parsed)
    } catch {
        return raw
    }
}

const createSafeStorage = () => {
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
}

/**
 * Canvas + workspace image paths on desktop come from SQLite (TauriPersistence).
 * Skipping localStorage rehydration avoids overwriting DB-loaded state with stale
 * web-session data (often `referenceImage: null`), which left the canvas blank.
 */
export const canvasPersistStorage = createJSONStorage(() => {
    const base = createSafeStorage()
    return {
        getItem: (name: string): string | null => {
            if (typeof window !== 'undefined' && isDesktopApp()) {
                return null
            }
            return base.getItem(name)
        },
        setItem: (name: string, value: string) => base.setItem(name, value),
        removeItem: (name: string) => base.removeItem(name),
    }
})

/**
 * Mirrors web session persistence except on desktop pinned colors do not round-trip via
 * localStorage (SQLite is SSOT).
 */
export const sessionPersistStorage = createJSONStorage(() => {
    const base = createSafeStorage()
    return {
        getItem: (name: string): string | null => {
            const raw = base.getItem(name)
            if (
                typeof window !== 'undefined' &&
                isDesktopApp() &&
                raw !== null &&
                typeof raw === 'string'
            ) {
                return sessionPersistStripPinned(raw)
            }
            return raw
        },
        setItem: (name: string, value: string) =>
            typeof window !== 'undefined' && isDesktopApp()
                ? base.setItem(name, sessionPersistStripPinned(value))
                : base.setItem(name, value),
        removeItem: (name: string) => base.removeItem(name),
    }
})

export const safeStorage = createJSONStorage(() => createSafeStorage())

