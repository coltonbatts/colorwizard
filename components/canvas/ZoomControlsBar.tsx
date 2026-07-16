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
        <div className="inline-flex items-center gap-1.5 rounded-sm border border-ink bg-paper-elevated p-1 text-ink shadow-sm">
            <button
                onClick={onZoomOut}
                disabled={zoomLevel <= minZoom}
                className="flex h-8 w-8 items-center justify-center rounded-sm border border-ink-hairline bg-paper text-sm font-bold text-ink transition-all duration-200 hover:bg-paper-recessed hover:border-ink-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
                title="Zoom Out (-)"
            >
                −
            </button>
            <div className="rounded-sm border border-ink-hairline bg-paper-recessed/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-secondary">
                {Math.round(zoomLevel * 100)}%
            </div>
            <button
                onClick={onFit}
                className="flex h-8 items-center justify-center rounded-sm border border-ink bg-ink px-3 text-[10px] font-black uppercase tracking-[0.18em] text-paper-elevated transition-all duration-200 hover:bg-graphite active:scale-95"
                title="Fit to view (perfect initial size)"
            >
                Fit
            </button>
            <button
                onClick={onZoomIn}
                disabled={zoomLevel >= maxZoom}
                className="flex h-8 w-8 items-center justify-center rounded-sm border border-ink-hairline bg-paper text-sm font-bold text-ink transition-all duration-200 hover:bg-paper-recessed hover:border-ink-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
                title="Zoom In (+)"
            >
                +
            </button>
        </div>
    );
}
