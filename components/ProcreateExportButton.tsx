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

    const baseStyles = 'px-4 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';

    return (
        <>
            <button
                onClick={handleExport}
                disabled={isExporting || colors.length === 0}
                className={`${baseStyles} ${variantStyles[variant]} ${className}`}
                title={`Export to Procreate (${colors.length}/${maxColors} colors)`}
            >
                {isExporting ? (
                    <>
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Exporting...</span>
                    </>
                ) : (
                    <>
                        <span className="text-lg">🎨</span>
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
