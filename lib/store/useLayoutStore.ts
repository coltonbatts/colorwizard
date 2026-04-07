'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { safeStorage } from './storage'

interface LayoutState {
    sidebarCollapsed: boolean
    compactMode: boolean
    sidebarWidth: number
    simpleMode: boolean

    setSidebarCollapsed: (collapsed: boolean) => void
    setCompactMode: (compact: boolean) => void
    setSidebarWidth: (width: number) => void
    setSimpleMode: (simple: boolean) => void
    toggleSidebar: () => void
    toggleCompactMode: () => void
    toggleSimpleMode: () => void
}

const MIN_SIDEBAR = 320
const MAX_SIDEBAR = 640
const DEFAULT_SIDEBAR = 360

function clampSidebarWidth(w: unknown): number {
    if (typeof w !== 'number' || !Number.isFinite(w)) return DEFAULT_SIDEBAR
    return Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, Math.round(w)))
}

export const useLayoutStore = create<LayoutState>()(
    persist(
        (set) => ({
            sidebarCollapsed: false,
            compactMode: false,
            sidebarWidth: DEFAULT_SIDEBAR,
            simpleMode: true,

            setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
            setCompactMode: (compactMode) => set({ compactMode }),
            setSidebarWidth: (sidebarWidth) =>
                set({ sidebarWidth: clampSidebarWidth(sidebarWidth) }),
            setSimpleMode: (simpleMode) => set({ simpleMode }),
            toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
            toggleCompactMode: () => set((state) => ({ compactMode: !state.compactMode })),
            toggleSimpleMode: () => set((state) => ({ simpleMode: !state.simpleMode })),
        }),
        {
            name: 'colorwizard-layout',
            storage: safeStorage,
            partialize: (state) => ({
                sidebarCollapsed: state.sidebarCollapsed,
                compactMode: state.compactMode,
                sidebarWidth: state.sidebarWidth,
                simpleMode: state.simpleMode,
            }),
            merge: (persisted, current) => {
                const p = persisted as Partial<LayoutState> | undefined
                if (!p) return current
                return {
                    ...current,
                    ...p,
                    sidebarWidth: clampSidebarWidth(p.sidebarWidth ?? current.sidebarWidth),
                }
            },
        }
    )
)
