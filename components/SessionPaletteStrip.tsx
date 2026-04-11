'use client'

/**
 * SessionPaletteStrip - Bottom strip showing session colors
 * Persisted to localStorage for session continuity
 */

import { useState, useEffect, useCallback } from 'react'
import { getBestContrast, getContrastRatio } from '@/lib/color/a11y'
import ProcreateExportButton from './ProcreateExportButton'
import type { ProcreateColor } from '@/lib/types/procreate'

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
type SessionPaletteAddFn = (hex: string, rgb: { r: number; g: number; b: number }) => void
type SessionPaletteWindow = Window & { __sessionPaletteAdd?: SessionPaletteAddFn }

export default function SessionPaletteStrip({ onColorSelect }: SessionPaletteStripProps) {
    // Load from localStorage on mount - using initializer function for state
    const [colors, setColors] = useState<SessionColor[]>([])
    const [editingId, setEditingId] = useState<string | null>(null)

    // Load from localStorage on mount safely
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                setColors(JSON.parse(saved))
            }
        } catch (e) {
            console.error('Failed to load session palette', e)
        }
    }, [])
    const [editLabel, setEditLabel] = useState('')
    const [copied, setCopied] = useState<string | null>(null)
    const [activePopup, setActivePopup] = useState<string | null>(null)

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
        const sessionWindow = window as SessionPaletteWindow
        sessionWindow.__sessionPaletteAdd = addColor
        return () => { delete sessionWindow.__sessionPaletteAdd }
    }, [addColor])

    if (colors.length === 0) {
        return null // Don't show strip when empty
    }

    return (
        <div className="fixed bottom-[4.5rem] left-1/2 z-40 w-[min(calc(100vw-1rem),84rem)] -translate-x-1/2 px-2 md:bottom-4 md:w-[min(calc(100vw-10rem),92rem)] md:px-0">
            <div className="glass-panel-elevated rounded-[30px] px-3 py-3 md:px-4">
                <div className="flex items-center gap-3 overflow-x-auto">
                    <div className="shrink-0 pr-1">
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">
                            Session Dock
                        </div>
                        <div className="mt-1 text-sm font-black tracking-tight text-ink">
                            {colors.length} saved
                        </div>
                    </div>

                    <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1">
                        {colors.map((color) => (
                            <div
                                key={color.id}
                                className="group relative shrink-0"
                            >
                                <button
                                    onClick={() => {
                                        setActivePopup(activePopup === color.id ? null : color.id)
                                    }}
                                    onDoubleClick={() => {
                                        setActivePopup(null)
                                        onColorSelect?.(color)
                                    }}
                                    className={`flex h-14 w-14 items-end justify-start rounded-[22px] border p-2 shadow-[0_14px_28px_rgba(33,24,14,0.10)] transition-all md:h-16 md:w-16 ${
                                        activePopup === color.id
                                            ? 'scale-[1.04] border-signal ring-2 ring-signal/20'
                                            : 'border-ink-hairline hover:-translate-y-0.5 hover:scale-[1.03]'
                                    }`}
                                    style={{ backgroundColor: color.hex }}
                                    title="Tap for actions, double-tap to sample again"
                                    aria-label={`Session swatch ${color.label}. Tap for actions, double-tap to sample again.`}
                                >
                                    <span
                                        className="rounded-md bg-white/72 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tight"
                                        style={{ color: getBestContrast(color.hex) }}
                                    >
                                        {getContrastRatio(color.hex, getBestContrast(color.hex)).toFixed(1)}
                                    </span>
                                </button>

                                <div className={`absolute bottom-full left-1/2 z-50 mb-2 w-40 -translate-x-1/2 transition-opacity ${
                                    activePopup === color.id
                                        ? 'pointer-events-auto opacity-100'
                                        : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100'
                                }`}>
                                    <div className="rounded-2xl border border-ink-hairline bg-ink px-3 py-3 shadow-[0_18px_40px_rgba(26,26,26,0.24)]">
                                        {editingId === color.id ? (
                                            <input
                                                type="text"
                                                value={editLabel}
                                                onChange={(e) => setEditLabel(e.target.value)}
                                                onBlur={() => renameColor(color.id, editLabel)}
                                                onKeyDown={(e) => e.key === 'Enter' && renameColor(color.id, editLabel)}
                                                className="w-full rounded-lg border border-white/10 bg-white/10 px-2 py-1.5 text-xs text-white outline-none"
                                                autoFocus
                                            />
                                        ) : (
                                            <div className="text-sm font-bold text-white">{color.label}</div>
                                        )}
                                        <div className="mt-1 font-mono text-[11px] text-white/70">{color.hex}</div>

                                        <div className="mt-3 flex gap-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setEditingId(color.id); setEditLabel(color.label) }}
                                                className="flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-white/15"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); copyHex(color.hex, color.id) }}
                                                className="flex-1 rounded-lg bg-white/10 px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-white/15"
                                            >
                                                {copied === color.id ? 'Copied' : 'Copy'}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeColor(color.id) }}
                                                className="flex-1 rounded-lg bg-signal px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-signal-hover"
                                            >
                                                Drop
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <ProcreateExportButton
                            colors={colors
                                .filter(c => c && c.rgb)
                                .map((c): ProcreateColor => ({
                                    hex: c.hex,
                                    name: c.label,
                                    rgb: [c.rgb.r, c.rgb.g, c.rgb.b],
                                }))}
                            paletteName="Session Palette"
                            variant="minimal"
                            className="rounded-full border border-ink-hairline bg-paper px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-ink-secondary"
                        />
                        <button
                            onClick={exportPalette}
                            className="rounded-full border border-ink-hairline bg-paper px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-ink-secondary transition-colors hover:bg-paper-recessed hover:text-ink"
                        >
                            JSON
                        </button>
                        <button
                            onClick={clearAll}
                            className="rounded-full border border-ink-hairline bg-paper px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-ink-secondary transition-colors hover:bg-paper-recessed hover:text-signal"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Hook for adding colors from anywhere
export function useSessionPalette() {
    const addColor = (hex: string, rgb: { r: number; g: number; b: number }) => {
        if (typeof window !== 'undefined') {
            const sessionWindow = window as SessionPaletteWindow
            sessionWindow.__sessionPaletteAdd?.(hex, rgb)
        }
    }
    return { addColor }
}

// Hook to check if session colors exist (for parent layout padding)
export function useHasSessionColors() {
    const [hasColors, setHasColors] = useState(false)

    useEffect(() => {
        const checkColors = () => {
            try {
                const saved = localStorage.getItem(STORAGE_KEY)
                const colors = saved ? JSON.parse(saved) : []
                setHasColors(colors.length > 0)
            } catch {
                setHasColors(false)
            }
        }

        checkColors()

        // Listen for storage changes (in case colors are updated)
        const handleStorageChange = () => checkColors()
        window.addEventListener('storage', handleStorageChange)

        // Poll briefly to sync with component updates
        const interval = setInterval(checkColors, 1000)

        return () => {
            window.removeEventListener('storage', handleStorageChange)
            clearInterval(interval)
        }
    }, [])

    return hasColors
}
