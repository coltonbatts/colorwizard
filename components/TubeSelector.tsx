'use client';

import { useState, useEffect, useMemo } from 'react';
import { getPaints } from '@/lib/paint/catalog';
import type { Paint } from '@/lib/paint/types/Paint';

interface TubeSelectorProps {
    /** Brand ID to filter paints */
    brandId?: string;
    /** Line ID to filter paints */
    lineId?: string;
    /** Currently selected paint IDs */
    selectedPaintIds: string[];
    /** Callback when selection changes */
    onSelectionChange: (paintIds: string[]) => void;
    /** Maximum number of paints to select (0 = unlimited) */
    maxSelection?: number;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Multi-select tube/paint selector with search and filter.
 */
export function TubeSelector({
    brandId,
    lineId,
    selectedPaintIds,
    onSelectionChange,
    maxSelection = 0,
    className = '',
}: TubeSelectorProps) {
    const [paints, setPaints] = useState<Paint[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);

    // Load paints when brand/line changes
    useEffect(() => {
        async function loadPaints() {
            setLoading(true);
            try {
                const loadedPaints = await getPaints({ brandId, lineId });
                setPaints(loadedPaints);
            } catch (error) {
                console.error('Failed to load paints:', error);
                setPaints([]);
            } finally {
                setLoading(false);
            }
        }
        loadPaints();
    }, [brandId, lineId]);

    // Filter paints by search query
    const filteredPaints = useMemo(() => {
        if (!searchQuery.trim()) return paints;

        const query = searchQuery.toLowerCase();
        return paints.filter(paint =>
            paint.name.toLowerCase().includes(query) ||
            paint.pigmentCodes.some(code => code.toLowerCase().includes(query))
        );
    }, [paints, searchQuery]);

    // Paints to display (limit to 12 unless showAll)
    const displayedPaints = showAll ? filteredPaints : filteredPaints.slice(0, 12);
    const hasMore = filteredPaints.length > 12;

    // Toggle paint selection
    const togglePaint = (paintId: string) => {
        if (selectedPaintIds.includes(paintId)) {
            onSelectionChange(selectedPaintIds.filter(id => id !== paintId));
        } else {
            if (maxSelection > 0 && selectedPaintIds.length >= maxSelection) {
                // Replace oldest selection
                onSelectionChange([...selectedPaintIds.slice(1), paintId]);
            } else {
                onSelectionChange([...selectedPaintIds, paintId]);
            }
        }
    };

    // Select all / deselect all
    const selectAll = () => {
        const allIds = filteredPaints.map(p => p.id);
        if (maxSelection > 0) {
            onSelectionChange(allIds.slice(0, maxSelection));
        } else {
            onSelectionChange(allIds);
        }
    };

    const deselectAll = () => {
        onSelectionChange([]);
    };

    // Get opacity badge color
    const getOpacityColor = (opacity: Paint['opacity']) => {
        switch (opacity) {
            case 'opaque': return 'bg-white/90 text-black';
            case 'semi-opaque': return 'bg-white/60 text-black';
            case 'semi-transparent': return 'bg-white/30 text-white';
            case 'transparent': return 'bg-transparent border border-white/30 text-white';
        }
    };

    if (loading) {
        return (
            <div className={`space-y-3 ${className}`}>
                <div className="animate-pulse bg-white/5 rounded h-9 w-full" />
                <div className="grid grid-cols-2 gap-2">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="animate-pulse bg-white/5 rounded h-12" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Search and actions */}
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Search paints or pigment codes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-black/30 border border-white/10 rounded px-3 py-1.5 text-sm
                     text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
                <button
                    onClick={selectedPaintIds.length > 0 ? deselectAll : selectAll}
                    className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded
                     text-gray-300 transition-colors whitespace-nowrap"
                >
                    {selectedPaintIds.length > 0 ? 'Clear' : 'All'}
                </button>
            </div>

            {/* Selection count */}
            <div className="text-xs text-gray-400">
                {selectedPaintIds.length} of {paints.length} paints selected
                {maxSelection > 0 && ` (max ${maxSelection})`}
            </div>

            {/* Paint grid */}
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {displayedPaints.map(paint => {
                    const isSelected = selectedPaintIds.includes(paint.id);
                    return (
                        <button
                            key={paint.id}
                            onClick={() => togglePaint(paint.id)}
                            className={`flex items-center gap-2 p-2 rounded text-left transition-all
                         ${isSelected
                                    ? 'bg-blue-500/20 border-blue-500/50 ring-1 ring-blue-500/30'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'}
                         border`}
                        >
                            {/* Color swatch */}
                            <div
                                className="w-6 h-6 rounded flex-shrink-0 border border-white/20"
                                style={{ backgroundColor: paint.hex }}
                            />

                            {/* Paint info */}
                            <div className="min-w-0 flex-1">
                                <div className="text-xs text-white truncate font-medium">
                                    {paint.name}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span className={`text-[10px] px-1 rounded ${getOpacityColor(paint.opacity)}`}>
                                        {paint.opacity.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="text-[10px] text-gray-500 truncate">
                                        {paint.pigmentCodes.join(', ')}
                                    </span>
                                </div>
                            </div>

                            {/* Selection indicator */}
                            {isSelected && (
                                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Show more button */}
            {hasMore && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="w-full py-2 text-xs text-gray-400 hover:text-white transition-colors"
                >
                    {showAll ? 'Show less' : `Show all ${filteredPaints.length} paints`}
                </button>
            )}

            {/* Empty state */}
            {filteredPaints.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                    {searchQuery ? 'No paints match your search' : 'No paints available'}
                </div>
            )}
        </div>
    );
}
