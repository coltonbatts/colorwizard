'use client'

/**
 * Palette Switcher
 * 
 * Dropdown to switch between saved palettes and create new ones.
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
        clearSelection
    } = usePaintPaletteStore()

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return

        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Saved Palettes
                </span>
            </div>

            {/* Palette List */}
            <div className="max-h-64 overflow-y-auto">
                {savedPalettes.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-gray-500">
                        No palettes saved yet
                    </div>
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

            {/* Actions */}
            <div className="border-t border-gray-100 p-2 space-y-1">
                <button
                    onClick={() => {
                        onNewPalette()
                        onClose()
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    Save Current Selection
                </button>

                <button
                    onClick={() => {
                        clearSelection()
                        onClose()
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4l16 16M4 20L20 4" />
                    </svg>
                    Use All Paints
                </button>
            </div>
        </div>
    )
}

function PaletteRow({
    palette,
    isActive,
    onSelect
}: {
    palette: PaintPalette
    isActive: boolean
    onSelect: () => void
}) {
    return (
        <button
            onClick={onSelect}
            className={`
                w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                ${isActive
                    ? 'bg-blue-50 border-l-2 border-blue-500'
                    : 'hover:bg-gray-50 border-l-2 border-transparent'}
            `}
        >
            {/* Active indicator */}
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-blue-500' : 'bg-gray-300'}`} />

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                    {palette.name}
                </div>
                <div className="text-xs text-gray-500">
                    {palette.paintIds.length} paint{palette.paintIds.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Check mark for active */}
            {isActive && (
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
            )}
        </button>
    )
}
