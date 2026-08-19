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
    valueModeEnabled?: boolean;
    onToggleValueMode?: () => void;
    onFullScreen?: () => void;
}

export default function ZoomControlsBar({
    zoomLevel,
    onZoomIn,
    onZoomOut,
    onFit,
    minZoom = 0.1,
    maxZoom = 10,
    valueModeEnabled = false,
    onToggleValueMode,
    onFullScreen,
}: ZoomControlsBarProps) {
    return (
        <div className="inline-flex items-center gap-1.5 rounded-sm border border-ink bg-paper-elevated p-1 text-ink shadow-sm">
            <button
                type="button"
                onClick={onZoomOut}
                disabled={zoomLevel <= minZoom}
                className="flex h-8 w-8 items-center justify-center rounded-sm border border-ink-hairline bg-paper text-sm font-bold text-ink transition-[transform,color,background-color,border-color,opacity] duration-200 hover:bg-paper-recessed hover:border-ink-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
                title="Zoom Out (-)"
                aria-label="Zoom out"
            >
                −
            </button>
            <div className="rounded-sm border border-ink-hairline bg-paper-recessed/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-secondary">
                {Math.round(zoomLevel * 100)}%
            </div>
            <button
                type="button"
                onClick={onFit}
                className="flex h-8 items-center justify-center rounded-sm border border-ink bg-ink px-3 text-[10px] font-black uppercase tracking-[0.18em] text-paper-elevated transition-[transform,color,background-color,border-color] duration-200 hover:bg-graphite active:scale-95"
                title="Fit to view (perfect initial size)"
            >
                Fit
            </button>
            <button
                type="button"
                onClick={onZoomIn}
                disabled={zoomLevel >= maxZoom}
                className="flex h-8 w-8 items-center justify-center rounded-sm border border-ink-hairline bg-paper text-sm font-bold text-ink transition-[transform,color,background-color,border-color,opacity] duration-200 hover:bg-paper-recessed hover:border-ink-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
                title="Zoom In (+)"
                aria-label="Zoom in"
            >
                +
            </button>
            {onToggleValueMode && (
                <button
                    type="button"
                    onClick={onToggleValueMode}
                    className={`flex h-8 items-center justify-center rounded-sm border px-3 text-[10px] font-black uppercase tracking-[0.14em] transition-[transform,color,background-color,border-color] duration-200 active:scale-95 ${valueModeEnabled ? 'border-ink bg-[#f2c943] text-ink' : 'border-ink-hairline bg-paper text-ink-secondary hover:border-ink-muted hover:bg-paper-recessed hover:text-ink'}`}
                    aria-pressed={valueModeEnabled}
                >
                    Value
                </button>
            )}
            {onFullScreen && (
                <button
                    type="button"
                    onClick={onFullScreen}
                    className="flex h-8 items-center justify-center rounded-sm border border-ink-hairline bg-paper px-3 text-[10px] font-black uppercase tracking-[0.14em] text-ink-secondary transition-[transform,color,background-color,border-color] duration-200 hover:border-ink-muted hover:bg-paper-recessed hover:text-ink active:scale-95"
                >
                    Full Screen
                </button>
            )}
        </div>
    );
}
