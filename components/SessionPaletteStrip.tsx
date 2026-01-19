'use client'

/**
 * SessionPaletteStrip - Bottom strip showing session colors
 * Persisted to localStorage for session continuity
 */

import { useState, useEffect, useCallback } from 'react'

export interface SessionColor {
    id: string
    hex: string
    rgb: { r: number; g: number; b: number }
    label: string
    timestamp: number
}

interface SessionPaletteStripProps {
    onColorSelect?: (color: SessionColor) => void
}

const STORAGE_KEY = 'colorwizard-session-palette'

export default function SessionPaletteStrip({ onColorSelect }: SessionPaletteStripProps) {
    // Load from localStorage on mount - using initializer function for state
    const [colors, setColors] = useState<SessionColor[]>(() => {
        if (typeof window === 'undefined') return []
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            return saved ? JSON.parse(saved) : []
        } catch (e) {
            console.error('Failed to load session palette', e)
            return []
        }
    })
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editLabel, setEditLabel] = useState('')
    const [copied, setCopied] = useState<string | null>(null)

    // Save to localStorage when colors change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(colors))
        } catch (e) {
            console.error('Failed to save session palette', e)
        }
    }, [colors])

    const addColor = useCallback((hex: string, rgb: { r: number; g: number; b: number }) => {
        const newColor: SessionColor = {
            id: crypto.randomUUID(),
            hex,
            rgb,
            label: `Swatch ${colors.length + 1}`,
            timestamp: Date.now()
        }
        setColors(prev => [...prev, newColor].slice(-20)) // Max 20 colors
    }, [colors.length])

    const removeColor = (id: string) => {
        setColors(prev => prev.filter(c => c.id !== id))
    }

    const renameColor = (id: string, newLabel: string) => {
        setColors(prev => prev.map(c => c.id === id ? { ...c, label: newLabel } : c))
        setEditingId(null)
    }

    const copyHex = (hex: string, id: string) => {
        navigator.clipboard.writeText(hex)
        setCopied(id)
        setTimeout(() => setCopied(null), 1500)
    }

    const exportPalette = () => {
        const data = JSON.stringify(colors, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `session-palette-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const clearAll = useCallback(() => {
        setColors([])
    }, [])

    // Expose addColor for parent components
    useEffect(() => {
        (window as any).__sessionPaletteAdd = addColor
        return () => { delete (window as any).__sessionPaletteAdd }
    }, [addColor])

    if (colors.length === 0) {
        return null // Don't show strip when empty
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-lg z-40">
            <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
                {/* Label */}
                <span className="text-[10px] font-black text-studio-dim uppercase tracking-widest shrink-0">
                    Session
                </span>

                {/* Color swatches */}
                <div className="flex gap-2 flex-1 overflow-x-auto py-1">
                    {colors.map((color) => (
                        <div
                            key={color.id}
                            className="relative group shrink-0"
                        >
                            {/* Swatch */}
                            <button
                                onClick={() => onColorSelect?.(color)}
                                className="w-10 h-10 rounded-lg shadow-md border border-gray-200 hover:scale-110 transition-transform"
                                style={{ backgroundColor: color.hex }}
                                title={`${color.label}\n${color.hex}`}
                            />

                            {/* Hover menu */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
                                <div className="bg-gray-900 rounded-lg shadow-xl p-2 flex flex-col gap-1 min-w-[100px]">
                                    {/* Label */}
                                    {editingId === color.id ? (
                                        <input
                                            type="text"
                                            value={editLabel}
                                            onChange={(e) => setEditLabel(e.target.value)}
                                            onBlur={() => renameColor(color.id, editLabel)}
                                            onKeyDown={(e) => e.key === 'Enter' && renameColor(color.id, editLabel)}
                                            className="bg-gray-800 text-white text-xs px-2 py-1 rounded border border-gray-700 w-full"
                                            autoFocus
                                        />
                                    ) : (
                                        <span className="text-white text-xs font-bold px-1 whitespace-normal break-words">{color.label}</span>
                                    )}
                                    <span className="text-gray-400 text-[10px] font-mono px-1">{color.hex}</span>

                                    {/* Actions */}
                                    <div className="flex gap-1 mt-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setEditingId(color.id); setEditLabel(color.label) }}
                                            className="flex-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-[10px] text-gray-300"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); copyHex(color.hex, color.id) }}
                                            className="flex-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-[10px] text-gray-300"
                                        >
                                            {copied === color.id ? '✓' : '📋'}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeColor(color.id) }}
                                            className="flex-1 px-2 py-1 bg-red-900 hover:bg-red-800 rounded text-[10px] text-red-300"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={exportPalette}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                        Export
                    </button>
                    <button
                        onClick={clearAll}
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-studio-dim rounded-lg text-xs font-bold transition-colors"
                    >
                        Clear
                    </button>
                </div>
            </div>
        </div>
    )
}

// Hook for adding colors from anywhere
export function useSessionPalette() {
    const addColor = (hex: string, rgb: { r: number; g: number; b: number }) => {
        if (typeof window !== 'undefined' && (window as any).__sessionPaletteAdd) {
            (window as any).__sessionPaletteAdd(hex, rgb)
        }
    }
    return { addColor }
}
