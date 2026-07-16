'use client'

/**
 * Dialog to name and save the current paint selection as a palette.
 */

import { useId, useState, useRef, useEffect } from 'react'
import { usePaintPaletteStore } from '@/lib/store/usePaintPaletteStore'
import OverlaySurface from '@/components/ui/Overlay'

interface SavePaletteModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function SavePaletteModal({ isOpen, onClose }: SavePaletteModalProps) {
    const [name, setName] = useState('')
    const [error, setError] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)
    const titleId = useId()
    const inputId = useId()
    const errorId = useId()

    const { selectedPaintIds, savePalette, getActivePalette, updatePalette, isDirty } = usePaintPaletteStore()
    const activePalette = getActivePalette()

    useEffect(() => {
        if (!isOpen) return

        setName(activePalette && !isDirty ? activePalette.name : '')
        setError('')
    }, [isOpen, activePalette, isDirty])

    const handleSave = () => {
        const trimmed = name.trim()

        if (!trimmed) {
            setError('Enter a palette name.')
            return
        }

        if (activePalette && !isDirty) {
            onClose()
            return
        }

        if (activePalette && isDirty) {
            updatePalette(activePalette.id)
        } else {
            savePalette(trimmed)
        }

        onClose()
    }

    return (
        <OverlaySurface
            isOpen={isOpen}
            onClose={onClose}
            preset="dialog"
            ariaLabelledBy={titleId}
            initialFocusRef={inputRef}
            rootClassName="fixed inset-0 z-[1000] flex items-center justify-center p-4"
            backdropClassName="absolute inset-0 bg-black/35"
            panelClassName="relative w-full max-w-md overflow-hidden rounded-xl border border-ink-hairline bg-paper-elevated shadow-[0_20px_80px_rgba(26,26,26,0.18)]"
        >
            <header className="flex items-start justify-between gap-5 border-b border-ink-hairline bg-paper-recessed px-5 py-4">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Paint library</p>
                    <h2 id={titleId} className="mt-1 font-display text-2xl font-medium tracking-tight text-ink">
                        {activePalette && isDirty ? 'Update palette' : 'Save palette'}
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-paper hover:text-ink"
                    aria-label="Close palette dialog"
                >
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </header>

            <div className="space-y-5 p-5">
                <div className="flex items-center justify-between rounded-lg border border-linen bg-paper px-4 py-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Working selection</span>
                    <span className="text-sm font-semibold text-ink">
                        {selectedPaintIds.length} paint{selectedPaintIds.length !== 1 ? 's' : ''}
                    </span>
                </div>

                <div>
                    <label htmlFor={inputId} className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                        Palette name
                    </label>
                    <input
                        ref={inputRef}
                        id={inputId}
                        name="paletteName"
                        type="text"
                        autoComplete="off"
                        value={name}
                        onChange={(event) => {
                            setName(event.target.value)
                            setError('')
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault()
                                handleSave()
                            }
                        }}
                        placeholder="Studio palette, plein air kit…"
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? errorId : undefined}
                        className={`min-h-11 w-full rounded-md border bg-paper-elevated px-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint ${
                            error
                                ? 'border-danger focus:border-danger'
                                : 'border-linen-strong focus:border-ink'
                        }`}
                    />
                    {error && (
                        <p id={errorId} role="alert" className="mt-2 text-[11px] font-medium text-danger">{error}</p>
                    )}
                </div>
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-ink-hairline bg-paper-recessed px-5 py-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="min-h-10 rounded-md px-4 text-sm font-medium text-ink-secondary transition-colors hover:bg-paper hover:text-ink"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={selectedPaintIds.length === 0}
                    className="min-h-10 rounded-md bg-ink px-4 text-sm font-semibold text-paper-elevated transition-colors hover:bg-graphite disabled:cursor-not-allowed disabled:opacity-45"
                >
                    {activePalette && isDirty ? 'Update' : 'Save palette'}
                </button>
            </footer>
        </OverlaySurface>
    )
}
