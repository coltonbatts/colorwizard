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

/**
 * Convenience hook for mobile detection (max-width: 768px)
 */
export function useIsMobile() {
    return useMediaQuery('(max-width: 768px)')
}
