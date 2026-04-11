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
        <div className="inline-flex items-center gap-1 rounded-full border border-ink-hairline bg-[rgba(255,252,247,0.9)] p-1.5 text-ink shadow-[0_14px_32px_rgba(33,24,14,0.12)] backdrop-blur-md">
            <button
                onClick={onZoomOut}
                disabled={zoomLevel <= minZoom}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-paper text-lg font-bold text-ink transition-colors hover:bg-paper-recessed disabled:cursor-not-allowed disabled:opacity-35"
                title="Zoom Out (-)"
            >
                −
            </button>
            <div className="rounded-full border border-ink-hairline bg-[rgba(255,252,247,0.82)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-secondary">
                {Math.round(zoomLevel * 100)}%
            </div>
            <button
                onClick={onFit}
                className="flex h-9 items-center justify-center rounded-full bg-ink px-4 text-xs font-black uppercase tracking-[0.18em] text-paper-elevated transition-colors hover:bg-[#26201a]"
                title="Fit to view (perfect initial size)"
            >
                Fit
            </button>
            <button
                onClick={onZoomIn}
                disabled={zoomLevel >= maxZoom}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-paper text-lg font-bold text-ink transition-colors hover:bg-paper-recessed disabled:cursor-not-allowed disabled:opacity-35"
                title="Zoom In (+)"
            >
                +
            </button>
        </div>
    );
}
