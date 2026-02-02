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
    minZoom = 0.1,
    maxZoom = 10,
}: ZoomControlsBarProps) {
    return (
        <div className="flex items-center justify-center gap-2 mb-2 px-2">
            <button
                onClick={onZoomOut}
                disabled={zoomLevel <= minZoom}
                className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-300 rounded-xl text-studio transition-all text-lg font-bold shadow-sm border border-gray-100"
                title="Zoom Out (-)"
            >
                −
            </button>
            <button
                onClick={onFit}
                className="px-4 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                title="Fit to view (perfect initial size)"
            >
                Fit
            </button>
            <button
                onClick={onZoomIn}
                disabled={zoomLevel >= maxZoom}
                className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-300 rounded-xl text-studio transition-all text-lg font-bold shadow-sm border border-gray-100"
                title="Zoom In (+)"
            >
                +
            </button>
        </div>
    );
}
