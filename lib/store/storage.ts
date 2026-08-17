import { createJSONStorage } from 'zustand/middleware'
import { isDesktopApp } from '@/lib/desktop/detect'

/**
 * Fields in the canvas bucket that can be arbitrarily large. Everything else there is
 * small settings state that must survive even when an image cannot be stored.
 */
const HEAVY_CANVAS_FIELDS = ['referenceImage', 'surfaceImage'] as const

export type CanvasPersistenceStatus =
    /** Everything, including the reference image, was written. */
    | { kind: 'ok' }
    /** Settings were written; the reference image was too large to keep. */
    | { kind: 'reference-dropped' }
    /** Nothing could be written - this session will not be restored. */
    | { kind: 'failed' }

let canvasPersistenceStatus: CanvasPersistenceStatus = { kind: 'ok' }
const statusListeners = new Set<(status: CanvasPersistenceStatus) => void>()

export function getCanvasPersistenceStatus(): CanvasPersistenceStatus {
    return canvasPersistenceStatus
}

export function subscribeToCanvasPersistence(
    listener: (status: CanvasPersistenceStatus) => void,
): () => void {
    statusListeners.add(listener)
    return () => {
        statusListeners.delete(listener)
    }
}

function setCanvasPersistenceStatus(next: CanvasPersistenceStatus) {
    if (canvasPersistenceStatus.kind === next.kind) return
    canvasPersistenceStatus = next
    statusListeners.forEach((listener) => listener(next))
}

/**
 * Called when a reference image is adopted, to report whether a storable copy came with it.
 * Declining to persist is a deliberate choice (the image will not fit), but it must still
 * reach the user rather than looking like a successful save.
 */
export function reportReferencePersistence(persisted: boolean) {
    setCanvasPersistenceStatus(persisted ? { kind: 'ok' } : { kind: 'reference-dropped' })
}

/** Exposed for tests; resets the module-level status between cases. */
export function __resetCanvasPersistenceStatus() {
    canvasPersistenceStatus = { kind: 'ok' }
    statusListeners.clear()
}

export function isQuotaExceededError(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false
    const { name, code } = err as { name?: string; code?: number }
    return (
        name === 'QuotaExceededError' ||
        name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        code === 22 ||
        code === 1014
    )
}

/**
 * Strip the large image fields from a serialized zustand snapshot so the remaining
 * settings still fit. Returns null when the snapshot has no heavy fields to drop,
 * i.e. when shrinking cannot help.
 */
export function dropHeavyCanvasFields(serialized: string): string | null {
    try {
        const parsed = JSON.parse(serialized) as { state?: Record<string, unknown> }
        const state = parsed?.state
        if (!state || typeof state !== 'object') return null

        let dropped = false
        for (const field of HEAVY_CANVAS_FIELDS) {
            if (state[field] != null) {
                state[field] = null
                dropped = true
            }
        }

        return dropped ? JSON.stringify(parsed) : null
    } catch {
        return null
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
 *
 * On web, a reference image that overruns the quota must not take the rest of the
 * canvas bucket with it: retry without the image so settings still persist, and
 * report the downgrade so the UI can say the session will not be restored.
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
        setItem: (name: string, value: string) => {
            if (typeof window === 'undefined') {
                base.setItem(name, value)
                return
            }

            try {
                window.localStorage.setItem(name, value)
                setCanvasPersistenceStatus({ kind: 'ok' })
                return
            } catch (err) {
                if (!isQuotaExceededError(err)) {
                    base.setItem(name, value)
                    return
                }
            }

            const shrunk = dropHeavyCanvasFields(value)
            if (shrunk) {
                try {
                    window.localStorage.setItem(name, shrunk)
                    setCanvasPersistenceStatus({ kind: 'reference-dropped' })
                    return
                } catch {
                    /* fall through to the memory-only path */
                }
            }

            setCanvasPersistenceStatus({ kind: 'failed' })
            base.setItem(name, value)
        },
        removeItem: (name: string) => base.removeItem(name),
    }
})

export const safeStorage = createJSONStorage(() => createSafeStorage())
