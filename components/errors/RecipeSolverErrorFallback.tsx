'use client'

/**
 * RecipeSolverErrorFallback - Shown when paint recipe calculation fails.
 * Preserves sampled color info and suggests alternatives.
 */

interface RecipeSolverErrorFallbackProps {
    error?: Error
    resetError?: () => void
    targetHex?: string // Preserve the target color if available
}

export function RecipeSolverErrorFallback({
    error,
    resetError,
    targetHex,
}: RecipeSolverErrorFallbackProps) {
    return (
        <div className="flex flex-col items-center p-6 text-center bg-white rounded-2xl border border-gray-100">
            <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                <span className="text-2xl">🎨</span>
            </div>

            <h3 className="text-base font-semibold text-studio mb-2">
                Unable to calculate paint recipe
            </h3>

            <p className="text-sm text-studio-muted mb-4 max-w-xs">
                The recipe solver encountered an issue. Try a different color or adjust your palette.
            </p>

            {targetHex && (
                <div className="flex items-center gap-3 mb-4 px-4 py-2 bg-gray-50 rounded-xl">
                    <div
                        className="w-8 h-8 rounded-lg border border-gray-200 shadow-inner"
                        style={{ backgroundColor: targetHex }}
                    />
                    <span className="text-sm font-mono text-studio-secondary uppercase">
                        {targetHex}
                    </span>
                </div>
            )}

            {error && process.env.NODE_ENV === 'development' && (
                <p className="text-xs text-orange-600 mb-4 font-mono bg-orange-50 px-3 py-1 rounded-lg max-w-full truncate">
                    {error.message}
                </p>
            )}

            <button
                onClick={resetError}
                className="px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
            >
                Try again
            </button>

            <p className="text-xs text-studio-muted mt-4">
                💡 Tip: Try sampling a less saturated color
            </p>
        </div>
    )
}

export default RecipeSolverErrorFallback
