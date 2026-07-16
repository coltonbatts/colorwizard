'use client'

/**
 * Popover for switching between saved paint palettes.
 */

import { useRef, useEffect } from 'react'
import { usePaintPaletteStore, PaintPalette } from '@/lib/store/usePaintPaletteStore'

interface PaletteSwitcherProps {
    isOpen: boolean
    onClose: () => void
    onNewPalette: () => void
}

export default function PaletteSwitcher({ isOpen, onClose, onNewPalette }: PaletteSwitcherProps) {
    const dropdownRef = useRef<HTMLDivElement>(null)
    const {
        savedPalettes,
        activePaletteId,
        loadPalette,
        clearSelection,
    } = usePaintPaletteStore()

    useEffect(() => {
        if (!isOpen) return

        function handlePointerDown(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose()
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                event.preventDefault()
                onClose()
            }
        }

        document.addEventListener('mousedown', handlePointerDown)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('mousedown', handlePointerDown)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-linen-strong bg-paper-elevated shadow-[0_18px_44px_rgba(26,26,26,0.14)]"
            aria-label="Saved paint palettes"
        >
            <div className="border-b border-ink-hairline bg-paper-recessed px-3 py-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                    Saved palettes
                </span>
            </div>

            <div className="max-h-64 overflow-y-auto">
                {savedPalettes.length === 0 ? (
                    <p className="px-3 py-5 text-center text-sm text-ink-muted">
                        No saved palettes yet.
                    </p>
                ) : (
                    savedPalettes.map((palette) => (
                        <PaletteRow
                            key={palette.id}
                            palette={palette}
                            isActive={palette.id === activePaletteId}
                            onSelect={() => {
                                loadPalette(palette.id)
                                onClose()
                            }}
                        />
                    ))
                )}
            </div>

            <div className="space-y-1 border-t border-ink-hairline bg-paper-recessed p-2">
                <button
                    type="button"
                    onClick={() => {
                        onNewPalette()
                        onClose()
                    }}
                    className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-medium text-ink transition-colors hover:bg-paper-elevated"
                >
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Save current selection
                </button>

                <button
                    type="button"
                    onClick={() => {
                        clearSelection()
                        onClose()
                    }}
                    className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-medium text-ink-secondary transition-colors hover:bg-paper-elevated hover:text-ink"
                >
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4l16 16M4 20L20 4" />
                    </svg>
                    Use all paints
                </button>
            </div>
        </div>
    )
}

function PaletteRow({
    palette,
    isActive,
    onSelect,
}: {
    palette: PaintPalette
    isActive: boolean
    onSelect: () => void
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={isActive}
            className={`flex min-h-12 w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left transition-colors ${
                isActive
                    ? 'border-ink bg-paper-recessed'
                    : 'border-transparent hover:bg-paper'
            }`}
        >
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${isActive ? 'bg-ink' : 'bg-linen-strong'}`} />

            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{palette.name}</span>
                <span className="block text-[11px] text-ink-muted">
                    {palette.paintIds.length} paint{palette.paintIds.length !== 1 ? 's' : ''}
                </span>
            </span>

            {isActive && (
                <svg aria-hidden="true" className="h-4 w-4 text-ink" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
            )}
        </button>
    )
}
