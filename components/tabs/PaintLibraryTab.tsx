'use client'

/**
 * Paint Library Tab
 * 
 * Searchable catalog of paint colors with filtering by brand, line, medium, and more.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { getPaints, getBrands } from '@/lib/paint/catalog'
import type { Paint, PaintBrand, Opacity, Permanence, Medium } from '@/lib/paint/types/Paint'
import { usePaintPaletteStore } from '@/lib/store/usePaintPaletteStore'
import PaletteIndicator from '../paint/PaletteIndicator'
import PaletteSwitcher from '../paint/PaletteSwitcher'
import SavePaletteModal from '../paint/SavePaletteModal'

// ============================================================================
// Types
// ============================================================================

interface FilterState {
    query: string
    brandId: string | null
    lineId: string | null
    medium: Medium | null
    opacity: Opacity | null
    minPermanence: Permanence | null
    showOnlySelected: boolean
}

const DEFAULT_FILTERS: FilterState = {
    query: '',
    brandId: null,
    lineId: null,
    medium: null,
    opacity: null,
    minPermanence: null,
    showOnlySelected: false
}

// ============================================================================
// Components
// ============================================================================

interface PaintCardProps {
    paint: Paint
    onSelect: (paint: Paint) => void
    isSelected: boolean
    isInPalette: boolean
    onTogglePalette: () => void
}

function PaintCard({ paint, onSelect, isSelected, isInPalette, onTogglePalette }: PaintCardProps) {
    return (
        <button
            type="button"
            onClick={() => {
                // Toggle palette selection
                onTogglePalette()
                onSelect(paint)
            }}
            className={`
                group flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-[background-color,border-color,box-shadow]
                ${isInPalette
                    ? 'border-ink-muted bg-paper-recessed shadow-sm ring-1 ring-ink'
                    : isSelected
                        ? 'border-linen-strong bg-paper-recessed'
                        : 'border-transparent bg-paper-elevated hover:border-ink-hairline hover:shadow-sm'}
            `}
            aria-pressed={isInPalette}
        >
            {/* Color Swatch */}
            <div className="relative">
                <div
                    className={`h-10 w-10 flex-shrink-0 rounded-md border shadow-inner transition-[border-color,box-shadow] ${isInPalette ? 'border-ink ring-2 ring-ink' : 'border-black/10'}`}
                    style={{ backgroundColor: paint.hex }}
                />
                {/* Selection checkmark */}
                {isInPalette && (
                    <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-sm bg-ink">
                        <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <path d="M20 6L9 17l-5-5" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold truncate ${isInPalette ? 'text-ink' : 'text-ink'}`}>
                    {paint.name}
                </div>
                <div className="text-xs text-ink-muted truncate">
                    {paint.pigmentCodes.join(' + ')}
                </div>
            </div>

            {/* Opacity Indicator */}
            <div className="flex-shrink-0">
                <OpacityIcon opacity={paint.opacity} />
            </div>
        </button>
    )
}

function OpacityIcon({ opacity }: { opacity: Opacity }) {
    const labels: Record<Opacity, string> = {
        'transparent': 'T',
        'semi-transparent': 'ST',
        'semi-opaque': 'SO',
        'opaque': 'O'
    }
    const colors: Record<Opacity, string> = {
        'transparent': 'bg-subsignal-muted text-subsignal',
        'semi-transparent': 'bg-subsignal-muted text-subsignal',
        'semi-opaque': 'bg-signal-muted text-signal',
        'opaque': 'bg-signal-muted text-signal'
    }
    return (
        <span className={`rounded-sm px-1.5 py-0.5 text-xs font-semibold ${colors[opacity]}`} title={opacity.replace('-', ' ')}>
            {labels[opacity]}
        </span>
    )
}

interface PaintDetailProps {
    paint: Paint
    brands: PaintBrand[]
    onClose: () => void
    onHighlight: (rgb: { r: number; g: number; b: number }) => void
}

function PaintDetail({ paint, brands, onClose, onHighlight }: PaintDetailProps) {
    const brand = brands.find(b => b.id === paint.brandId)
    const line = brand?.lines.find(l => l.id === paint.lineId)

    // Convert hex to RGB
    const rgb = useMemo(() => {
        const hex = paint.hex.replace('#', '')
        return {
            r: parseInt(hex.substring(0, 2), 16),
            g: parseInt(hex.substring(2, 4), 16),
            b: parseInt(hex.substring(4, 6), 16)
        }
    }, [paint.hex])

    return (
        <div className="rounded-lg border border-ink-hairline bg-paper-elevated p-4 shadow-md">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div
                        className="w-14 h-14 rounded-xl shadow-lg border border-black/10"
                        style={{ backgroundColor: paint.hex }}
                    />
                    <div>
                        <h3 className="text-lg font-bold text-ink">{paint.name}</h3>
                        <p className="text-sm text-ink-muted">
                            {brand?.name} {line?.name && `· ${line.name}`}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-paper-recessed transition-colors"
                    aria-label="Close paint details"
                >
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-paper-recessed rounded-lg p-2">
                    <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Hex</div>
                    <div className="text-sm font-mono text-ink">{paint.hex}</div>
                </div>
                <div className="bg-paper-recessed rounded-lg p-2">
                    <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider">RGB</div>
                    <div className="text-sm font-mono text-ink">{rgb.r}, {rgb.g}, {rgb.b}</div>
                </div>
                <div className="bg-paper-recessed rounded-lg p-2">
                    <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Pigments</div>
                    <div className="text-sm font-mono text-ink">{paint.pigmentCodes.join(', ')}</div>
                </div>
                <div className="bg-paper-recessed rounded-lg p-2">
                    <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Series</div>
                    <div className="text-sm text-ink">Series {paint.series}</div>
                </div>
                <div className="bg-paper-recessed rounded-lg p-2">
                    <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Opacity</div>
                    <div className="text-sm text-ink capitalize">{paint.opacity.replace('-', ' ')}</div>
                </div>
                <div className="bg-paper-recessed rounded-lg p-2">
                    <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Permanence</div>
                    <div className="text-sm text-ink capitalize">{paint.permanence.replace('-', ' ')}</div>
                </div>
            </div>

            {/* Notes */}
            {paint.notes && (
                <div className="mb-4 rounded-lg border border-subsignal bg-subsignal-muted p-3">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-subsignal">Notes</div>
                    <p className="text-sm text-ink-secondary">{paint.notes}</p>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => onHighlight(rgb)}
                    className="min-h-11 flex-1 rounded-md border border-subsignal bg-subsignal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-subsignal-hover"
                >
                    Highlight on Canvas
                </button>
            </div>
        </div>
    )
}

// ============================================================================
// Main Component
// ============================================================================

interface PaintLibraryTabProps {
    onColorSelect?: (rgb: { r: number; g: number; b: number }) => void
}

export default function PaintLibraryTab({ onColorSelect }: PaintLibraryTabProps) {
    const [brands, setBrands] = useState<PaintBrand[]>([])
    const [paints, setPaints] = useState<Paint[]>([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
    const [selectedPaint, setSelectedPaint] = useState<Paint | null>(null)
    const [showFilters, setShowFilters] = useState(false)

    // Palette modal states
    const [showSaveModal, setShowSaveModal] = useState(false)
    const [showSwitcher, setShowSwitcher] = useState(false)

    // Paint palette store
    const { selectedPaintIds, togglePaint, isPaintSelected } = usePaintPaletteStore()

    // Load catalog on mount
    useEffect(() => {
        async function load() {
            try {
                setLoading(true)
                const [loadedBrands, loadedPaints] = await Promise.all([
                    getBrands(),
                    getPaints()
                ])
                setBrands(loadedBrands)
                setPaints(loadedPaints)
            } catch (error) {
                console.error('Failed to load paint catalog:', error)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    // Get lines for selected brand
    const availableLines = useMemo(() => {
        if (!filters.brandId) return []
        const brand = brands.find(b => b.id === filters.brandId)
        return brand?.lines || []
    }, [brands, filters.brandId])

    // Filter paints
    const filteredPaints = useMemo(() => {
        return paints.filter(paint => {
            // Show only selected filter
            if (filters.showOnlySelected && !selectedPaintIds.includes(paint.id)) return false

            // Brand filter
            if (filters.brandId && paint.brandId !== filters.brandId) return false

            // Line filter
            if (filters.lineId && paint.lineId !== filters.lineId) return false

            // Opacity filter
            if (filters.opacity && paint.opacity !== filters.opacity) return false

            // Medium filter (if paint has medium)
            if (filters.medium && paint.medium && paint.medium !== filters.medium) return false

            // Permanence filter
            if (filters.minPermanence) {
                const order: Permanence[] = ['fugitive', 'moderately-durable', 'permanent', 'extremely-permanent']
                const minIdx = order.indexOf(filters.minPermanence)
                const paintIdx = order.indexOf(paint.permanence)
                if (paintIdx < minIdx) return false
            }

            // Text search
            if (filters.query) {
                const q = filters.query.toLowerCase()
                const nameMatch = paint.name.toLowerCase().includes(q)
                const pigmentMatch = paint.pigmentCodes.some(c => c.toLowerCase().includes(q))
                const hexMatch = paint.hex.toLowerCase().includes(q)
                if (!nameMatch && !pigmentMatch && !hexMatch) return false
            }

            return true
        })
    }, [paints, filters, selectedPaintIds])

    // Update filter
    const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
        setFilters(prev => {
            const next = { ...prev, [key]: value }
            // Reset line when brand changes
            if (key === 'brandId') {
                next.lineId = null
            }
            return next
        })
    }, [])

    // Clear all filters
    const clearFilters = useCallback(() => {
        setFilters(DEFAULT_FILTERS)
    }, [])

    // Handle highlight
    const handleHighlight = useCallback((rgb: { r: number; g: number; b: number }) => {
        onColorSelect?.(rgb)
    }, [onColorSelect])

    // Active filter count
    const activeFilterCount = useMemo(() => {
        let count = 0
        if (filters.brandId) count++
        if (filters.lineId) count++
        if (filters.medium) count++
        if (filters.opacity) count++
        if (filters.minPermanence) count++
        return count
    }, [filters])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-signal border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-ink-muted">Loading paint library…</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-paper-elevated">
            {/* Palette Indicator */}
            <div className="relative">
                <PaletteIndicator
                    onSave={() => setShowSaveModal(true)}
                    onSwitchClick={() => setShowSwitcher(!showSwitcher)}
                />
                <PaletteSwitcher
                    isOpen={showSwitcher}
                    onClose={() => setShowSwitcher(false)}
                    onNewPalette={() => setShowSaveModal(true)}
                />
            </div>

            {/* View Toggle */}
            <div className="flex border-b border-ink-hairline">
                <button
                    type="button"
                    onClick={() => updateFilter('showOnlySelected', false)}
                    className={`flex-1 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${!filters.showOnlySelected ? 'text-signal border-b-2 border-signal' : 'text-ink-muted hover:text-ink-secondary'}`}
                >
                    All Paints ({paints.length})
                </button>
                <button
                    type="button"
                    onClick={() => updateFilter('showOnlySelected', true)}
                    className={`flex-1 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${filters.showOnlySelected ? 'text-signal border-b-2 border-signal' : 'text-ink-muted hover:text-ink-secondary'}`}
                >
                    My Palette ({selectedPaintIds.length})
                </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-ink-hairline bg-paper-recessed">
                <div className="relative">
                    <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        id="paint-library-search"
                        name="paint-library-search"
                        type="text"
                        autoComplete="off"
                        value={filters.query}
                        onChange={(e) => updateFilter('query', e.target.value)}
                        placeholder="Search by name, pigment code, or hex…"
                        aria-label="Search paint library"
                        className="w-full rounded-md border border-ink-hairline bg-paper-elevated py-2.5 pl-10 pr-4 text-sm transition-[border-color,box-shadow] focus:border-ink-muted"
                    />
                </div>

                {/* Filter Toggle */}
                <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`mt-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors ${showFilters || activeFilterCount > 0 ? 'text-signal' : 'text-ink-muted hover:text-ink-secondary'
                        }`}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                    <svg
                        aria-hidden="true"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ transform: showFilters ? 'rotate(180deg)' : 'none' }}
                        className="transition-transform"
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </button>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="mt-3 space-y-3 rounded-lg border border-ink-hairline bg-paper-elevated p-3">
                        {/* Brand */}
                        <div>
                            <label htmlFor="paint-brand-filter" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-muted">Brand</label>
                            <select
                                id="paint-brand-filter"
                                name="paint-brand-filter"
                                value={filters.brandId || ''}
                                onChange={(e) => updateFilter('brandId', e.target.value || null)}
                                className="w-full rounded-md border border-ink-hairline bg-paper-elevated px-3 py-2 text-sm"
                            >
                                <option value="">All Brands</option>
                                {brands.map(brand => (
                                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Line (only if brand selected) */}
                        {filters.brandId && availableLines.length > 0 && (
                            <div>
                                <label htmlFor="paint-line-filter" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-muted">Product line</label>
                                <select
                                    id="paint-line-filter"
                                    name="paint-line-filter"
                                    value={filters.lineId || ''}
                                    onChange={(e) => updateFilter('lineId', e.target.value || null)}
                                    className="w-full rounded-md border border-ink-hairline bg-paper-elevated px-3 py-2 text-sm"
                                >
                                    <option value="">All Lines</option>
                                    {availableLines.map(line => (
                                        <option key={line.id} value={line.id}>{line.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Opacity */}
                        <div>
                            <label htmlFor="paint-opacity-filter" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-muted">Opacity</label>
                            <select
                                id="paint-opacity-filter"
                                name="paint-opacity-filter"
                                value={filters.opacity || ''}
                                onChange={(e) => updateFilter('opacity', (e.target.value || null) as Opacity | null)}
                                className="w-full rounded-md border border-ink-hairline bg-paper-elevated px-3 py-2 text-sm"
                            >
                                <option value="">Any Opacity</option>
                                <option value="transparent">Transparent</option>
                                <option value="semi-transparent">Semi-Transparent</option>
                                <option value="semi-opaque">Semi-Opaque</option>
                                <option value="opaque">Opaque</option>
                            </select>
                        </div>

                        {/* Permanence */}
                        <div>
                            <label htmlFor="paint-permanence-filter" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-muted">Min. permanence</label>
                            <select
                                id="paint-permanence-filter"
                                name="paint-permanence-filter"
                                value={filters.minPermanence || ''}
                                onChange={(e) => updateFilter('minPermanence', (e.target.value || null) as Permanence | null)}
                                className="w-full rounded-md border border-ink-hairline bg-paper-elevated px-3 py-2 text-sm"
                            >
                                <option value="">Any Permanence</option>
                                <option value="moderately-durable">Moderately Durable+</option>
                                <option value="permanent">Permanent+</option>
                                <option value="extremely-permanent">Extremely Permanent</option>
                            </select>
                        </div>

                        {/* Clear Button */}
                        {activeFilterCount > 0 && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="w-full py-2 text-xs font-bold text-signal hover:bg-signal-muted rounded-lg transition-colors"
                            >
                                Clear All Filters
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Results Count */}
            <div className="px-4 py-2 border-b border-ink-hairline">
                <span className="text-xs text-ink-muted">
                    {filteredPaints.length} paint{filteredPaints.length !== 1 ? 's' : ''} found
                </span>
            </div>

            {/* Paint List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredPaints.length === 0 ? (
                    <div className="text-center py-12">
                        <div aria-hidden="true" className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md border border-ink-hairline bg-paper-recessed text-ink-muted">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a9 9 0 1 0 0 18h1.5a1.5 1.5 0 0 0 0-3H12a1.5 1.5 0 0 1 0-3h2a7 7 0 0 0 0-14h-2Z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="9.5" cy="7.5" r="1"/><circle cx="13" cy="6.5" r="1"/></svg>
                        </div>
                        <p className="text-sm text-ink-muted">No paints match your filters</p>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="mt-2 text-sm text-signal hover:underline"
                        >
                            Clear filters
                        </button>
                    </div>
                ) : (
                    filteredPaints.map(paint => (
                        <PaintCard
                            key={paint.id}
                            paint={paint}
                            onSelect={setSelectedPaint}
                            isSelected={selectedPaint?.id === paint.id}
                            isInPalette={isPaintSelected(paint.id)}
                            onTogglePalette={() => togglePaint(paint.id)}
                        />
                    ))
                )}
            </div>

            {/* Selected Paint Detail */}
            {selectedPaint && (
                <div className="border-t border-ink-hairline p-4 bg-paper-recessed">
                    <PaintDetail
                        paint={selectedPaint}
                        brands={brands}
                        onClose={() => setSelectedPaint(null)}
                        onHighlight={handleHighlight}
                    />
                </div>
            )}

            {/* Save Palette Modal */}
            <SavePaletteModal
                isOpen={showSaveModal}
                onClose={() => setShowSaveModal(false)}
            />
        </div>
    )
}
