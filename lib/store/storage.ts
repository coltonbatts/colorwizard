import { createJSONStorage } from 'zustand/middleware'
import { isDesktopApp } from '@/lib/desktop/detect'

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

export const safeStorage = createJSONStorage(() => createSafeStorage())

