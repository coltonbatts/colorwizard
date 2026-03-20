'use client'

import { useEffect, useId, useState } from 'react'
import { Palette, PaletteColor, ALL_PALETTE_COLORS, generatePaletteId } from '@/lib/types/palette'
import { getBestContrast, getContrastRatio } from '@/lib/color/a11y'
import OverlaySurface from '@/components/ui/Overlay'

interface PaletteManagerProps {
    isOpen: boolean
    onClose: () => void
    palettes: Palette[]
    onCreatePalette: (palette: Palette) => void
    onUpdatePalette: (palette: Palette) => void
    onDeletePalette: (paletteId: string) => void
}

/**
 * Modal for creating, editing, and deleting palettes.
 */
export default function PaletteManager({
    isOpen,
    onClose,
    palettes,
    onCreatePalette,
    onUpdatePalette,
    onDeletePalette,
}: PaletteManagerProps) {
    const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
    const [editingPalette, setEditingPalette] = useState<Palette | null>(null)
    const [name, setName] = useState('')
    const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set())
    const [error, setError] = useState('')
    const titleId = useId()

    // Reset state when closing
    useEffect(() => {
        if (!isOpen) {
            setMode('list')
            setEditingPalette(null)
            setName('')
            setSelectedColors(new Set())
            setError('')
        }
    }, [isOpen])

    // Initialize form for editing
    useEffect(() => {
        if (editingPalette) {
            setName(editingPalette.name)
            setSelectedColors(new Set(editingPalette.colors.map((c) => c.id)))
        }
    }, [editingPalette])

    const handleToggleColor = (colorId: string) => {
        setSelectedColors((prev) => {
            const next = new Set(prev)
            if (next.has(colorId)) {
                next.delete(colorId)
            } else {
                next.add(colorId)
            }
            return next
        })
        setError('')
    }

    const handleSave = () => {
        // Validate
        if (!name.trim()) {
            setError('Please enter a palette name')
            return
        }
        if (selectedColors.size === 0) {
            setError('Please select at least one color')
            return
        }

        const colors: PaletteColor[] = ALL_PALETTE_COLORS.filter((c) => selectedColors.has(c.id))

        if (mode === 'edit' && editingPalette) {
            onUpdatePalette({
                ...editingPalette,
                name: name.trim(),
                colors,
            })
        } else {
            onCreatePalette({
                id: generatePaletteId(),
                name: name.trim(),
                colors,
                isActive: false,
                isDefault: false,
                createdAt: Date.now(),
            })
        }

        setMode('list')
        setEditingPalette(null)
        setName('')
        setSelectedColors(new Set())
        setError('')
    }

    const handleEdit = (palette: Palette) => {
        setEditingPalette(palette)
        setMode('edit')
    }

    const handleDelete = (palette: Palette) => {
        if (palette.isDefault) return
        if (confirm(`Delete "${palette.name}"? This cannot be undone.`)) {
            onDeletePalette(palette.id)
        }
    }

    const startCreate = () => {
        setMode('create')
        setName('')
        setSelectedColors(new Set())
        setError('')
    }

    return (
        <OverlaySurface
            isOpen={isOpen}
            onClose={onClose}
            preset="dialog"
            ariaLabelledBy={titleId}
            rootClassName="fixed inset-0 z-50 flex items-center justify-center p-4"
            backdropClassName="absolute inset-0 bg-black/60 backdrop-blur-sm"
            panelClassName="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-2xl outline-none"
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-700 p-4">
                <div className="flex items-center gap-3">
                    {mode !== 'list' && (
                        <button
                            type="button"
                            onClick={() => {
                                setMode('list')
                                setEditingPalette(null)
                                setError('')
                            }}
                            className="rounded p-1 transition-colors hover:bg-gray-700"
                            aria-label="Back to palette list"
                        >
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}
                    <h2 id={titleId} className="text-lg font-bold text-gray-100">
                        {mode === 'list' && 'Manage Palettes'}
                        {mode === 'create' && 'Create Palette'}
                        {mode === 'edit' && 'Edit Palette'}
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 transition-colors hover:bg-gray-700"
                    aria-label="Close modal"
                >
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {mode === 'list' ? (
                    <div className="space-y-3">
                        {palettes.map((palette) => (
                            <div
                                key={palette.id}
                                className={`rounded-lg border p-3 ${
                                    palette.isActive
                                        ? 'border-blue-700 bg-blue-900/20'
                                        : 'border-gray-700 bg-gray-800/50'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-1">
                                            {palette.colors.map((color) => (
                                                <div
                                                    key={color.id}
                                                    className="h-5 w-5 rounded border border-gray-600"
                                                    style={{ backgroundColor: getColorHex(color.id) }}
                                                    title={color.displayName}
                                                />
                                            ))}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
                                                {palette.name}
                                                {palette.isActive && (
                                                    <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] text-blue-100">
                                                        Active
                                                    </span>
                                                )}
                                                {palette.isDefault && (
                                                    <span className="rounded bg-gray-600 px-1.5 py-0.5 text-[10px] text-gray-300">
                                                        Default
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {palette.colors.length} color{palette.colors.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleEdit(palette)}
                                            className="rounded p-2 transition-colors hover:bg-gray-700"
                                            aria-label={`Edit ${palette.name}`}
                                        >
                                            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        {!palette.isDefault && (
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(palette)}
                                                className="rounded p-2 transition-colors hover:bg-red-900/50"
                                                aria-label={`Delete ${palette.name}`}
                                            >
                                                <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={startCreate}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-700 p-4 text-gray-400 transition-colors hover:border-gray-600 hover:bg-gray-800/30 hover:text-gray-300"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="font-medium">Create New Palette</span>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-300">
                                Palette Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value)
                                    setError('')
                                }}
                                placeholder="e.g., Zorn Palette"
                                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-300">
                                Select Colors ({selectedColors.size} selected)
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {ALL_PALETTE_COLORS.map((color) => {
                                    const isSelected = selectedColors.has(color.id)
                                    return (
                                        <button
                                            type="button"
                                            key={color.id}
                                            onClick={() => handleToggleColor(color.id)}
                                            className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                                                isSelected
                                                    ? 'border-blue-600 bg-blue-900/30 ring-1 ring-blue-500'
                                                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                                            }`}
                                            aria-label={`Select color: ${color.displayName}`}
                                            aria-pressed={isSelected}
                                        >
                                            <div
                                                className={`flex h-8 w-8 items-center justify-center rounded-lg border-2 ${
                                                    isSelected ? 'border-blue-400' : 'border-gray-600'
                                                }`}
                                                style={{ backgroundColor: getColorHex(color.id) }}
                                            >
                                                <span
                                                    className="text-[8px] font-black uppercase tracking-tighter"
                                                    style={{ color: getBestContrast(getColorHex(color.id)) }}
                                                >
                                                    {getContrastRatio(getColorHex(color.id), getBestContrast(getColorHex(color.id))).toFixed(1)}
                                                </span>
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className="text-sm font-medium text-gray-200">
                                                    {color.displayName}
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-300">
                                {error}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {mode !== 'list' && (
                <div className="flex justify-end gap-3 border-t border-gray-700 p-4">
                    <button
                        type="button"
                        onClick={() => {
                            setMode('list')
                            setEditingPalette(null)
                            setError('')
                        }}
                        className="px-4 py-2 text-sm text-gray-400 transition-colors hover:text-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
                    >
                        {mode === 'edit' ? 'Save Changes' : 'Create Palette'}
                    </button>
                </div>
            )}
        </OverlaySurface>
    )
}

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
