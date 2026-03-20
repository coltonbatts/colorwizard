import { createJSONStorage } from 'zustand/middleware'

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

export const safeStorage = createJSONStorage(() => createSafeStorage())

