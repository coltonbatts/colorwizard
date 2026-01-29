'use client'

/**
 * PaletteTab - The "Palette" tab content
 * Brand selection, tube selection, and working palette management
 */

import { useState, useEffect } from 'react'
import { BrandSelector } from '../BrandSelector'
import { TubeSelector } from '../TubeSelector'
import ProcreateExportButton from '../ProcreateExportButton'
import type { ProcreateColor } from '@/lib/types/procreate'
import { getPaint } from '@/lib/paint/catalog'

interface PaletteTabProps {
    onPaletteChange?: (brandId: string, lineId: string, paintIds: string[]) => void
}

const TAB_STORAGE_KEY = 'colorwizard-palette-tab-state'

export default function PaletteTab({ onPaletteChange }: PaletteTabProps) {
    // Load state from localStorage on mount
    const [selectedBrandId, setSelectedBrandId] = useState<string | undefined>(() => {
        if (typeof window === 'undefined') return undefined
        try {
            const saved = localStorage.getItem(TAB_STORAGE_KEY)
            return saved ? JSON.parse(saved).brandId : undefined
        } catch { return undefined }
    })
    const [selectedLineId, setSelectedLineId] = useState<string | undefined>(() => {
        if (typeof window === 'undefined') return undefined
        try {
            const saved = localStorage.getItem(TAB_STORAGE_KEY)
            return saved ? JSON.parse(saved).lineId : undefined
        } catch { return undefined }
    })
    const [selectedPaintIds, setSelectedPaintIds] = useState<string[]>(() => {
        if (typeof window === 'undefined') return []
        try {
            const saved = localStorage.getItem(TAB_STORAGE_KEY)
            return saved ? JSON.parse(saved).paintIds || [] : []
        } catch { return [] }
    })

    // Save to localStorage when selection changes
    useEffect(() => {
        try {
            localStorage.setItem(TAB_STORAGE_KEY, JSON.stringify({
                brandId: selectedBrandId,
                lineId: selectedLineId,
                paintIds: selectedPaintIds
            }))
        } catch (e) {
            console.error('Failed to save palette tab state', e)
        }
    }, [selectedBrandId, selectedLineId, selectedPaintIds])

    useEffect(() => {
        if (selectedBrandId && selectedLineId && onPaletteChange) {
            onPaletteChange(selectedBrandId, selectedLineId, selectedPaintIds)
        }
    }, [selectedBrandId, selectedLineId, selectedPaintIds, onPaletteChange])

    return (
        <div className="bg-white text-studio font-sans min-h-full p-4 lg:p-6 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-lg font-bold text-studio mb-1">Your Palette</h2>
                <p className="text-sm text-studio-muted">Select your paint brand and tubes</p>
            </div>

            {/* Brand & Line Selection */}
            <section className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <h3 className="text-[10px] font-black text-studio-dim uppercase tracking-widest mb-3">Paint Brand</h3>
                <BrandSelector
                    selectedBrandId={selectedBrandId}
                    selectedLineId={selectedLineId}
                    onBrandChange={(brandId, lineId) => {
                        setSelectedBrandId(brandId)
                        if (lineId) setSelectedLineId(lineId)
                        // Reset paint selection when brand changes
                        setSelectedPaintIds([])
                    }}
                    onLineChange={setSelectedLineId}
                    className="text-studio"
                />
            </section>

            {/* Tube Selection */}
            <section className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <h3 className="text-[10px] font-black text-studio-dim uppercase tracking-widest mb-3">
                    Your Tubes
                    {selectedPaintIds.length > 0 && (
                        <span className="ml-2 text-blue-600">({selectedPaintIds.length} selected)</span>
                    )}
                </h3>
                <TubeSelector
                    brandId={selectedBrandId}
                    lineId={selectedLineId}
                    selectedPaintIds={selectedPaintIds}
                    onSelectionChange={setSelectedPaintIds}
                    maxSelection={0} // Unlimited
                    className="max-h-[400px] overflow-y-auto"
                />
            </section>

            {/* Quick Actions */}
            <div className="flex flex-col gap-2">
                {/* Procreate Export */}
                {selectedPaintIds.length > 0 && (
                    <ProcreateExportButton
                        colors={selectedPaintIds.map((paintId): ProcreateColor => {
                            // Paint IDs are in format: brandId/lineId/slug
                            // We'll use a simplified approach - just extract the name from the ID
                            const parts = paintId.split('/');
                            const slug = parts[parts.length - 1];
                            const name = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                            // Note: We'd need to fetch actual hex values from catalog
                            // For now, using a placeholder - this will be enhanced
                            return {
                                hex: '#888888', // TODO: Fetch from catalog
                                name,
                            };
                        })}
                        paletteName={selectedBrandId ? `${selectedBrandId} Palette` : 'My Palette'}
                        variant="primary"
                        className="w-full"
                    />
                )}

                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setSelectedBrandId(undefined)
                            setSelectedLineId(undefined)
                            setSelectedPaintIds([])
                        }}
                        disabled={!selectedBrandId && !selectedLineId && selectedPaintIds.length === 0}
                        className="flex-1 px-4 py-2 rounded-xl text-sm font-bold border border-gray-200 text-studio-dim hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Clear Selection
                    </button>
                    <button
                        onClick={() => {
                            const data = JSON.stringify({ brandId: selectedBrandId, lineId: selectedLineId, paintIds: selectedPaintIds })
                            navigator.clipboard.writeText(data)
                            alert('Palette copied to clipboard!')
                        }}
                        disabled={selectedPaintIds.length === 0}
                        className="flex-1 px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Copy JSON
                    </button>
                </div>
            </div>

            {/* Tips */}
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-2">Pro Tip</h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                    Select the tubes you actually own. Color recipes will be optimized for your available paints.
                </p>
            </div>
        </div>
    )
}
