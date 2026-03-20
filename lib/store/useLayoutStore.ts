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

export const useLayoutStore = create<LayoutState>()(
    persist(
        (set) => ({
            sidebarCollapsed: false,
            compactMode: false,
            sidebarWidth: 400,
            simpleMode: true,

            setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
            setCompactMode: (compactMode) => set({ compactMode }),
            setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
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
        }
    )
)

