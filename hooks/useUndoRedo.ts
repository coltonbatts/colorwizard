'use client'

import { useState, useCallback, useRef } from 'react'

/**
 * useUndoRedo - A generic hook for managing undo/redo state history.
 */
export function useUndoRedo<T>(initialState: T, maxHistory: number = 50) {
    const [state, setState] = useState<T>(initialState)
    const historyRef = useRef<T[]>([initialState])
    const pointerRef = useRef<number>(0)

    // Push a new state to the history
    const push = useCallback((newState: T) => {
        // If the new state is the same as the current state, don't push
        if (JSON.stringify(newState) === JSON.stringify(historyRef.current[pointerRef.current])) {
            return
        }

        // Remove any "redo" states if we're in the middle of the history
        const newHistory = historyRef.current.slice(0, pointerRef.current + 1)

        // Add the new state
        newHistory.push(newState)

        // Trim history if it exceeds max
        if (newHistory.length > maxHistory) {
            newHistory.shift()
        } else {
            pointerRef.current++
        }

        historyRef.current = newHistory
        setState(newState)
    }, [maxHistory])

    // Undo to the previous state
    const undo = useCallback(() => {
        if (pointerRef.current > 0) {
            pointerRef.current--
            const prevState = historyRef.current[pointerRef.current]
            setState(prevState)
            return prevState
        }
        return null
    }, [])

    // Redo to the next state
    const redo = useCallback(() => {
        if (pointerRef.current < historyRef.current.length - 1) {
            pointerRef.current++
            const nextState = historyRef.current[pointerRef.current]
            setState(nextState)
            return nextState
        }
        return null
    }, [])

    // Reset history
    const clear = useCallback((newState: T) => {
        historyRef.current = [newState]
        pointerRef.current = 0
        setState(newState)
    }, [])

    return {
        state,
        setState, // Direct state update without history (use carefully)
        push,
        undo,
        redo,
        clear,
        canUndo: pointerRef.current > 0,
        canRedo: pointerRef.current < historyRef.current.length - 1
    }
}
