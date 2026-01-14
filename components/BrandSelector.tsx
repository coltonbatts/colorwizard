'use client';

import { useState, useEffect } from 'react';
import { getBrands, getLines } from '@/lib/paint/catalog';
import type { PaintBrand, PaintLine } from '@/lib/paint/types/Paint';

interface BrandSelectorProps {
    /** Currently selected brand ID */
    selectedBrandId?: string;
    /** Currently selected line ID */
    selectedLineId?: string;
    /** Callback when brand changes */
    onBrandChange: (brandId: string, lineId?: string) => void;
    /** Callback when line changes */
    onLineChange: (lineId: string) => void;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Brand and line selector dropdowns for paint catalog.
 */
export function BrandSelector({
    selectedBrandId,
    selectedLineId,
    onBrandChange,
    onLineChange,
    className = '',
}: BrandSelectorProps) {
    const [brands, setBrands] = useState<PaintBrand[]>([]);
    const [lines, setLines] = useState<PaintLine[]>([]);
    const [loading, setLoading] = useState(true);

    // Load brands on mount
    useEffect(() => {
        async function loadBrands() {
            try {
                const loadedBrands = await getBrands();
                setBrands(loadedBrands);

                // Auto-select first brand if none selected
                if (!selectedBrandId && loadedBrands.length > 0) {
                    const firstBrand = loadedBrands[0];
                    const firstLine = firstBrand.lines[0];
                    onBrandChange(firstBrand.id, firstLine?.id);
                }
            } catch (error) {
                console.error('Failed to load brands:', error);
            } finally {
                setLoading(false);
            }
        }
        loadBrands();
    }, []);

    // Load lines when brand changes
    useEffect(() => {
        async function loadLines() {
            if (!selectedBrandId) {
                setLines([]);
                return;
            }

            try {
                const loadedLines = await getLines(selectedBrandId);
                setLines(loadedLines);

                // Auto-select first line if none selected or current not in new brand
                if (loadedLines.length > 0) {
                    if (!selectedLineId || !loadedLines.find(l => l.id === selectedLineId)) {
                        onLineChange(loadedLines[0].id);
                    }
                }
            } catch (error) {
                console.error('Failed to load lines:', error);
            }
        }
        loadLines();
    }, [selectedBrandId]);

    if (loading) {
        return (
            <div className={`flex gap-2 ${className}`}>
                <div className="animate-pulse bg-white/5 rounded h-9 w-40" />
                <div className="animate-pulse bg-white/5 rounded h-9 w-32" />
            </div>
        );
    }

    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            {/* Brand Selector */}
            <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 uppercase tracking-wide">Brand</label>
                <select
                    value={selectedBrandId || ''}
                    onChange={(e) => {
                        const newBrandId = e.target.value;
                        onBrandChange(newBrandId);
                    }}
                    className="bg-black/30 border border-white/10 rounded px-3 py-1.5 text-sm
                     text-white focus:border-blue-500 focus:outline-none cursor-pointer
                     hover:border-white/20 transition-colors"
                >
                    {brands.map(brand => (
                        <option key={brand.id} value={brand.id}>
                            {brand.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Line Selector */}
            {lines.length > 1 && (
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Line</label>
                    <select
                        value={selectedLineId || ''}
                        onChange={(e) => onLineChange(e.target.value)}
                        className="bg-black/30 border border-white/10 rounded px-3 py-1.5 text-sm
                       text-white focus:border-blue-500 focus:outline-none cursor-pointer
                       hover:border-white/20 transition-colors"
                    >
                        {lines.map(line => (
                            <option key={line.id} value={line.id}>
                                {line.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Show line info if only one line */}
            {lines.length === 1 && (
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400 uppercase tracking-wide">Line</label>
                    <div className="text-sm text-gray-300 py-1.5">
                        {lines[0].name}
                        <span className="text-xs text-gray-500 ml-2">
                            ({lines[0].quality})
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
