'use client'

import { useState, useRef, useEffect } from 'react'
import { Palette } from '@/lib/types/palette'

interface PaletteSelectorProps {
    palettes: Palette[]
    activePalette: Palette
    onSelectPalette: (paletteId: string) => void
    onOpenManager: () => void
}

/**
 * Dropdown to switch between saved palettes.
 */
export default function PaletteSelector({
    palettes,
    activePalette,
    onSelectPalette,
    onOpenManager,
}: PaletteSelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-200 transition-colors"
            >
                {/* Color dots indicator */}
                <div className="flex -space-x-1">
                    {activePalette.colors.slice(0, 4).map((color) => (
                        <div
                            key={color.id}
                            className="w-3 h-3 rounded-full border border-gray-600"
                            style={{ backgroundColor: getColorHex(color.id) }}
                        />
                    ))}
                    {activePalette.colors.length > 4 && (
                        <div className="w-3 h-3 rounded-full bg-gray-600 border border-gray-600 flex items-center justify-center text-[8px] text-gray-300">
                            +{activePalette.colors.length - 4}
                        </div>
                    )}
                </div>
                <span className="font-medium">{activePalette.name}</span>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="p-2 border-b border-gray-700">
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                            Select Palette
                        </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                        {palettes.map((palette) => (
                            <button
                                key={palette.id}
                                onClick={() => {
                                    onSelectPalette(palette.id)
                                    setIsOpen(false)
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-700 transition-colors ${palette.isActive ? 'bg-blue-900/30 border-l-2 border-blue-500' : ''
                                    }`}
                            >
                                {/* Color preview dots */}
                                <div className="flex -space-x-1 shrink-0">
                                    {palette.colors.slice(0, 3).map((color) => (
                                        <div
                                            key={color.id}
                                            className="w-3 h-3 rounded-full border border-gray-600"
                                            style={{ backgroundColor: getColorHex(color.id) }}
                                        />
                                    ))}
                                    {palette.colors.length > 3 && (
                                        <div className="w-3 h-3 rounded-full bg-gray-600 border border-gray-600 flex items-center justify-center text-[6px] text-gray-300">
                                            +{palette.colors.length - 3}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-gray-200 truncate">{palette.name}</div>
                                    <div className="text-[10px] text-gray-500">
                                        {palette.colors.length} color{palette.colors.length !== 1 ? 's' : ''}
                                        {palette.isDefault && ' • Default'}
                                    </div>
                                </div>

                                {palette.isActive && (
                                    <svg className="w-4 h-4 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="p-2 border-t border-gray-700">
                        <button
                            onClick={() => {
                                onOpenManager()
                                setIsOpen(false)
                            }}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-200 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Manage Palettes
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

/**
 * Get hex color for a pigment ID.
 */
function getColorHex(pigmentId: string): string {
    const colorMap: Record<string, string> = {
        'titanium-white': '#FDFDFD',
        'ivory-black': '#0B0B0B',
        'yellow-ochre': '#CC8E35',
        'cadmium-red': '#E52B21',
        'phthalo-green': '#123524',
        'phthalo-blue': '#0F2E53',
    }
    return colorMap[pigmentId] || '#808080'
}
