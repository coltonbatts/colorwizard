'use client'

/**
 * CanvasErrorFallback - Shown when ImageCanvas crashes.
 * Allows user to re-upload image or retry.
 */

interface CanvasErrorFallbackProps {
    error?: Error
    resetError?: () => void
    onReset?: () => void // Additional callback to reset app state (e.g., clear image)
}

export function CanvasErrorFallback({
    error,
    resetError,
    onReset,
}: CanvasErrorFallbackProps) {
    const handleLoadNew = () => {
        // Reset error first, then trigger app reset
        if (resetError) resetError()
        if (onReset) onReset()
    }

    const handleTryAgain = () => {
        if (resetError) resetError()
    }

    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center glass-panel">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6 shadow-sm">
                <span className="text-3xl">🖼️</span>
            </div>

            <h3 className="text-lg font-semibold text-studio mb-2">
                Canvas rendering failed
            </h3>

            <p className="text-sm text-studio-muted mb-6 max-w-xs">
                Something went wrong while rendering the image. You can try again or load a new image.
            </p>

            {error && process.env.NODE_ENV === 'development' && (
                <p className="text-xs text-red-400 mb-4 font-mono bg-red-50 px-3 py-1 rounded-lg max-w-xs truncate">
                    {error.message}
                </p>
            )}

            <div className="flex gap-3">
                <button
                    onClick={handleTryAgain}
                    className="px-4 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                >
                    Try again
                </button>
                <button
                    onClick={handleLoadNew}
                    className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
                >
                    Load new image
                </button>
            </div>
        </div>
    )
}

export default CanvasErrorFallback
