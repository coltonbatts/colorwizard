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
    /** Whether value overlay is enabled */
    valueOverlayEnabled: boolean;
    /** Toggle value overlay */
    onToggleValueOverlay: () => void;
    /** Whether split view is enabled */
    splitViewEnabled: boolean;
    /** Toggle split view */
    onToggleSplitView: () => void;
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
    valueOverlayEnabled,
    onToggleValueOverlay,
    splitViewEnabled,
    onToggleSplitView,
    minZoom = 0.1,
    maxZoom = 10,
}: ZoomControlsBarProps) {
    return (
        <div className="flex items-center justify-between mb-2 px-2">
            <div className="flex items-center gap-2">
                <button
                    onClick={onZoomOut}
                    disabled={zoomLevel <= minZoom}
                    className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-300 rounded-xl text-studio transition-all text-lg font-bold shadow-sm border border-gray-100"
                    title="Zoom Out (-)"
                >
                    −
                </button>
                <div className="w-20 text-center text-studio font-black font-mono text-sm tracking-tighter">
                    {Math.round(zoomLevel * 100)}%
                </div>
                <button
                    onClick={onZoomIn}
                    disabled={zoomLevel >= maxZoom}
                    className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-300 rounded-xl text-studio transition-all text-lg font-bold shadow-sm border border-gray-100"
                    title="Zoom In (+)"
                >
                    +
                </button>
                <button
                    onClick={onFit}
                    className="px-3 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-xl text-studio text-sm font-bold transition-all shadow-sm border border-gray-100"
                    title="Reset View (0)"
                >
                    Fit
                </button>
                <button
                    onClick={onActualSize}
                    disabled={!isActualSizeEnabled}
                    className={`px-3 h-8 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${isActualSizeEnabled
                        ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 shadow-sm'
                        : 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-50'
                        }`}
                    title={isActualSizeEnabled ? 'Recalibrate to Actual Size' : 'Calibration or Canvas Settings required'}
                >
                    Actual Size
                </button>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onToggleValueOverlay}
                    className={`px-3 h-8 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${valueOverlayEnabled
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-50 text-studio hover:bg-gray-100 border border-gray-100 shadow-sm'
                        }`}
                    title="Toggle Value Overlay (V)"
                >
                    Value
                </button>
                <button
                    onClick={onToggleSplitView}
                    className={`px-3 h-8 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${splitViewEnabled
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-50 text-studio hover:bg-gray-100 border border-gray-100 shadow-sm'
                        }`}
                    title="Toggle Split View (S)"
                >
                    Split
                </button>
                <button
                    onClick={onToggleGrayscale}
                    className={`px-3 h-8 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${isGrayscale
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-50 text-studio hover:bg-gray-100 border border-gray-100 shadow-sm'
                        }`}
                    title="Toggle Grayscale"
                >
                    Gray
                </button>
            </div>
        </div>
    );
}
