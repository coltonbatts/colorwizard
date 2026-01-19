'use client'

import { useEffect, useCallback } from 'react'
import { useStore } from '@/lib/store/useStore'

/**
 * Hook to manage layout preferences with responsive behavior and keyboard shortcuts
 */
export function useLayoutPreferences() {
    const {
        sidebarCollapsed,
        compactMode,
        toggleSidebar,
        toggleCompactMode,
        setSidebarCollapsed,
        setCompactMode
    } = useStore()

    // Auto-collapse sidebar on small screens
    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 1366px)')

        const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
            if (e.matches && !sidebarCollapsed) {
                // Don't auto-collapse if user has explicitly expanded
            }
        }

        handleMediaChange(mediaQuery)

        mediaQuery.addEventListener('change', handleMediaChange)
        return () => mediaQuery.removeEventListener('change', handleMediaChange)
    }, [sidebarCollapsed])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return
            }

            // Ctrl+P or Cmd+P: Toggle sidebar panel
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault()
                toggleSidebar()
            }

            // Ctrl+\ or Cmd+\: Toggle compact mode
            if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
                e.preventDefault()
                toggleCompactMode()
            }

            // Escape: Collapse sidebar if expanded
            if (e.key === 'Escape' && !sidebarCollapsed) {
                setSidebarCollapsed(true)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [toggleSidebar, toggleCompactMode, sidebarCollapsed, setSidebarCollapsed])

    return {
        sidebarCollapsed,
        compactMode,
        toggleSidebar,
        toggleCompactMode,
        setSidebarCollapsed,
        setCompactMode
    }
}
