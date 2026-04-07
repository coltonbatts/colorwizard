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
        <div className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-black/55 p-1.5 text-white shadow-[0_12px_32px_rgba(0,0,0,0.22)] backdrop-blur-md">
            <button
                onClick={onZoomOut}
                disabled={zoomLevel <= minZoom}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/6 text-lg font-bold text-white transition-colors hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-35"
                title="Zoom Out (-)"
            >
                −
            </button>
            <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                {Math.round(zoomLevel * 100)}%
            </div>
            <button
                onClick={onFit}
                className="flex h-9 items-center justify-center rounded-full bg-white px-4 text-xs font-black uppercase tracking-[0.18em] text-black transition-colors hover:bg-white/90"
                title="Fit to view (perfect initial size)"
            >
                Fit
            </button>
            <button
                onClick={onZoomIn}
                disabled={zoomLevel >= maxZoom}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/6 text-lg font-bold text-white transition-colors hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-35"
                title="Zoom In (+)"
            >
                +
            </button>
        </div>
    );
}
