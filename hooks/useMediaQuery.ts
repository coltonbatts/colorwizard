'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to detect media queries in a performant way
 * SSR-safe: initializes with actual value to prevent hydration mismatches
 */
export function useMediaQuery(query: string): boolean {
    // Initialize to false to prevent hydration mismatch
    const [matches, setMatches] = useState(false)

    useEffect(() => {
        // Guard for SSR
        if (typeof window === 'undefined') return

        try {
            const media = window.matchMedia(query)
            if (media.matches !== matches) {
                setMatches(media.matches)
            }

            const listener = () => setMatches(media.matches)
            media.addEventListener('change', listener)
            return () => media.removeEventListener('change', listener)
        } catch (error) {
            console.warn('matchMedia not available:', error)
        }
    }, [matches, query])

    return matches
}

/** Viewports at or below this width use the touch-first mobile workbench. */
export const MOBILE_WORKBENCH_MAX_WIDTH_PX = 1024

/**
 * Touch-first workbench (bottom sheet, compact toolbar) for phones, tablets,
 * and smaller laptop windows where the studio desktop chrome is too cramped.
 */
export function useIsMobile() {
    return useMediaQuery(`(max-width: ${MOBILE_WORKBENCH_MAX_WIDTH_PX}px)`)
}
