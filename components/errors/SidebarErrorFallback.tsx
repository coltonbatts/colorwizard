'use client'

/**
 * SidebarErrorFallback - Shown when sidebar tab content crashes.
 * Minimal design to keep canvas functional.
 */

interface SidebarErrorFallbackProps {
    error?: Error
    resetError?: () => void
}

export function SidebarErrorFallback({
    error,
    resetError,
}: SidebarErrorFallbackProps) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-white">
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-4">
                <span className="text-2xl">📋</span>
            </div>

            <h3 className="text-base font-semibold text-studio mb-2">
                Sidebar temporarily unavailable
            </h3>

            <p className="text-sm text-studio-muted mb-5 max-w-xs">
                This tab encountered an issue. You can continue sampling colors on the canvas.
            </p>

            {error && process.env.NODE_ENV === 'development' && (
                <p className="text-xs text-amber-600 mb-4 font-mono bg-amber-50 px-3 py-1 rounded-lg max-w-full truncate">
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
                Try switching to a different tab
            </p>
        </div>
    )
}

export default SidebarErrorFallback
