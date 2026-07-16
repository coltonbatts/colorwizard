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
        primary: 'border border-ink bg-ink text-paper-elevated font-semibold hover:bg-graphite',
        secondary: 'border border-linen-strong bg-paper-recessed text-ink font-semibold hover:border-ink-muted hover:bg-paper',
        minimal: 'border border-ink-hairline bg-transparent text-ink-secondary font-semibold hover:bg-paper-recessed hover:text-ink',
    };

    const baseStyles = 'flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm transition-[background-color,border-color,color] disabled:cursor-not-allowed disabled:opacity-50';

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
                        <span aria-hidden="true" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
