'use client'

/**
 * Save Palette Modal
 * 
 * Dialog to name and save the current paint selection as a palette.
 */

import { useState, useRef, useEffect } from 'react'
import { usePaintPaletteStore } from '@/lib/store/usePaintPaletteStore'

interface SavePaletteModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function SavePaletteModal({ isOpen, onClose }: SavePaletteModalProps) {
    const [name, setName] = useState('')
    const [error, setError] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    const { selectedPaintIds, savePalette, getActivePalette, updatePalette, isDirty } = usePaintPaletteStore()
    const activePalette = getActivePalette()

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            // Pre-fill with existing palette name if editing
            if (activePalette && !isDirty) {
                setName(activePalette.name)
            } else {
                setName('')
            }
            setError('')
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [isOpen, activePalette, isDirty])

    if (!isOpen) return null

    const handleSave = () => {
        const trimmed = name.trim()

        if (!trimmed) {
            setError('Please enter a palette name')
            return
        }

        if (activePalette && !isDirty) {
            // Rename existing (no changes to paints, just renaming)
            // For now, we just close - rename would need additional store method
            onClose()
            return
        }

        if (activePalette && isDirty) {
            // Update existing palette with current selection
            updatePalette(activePalette.id)
        } else {
            // Save as new palette
            savePalette(trimmed)
        }

        onClose()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave()
        } else if (e.key === 'Escape') {
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 fade-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">
                        {activePalette && isDirty ? 'Update Palette' : 'Save Palette'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-5">
                    {/* Paint count indicator */}
                    <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
                        <span className="text-lg">🎨</span>
                        <span className="text-sm text-blue-800">
                            {selectedPaintIds.length} paint{selectedPaintIds.length !== 1 ? 's' : ''} selected
                        </span>
                    </div>

                    {/* Name input */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Palette Name
                        </label>
                        <input
                            ref={inputRef}
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value)
                                setError('')
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="e.g., Studio Palette, Plein Air Kit..."
                            className={`
                                w-full px-4 py-3 rounded-xl border text-sm
                                ${error
                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                    : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500'}
                                focus:outline-none focus:ring-2
                            `}
                        />
                        {error && (
                            <p className="mt-1 text-xs text-red-500">{error}</p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 px-5 py-4 bg-gray-50 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={selectedPaintIds.length === 0}
                        className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {activePalette && isDirty ? 'Update' : 'Save Palette'}
                    </button>
                </div>
            </div>
        </div>
    )
}
