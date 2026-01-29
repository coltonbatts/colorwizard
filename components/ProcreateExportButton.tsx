/**
 * Procreate Export Button Component
 * Reusable button for exporting color palettes to Procreate
 */

'use client';

import { useState } from 'react';
import { useExportToProcreate } from '@/hooks/useExportToProcreate';
import type { ProcreateColor } from '@/lib/types/procreate';

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
    const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

    const handleExport = async () => {
        try {
            // Check tier limits before export
            if (!isPro && colors.length > maxColors) {
                setShowUpgradePrompt(true);
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

            {/* Upgrade Prompt Modal */}
            {showUpgradePrompt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 mx-4">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">✨</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                Upgrade to Pro
                            </h3>
                            <p className="text-gray-600 mb-4">
                                You have <strong>{colors.length} colors</strong>, but free tier is limited to <strong>{maxColors} colors</strong>.
                            </p>
                            <p className="text-sm text-gray-500 mb-6">
                                Upgrade to Pro for <strong>$1 forever</strong> to unlock:
                            </p>
                            <ul className="text-left text-sm text-gray-700 mb-6 space-y-2">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-0.5">✓</span>
                                    <span>Unlimited colors (up to 30 per palette)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-0.5">✓</span>
                                    <span>Custom palette names</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-0.5">✓</span>
                                    <span>Value-sorted color ordering</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-0.5">✓</span>
                                    <span>All Pro features forever</span>
                                </li>
                            </ul>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowUpgradePrompt(false)}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        // TODO: Navigate to pricing/upgrade page
                                        window.location.href = '/#pricing';
                                    }}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 transition-all"
                                >
                                    Upgrade Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
