'use client'

/**
 * SessionPaletteStrip - Bottom strip showing session colors
 * Persisted to localStorage for session continuity with tactile spring interactions
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, Reorder } from 'framer-motion'
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
  const [colors, setColors] = useState<SessionColor[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [activePopup, setActivePopup] = useState<string | null>(null)

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
    setColors(prev => [...prev, newColor].slice(-20))
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

  useEffect(() => {
    const sessionWindow = window as SessionPaletteWindow
    sessionWindow.__sessionPaletteAdd = addColor
    return () => { delete sessionWindow.__sessionPaletteAdd }
  }, [addColor])

  if (colors.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-[4.5rem] left-1/2 z-40 w-[min(calc(100vw-1rem),84rem)] -translate-x-1/2 px-2 md:bottom-4 md:w-[min(calc(100vw-10rem),92rem)] md:px-0">
      <div className="rounded-2xl border border-ink-hairline bg-paper-elevated/95 px-3 py-2.5 shadow-lg backdrop-blur-md md:px-4">
        <div className="flex items-center gap-3 overflow-x-auto">
          <div className="shrink-0 font-serif text-xs font-semibold text-ink">
            Saved Palette <span className="font-mono text-[11px] font-normal text-ink-muted">({colors.length})</span>
          </div>

          <Reorder.Group
            axis="x"
            values={colors}
            onReorder={setColors}
            className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1"
          >
            {colors.map((color) => (
              <Reorder.Item
                key={color.id}
                value={color}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                className="group relative shrink-0 cursor-grab active:cursor-grabbing"
              >
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    setActivePopup(activePopup === color.id ? null : color.id)
                  }}
                  onDoubleClick={() => {
                    setActivePopup(null)
                    onColorSelect?.(color)
                  }}
                  className={`h-10 w-10 rounded-xl border transition-shadow md:h-11 md:w-11 ${
                    activePopup === color.id
                      ? 'border-ink shadow-[0_0_0_2px_rgba(26,26,26,0.3)]'
                      : 'border-ink-hairline shadow-sm hover:border-ink'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title="Drag to reorder, tap for actions, double-tap to sample"
                  aria-label={`Session swatch ${color.label}. Drag to reorder, tap for actions, double-tap to sample.`}
                />

                <div className={`absolute bottom-full left-1/2 z-50 mb-2 w-44 -translate-x-1/2 transition-opacity ${
                  activePopup === color.id
                    ? 'pointer-events-auto opacity-100'
                    : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100'
                }`}>
                  <div className="rounded-xl border border-ink-hairline bg-paper-elevated p-3 shadow-xl ring-1 ring-black/5">
                    {editingId === color.id ? (
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onBlur={() => renameColor(color.id, editLabel)}
                        onKeyDown={(e) => e.key === 'Enter' && renameColor(color.id, editLabel)}
                        className="w-full rounded-lg border border-ink-hairline bg-paper px-2 py-1 text-xs text-ink focus:border-ink focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <div className="font-serif text-xs font-semibold text-ink">{color.label}</div>
                    )}
                    <div className="mt-1 font-mono text-[11px] font-bold tabular-nums text-ink-secondary">{color.hex.toUpperCase()}</div>

                    <div className="mt-2.5 flex gap-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setEditingId(color.id); setEditLabel(color.label) }}
                        className="flex-1 rounded-md border border-ink-hairline bg-paper py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink hover:bg-paper-recessed"
                        aria-label={`Edit label for ${color.label}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); copyHex(color.hex, color.id) }}
                        className="flex-1 rounded-md border border-ink-hairline bg-paper py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink hover:bg-paper-recessed"
                        aria-label={`Copy hex code ${color.hex}`}
                      >
                        {copied === color.id ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeColor(color.id) }}
                        className="flex-1 rounded-md border border-signal-muted bg-signal-muted py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-signal hover:bg-signal hover:text-white"
                        aria-label={`Remove color ${color.label}`}
                      >
                        Drop
                      </button>
                    </div>
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>

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
              className="rounded-xl border border-ink-hairline bg-paper px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:bg-paper-recessed"
            />
            <button
              onClick={exportPalette}
              className="rounded-xl border border-ink-hairline bg-paper px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:bg-paper-recessed"
            >
              JSON
            </button>
            <button
              onClick={clearAll}
              className="rounded-xl border border-ink-hairline bg-paper px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted transition-colors hover:bg-paper-recessed hover:text-ink"
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
