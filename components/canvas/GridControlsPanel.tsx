'use client';

/**
 * GridControlsPanel - Grid overlay configuration panel.
 * Extracted from ImageCanvas.tsx for maintainability.
 */

interface GridControlsPanelProps {
    /** Whether grid overlay is enabled */
    gridEnabled: boolean;
    /** Toggle grid overlay */
    onToggleGrid: (enabled: boolean) => void;
    /** Physical canvas width in inches */
    physicalWidth: number;
    /** Physical canvas height in inches */
    physicalHeight: number;
    /** Update canvas dimensions */
    onDimensionsChange: (width: number, height: number) => void;
    /** Grid square size in inches */
    squareSize: number;
    /** Update grid square size */
    onSquareSizeChange: (size: number) => void;
}

export default function GridControlsPanel({
    gridEnabled,
    onToggleGrid,
    physicalWidth,
    physicalHeight,
    onDimensionsChange,
    squareSize,
    onSquareSizeChange,
}: GridControlsPanelProps) {
    return (
        <fieldset className="canvas-grid-controls">
            <legend className="sr-only">Grid overlay settings</legend>
            <label className="flex items-center gap-2 cursor-pointer">
                <input
                    name="grid-overlay"
                    type="checkbox"
                    checked={gridEnabled}
                    onChange={(e) => onToggleGrid(e.target.checked)}
                    className="w-4 h-4 accent-[var(--studio-accent)]"
                />
                <span className="text-studio font-bold">Grid Overlay</span>
            </label>

            <div className="flex items-center gap-2">
                <span className="studio-section-label">Canvas</span>
                <label htmlFor="grid-canvas-width" className="sr-only">Canvas width in inches</label>
                <input
                    id="grid-canvas-width"
                    name="grid-canvas-width"
                    type="number"
                    value={physicalWidth}
                    onChange={(e) => onDimensionsChange(Number(e.target.value), physicalHeight)}
                    className="canvas-grid-input"
                    min="1"
                    inputMode="decimal"
                />
                <span className="text-gray-300">×</span>
                <label htmlFor="grid-canvas-height" className="sr-only">Canvas height in inches</label>
                <input
                    id="grid-canvas-height"
                    name="grid-canvas-height"
                    type="number"
                    value={physicalHeight}
                    onChange={(e) => onDimensionsChange(physicalWidth, Number(e.target.value))}
                    className="canvas-grid-input"
                    min="1"
                    inputMode="decimal"
                />
                <span className="text-studio-dim font-bold">in</span>
            </div>

            <div className="flex items-center gap-2">
                <label htmlFor="grid-square-size" className="studio-section-label">Grid size</label>
                <select
                    id="grid-square-size"
                    name="grid-square-size"
                    value={squareSize}
                    onChange={(e) => onSquareSizeChange(Number(e.target.value))}
                    className="canvas-grid-select"
                >
                    <option value="0.25">0.25&quot;</option>
                    <option value="0.5">0.5&quot;</option>
                    <option value="1">1&quot;</option>
                    <option value="2">2&quot;</option>
                    <option value="3">3&quot;</option>
                </select>
            </div>
        </fieldset>
    );
}
