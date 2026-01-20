'use client'

/**
 * Palette Indicator
 * 
 * Compact header showing active paint palette status at top of library.
 * Shows palette name, paint count, and quick actions.
 */

import { usePaintPaletteStore } from '@/lib/store/usePaintPaletteStore'

interface PaletteIndicatorProps {
    onSave: () => void
    onSwitchClick: () => void
}

export default function PaletteIndicator({ onSave, onSwitchClick }: PaletteIndicatorProps) {
    const {
        selectedPaintIds,
        getActivePalette,
        clearSelection,
        isDirty
    } = usePaintPaletteStore()

    const activePalette = getActivePalette()
    const count = selectedPaintIds.length

    if (count === 0) {
        return (
            <div className="p-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-500">
                        <span className="text-lg">🎨</span>
                        <span className="text-sm">No paints selected</span>
                    </div>
                    <button
                        onClick={onSwitchClick}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                        Load Palette
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                    Click paints below to build your palette
                </p>
            </div>
        )
    }

    return (
        <div className="p-3 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🎨</span>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                                {activePalette ? activePalette.name : 'Unsaved Palette'}
                            </span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                                {count} paint{count !== 1 ? 's' : ''}
                            </span>
                            {isDirty && activePalette && (
                                <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                                    Modified
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-2">
                <button
                    onClick={onSave}
                    className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                    {activePalette && !isDirty ? 'Rename' : 'Save'}
                </button>
                <button
                    onClick={onSwitchClick}
                    className="px-2 py-1 text-xs font-medium bg-white text-gray-700 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                >
                    Switch
                </button>
                <button
                    onClick={clearSelection}
                    className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                    Clear
                </button>
            </div>
        </div>
    )
}
