'use client'

import { useState, useEffect } from 'react'

/**
 * useDebounce - Debounce a value to avoid flicker
 * 
 * Useful for loading states: only show loader if operation takes >delay ms
 * 
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default 100ms)
 * @returns Debounced value
 * 
 * @example
 * const [isLoading, setIsLoading] = useState(false)
 * const showLoader = useDebounce(isLoading, 100)
 * // showLoader only becomes true if isLoading stays true for 100ms
 */
export function useDebounce<T>(value: T, delay: number = 100): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        // For loading states: immediately hide when value becomes false
        // Only debounce when value becomes true
        if (value === false || value === null || value === undefined) {
            setDebouncedValue(value)
            return
        }

        const timer = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => {
            clearTimeout(timer)
        }
    }, [value, delay])

    return debouncedValue
}

/**
 * useDebouncedLoading - Specialized hook for loading states
 * 
 * Only shows loading after delay, immediately hides when done
 * 
 * @param isLoading - Current loading state
 * @param delay - Delay before showing loader (default 100ms)
 */
export function useDebouncedLoading(isLoading: boolean, delay: number = 100): boolean {
    const [showLoading, setShowLoading] = useState(false)

    useEffect(() => {
        if (!isLoading) {
            // Immediately hide loading
            setShowLoading(false)
            return
        }

        // Delay showing loading
        const timer = setTimeout(() => {
            setShowLoading(true)
        }, delay)

        return () => clearTimeout(timer)
    }, [isLoading, delay])

    return showLoading
}
