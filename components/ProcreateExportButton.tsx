'use client';

import { useState } from 'react';
import { useExportToProcreate } from '@/hooks/useExportToProcreate';
import type { ProcreateColor } from '@/lib/types/procreate';
import UpgradeModal from '@/components/UpgradeModal';

export interface ProcreateExportButtonProps {
    /** Colors to export */
    colors: ProcreateColor[];
    /** Optional palette name (defaults to "ColorWizard Palette") */
    paletteName?: string;
    /** Button variant */
    variant?: 'primary' | 'secondary' | 'minimal';
    /** Additional CSS classes */
    className?: string;
    /** Callback when export succeeds */
    onExportSuccess?: () => void;
    /** Callback when export fails */
    onExportError?: (error: string) => void;
}

/**
 * Procreate export button with Pro tier gating
 */
export default function ProcreateExportButton({
    colors,
    paletteName,
    variant = 'primary',
    className = '',
    onExportSuccess,
    onExportError,
}: ProcreateExportButtonProps) {
    const { exportToProcreate, isPro, maxColors, isExporting } = useExportToProcreate();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const handleExport = async () => {
        try {
            // Check tier limits before export
            if (!isPro && colors.length > maxColors) {
                setShowUpgradeModal(true);
                return;
            }

            await exportToProcreate(colors, paletteName);
            onExportSuccess?.();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Export failed';
            onExportError?.(errorMessage);
        }
    };

    // Button styles based on variant
    const variantStyles = {
        primary: 'bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg hover:shadow-xl',
        secondary: 'bg-gray-900 hover:bg-gray-800 text-white font-bold',
        minimal: 'bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold border border-gray-300',
    };

    const baseStyles = 'flex items-center justify-center gap-2 rounded-xl px-4 py-3 transition-colors disabled:cursor-not-allowed disabled:opacity-50';

    return (
        <>
            <button
                type="button"
                onClick={handleExport}
                disabled={isExporting || colors.length === 0}
                className={`${baseStyles} ${variantStyles[variant]} ${className}`}
                title={`Export to Procreate (${colors.length}/${maxColors} colors)`}
            >
                {isExporting ? (
                    <>
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Exporting…</span>
                    </>
                ) : (
                    <>
                        <svg
                            aria-hidden="true"
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12 3v10" />
                            <path d="m8 7 4-4 4 4" />
                            <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
                        </svg>
                        <span>Export to Procreate</span>
                    </>
                )}
            </button>

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                featureName="Procreate Export"
                currentCount={colors.length}
                limit={maxColors}
            />
        </>
    );
}
