/**
 * React hook for Procreate palette export
 * Handles Pro tier gating, loading states, and error handling
 */

'use client';

import { useState, useCallback } from 'react';
import { useUserTier } from '@/lib/hooks/useUserTier';
import { exportToProcreate } from '@/lib/procreateExport';
import type { ProcreateColor, ProcreateExportOptions } from '@/lib/types/procreate';

/**
 * Free tier color limit
 */
const FREE_TIER_COLOR_LIMIT = 5;

/**
 * Pro tier color limit (Procreate max)
 */
const PRO_TIER_COLOR_LIMIT = 30;

export interface UseExportToProcreateResult {
    /** Export function */
    exportToProcreate: (colors: ProcreateColor[], paletteName?: string) => Promise<void>;
    /** Whether user is Pro tier */
    isPro: boolean;
    /** Maximum colors allowed for current tier */
    maxColors: number;
    /** Whether export is in progress */
    isExporting: boolean;
    /** Error message if export failed */
    error: string | null;
    /** Clear error message */
    clearError: () => void;
}

/**
 * Hook for Procreate palette export with Pro tier gating
 */
export function useExportToProcreate(): UseExportToProcreateResult {
    const { isPro } = useUserTier();
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const maxColors = isPro ? PRO_TIER_COLOR_LIMIT : FREE_TIER_COLOR_LIMIT;

    const handleExport = useCallback(
        async (colors: ProcreateColor[], paletteName?: string) => {
            setIsExporting(true);
            setError(null);

            try {
                // Validate color count
                if (colors.length === 0) {
                    throw new Error('No colors to export');
                }

                // Enforce tier limits
                if (!isPro && colors.length > FREE_TIER_COLOR_LIMIT) {
                    throw new Error(
                        `Free tier limited to ${FREE_TIER_COLOR_LIMIT} colors. Upgrade to Pro for unlimited exports!`
                    );
                }

                // Prepare export options
                const options: ProcreateExportOptions = {
                    paletteName,
                    sortByValue: isPro, // Pro feature: sort by brightness
                    maxColors,
                };

                // Execute export
                await exportToProcreate(colors, options);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to export palette';
                setError(errorMessage);
                console.error('Procreate export error:', err);
                throw err; // Re-throw for component error handling
            } finally {
                setIsExporting(false);
            }
        },
        [isPro, maxColors]
    );

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        exportToProcreate: handleExport,
        isPro,
        maxColors,
        isExporting,
        error,
        clearError,
    };
}
