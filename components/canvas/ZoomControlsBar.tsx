'use client';

/**
 * ZoomControlsBar - Zoom and view control toolbar for the canvas.
 * Extracted from ImageCanvas.tsx for maintainability.
 */

interface ZoomControlsBarProps {
    /** Current zoom level (1 = 100%) */
    zoomLevel: number;
    /** Called when zoom in button is clicked */
    onZoomIn: () => void;
    /** Called when zoom out button is clicked */
    onZoomOut: () => void;
    /** Called when fit/reset button is clicked */
    onFit: () => void;
    /** Whether grayscale mode is enabled */
    isGrayscale: boolean;
    /** Toggle grayscale mode */
    onToggleGrayscale: () => void;
    /** Called when actual size button is clicked */
    onActualSize: () => void;
    /** Whether actual size button is enabled */
    isActualSizeEnabled: boolean;
    /** Minimum zoom level */
    minZoom?: number;
    /** Maximum zoom level */
    maxZoom?: number;
}

export default function ZoomControlsBar({
    zoomLevel,
    onZoomIn,
    onZoomOut,
    onFit,
    onActualSize,
    isActualSizeEnabled,
    isGrayscale,
    onToggleGrayscale,
    minZoom = 0.1,
    maxZoom = 10,
}: ZoomControlsBarProps) {
    return (
        <div className="flex items-center justify-between mb-2 px-2">
            <div className="flex items-center gap-2">
                <button
                    onClick={onZoomOut}
                    disabled={zoomLevel <= minZoom}
                    className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded text-white transition-colors text-lg font-bold"
                    title="Zoom Out (-)"
                >
                    −
                </button>
                <div className="w-20 text-center text-gray-300 text-sm font-mono">
                    {Math.round(zoomLevel * 100)}%
                </div>
                <button
                    onClick={onZoomIn}
                    disabled={zoomLevel >= maxZoom}
                    className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded text-white transition-colors text-lg font-bold"
                    title="Zoom In (+)"
                >
                    +
                </button>
                <button
                    onClick={onFit}
                    className="px-3 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-colors"
                    title="Reset View (0)"
                >
                    Fit
                </button>
                <button
                    onClick={onActualSize}
                    disabled={!isActualSizeEnabled}
                    className={`px-3 h-8 flex items-center justify-center rounded text-sm transition-colors ${isActualSizeEnabled
                            ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30'
                            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        }`}
                    title={isActualSizeEnabled ? 'Recalibrate to Actual Size' : 'Calibration or Canvas Settings required'}
                >
                    Actual Size
                </button>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onToggleGrayscale}
                    className={`px-3 h-8 flex items-center justify-center rounded text-sm transition-colors ${isGrayscale
                        ? 'bg-blue-600 text-white hover:bg-blue-600/80'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    title="Toggle Grayscale"
                >
                    Gray
                </button>
            </div>
            <div className="text-gray-500 text-xs">
                Scroll/± to Zoom • Space+Drag to Pan • 0 to Fit • Click to Sample
            </div>
        </div>
    );
}
