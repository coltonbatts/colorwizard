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
        <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 mb-4 flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={gridEnabled}
                    onChange={(e) => onToggleGrid(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-200 font-medium">Grid Overlay</span>
            </label>

            <div className="flex items-center gap-2">
                <span className="text-gray-400">Canvas:</span>
                <input
                    type="number"
                    value={physicalWidth}
                    onChange={(e) => onDimensionsChange(Number(e.target.value), physicalHeight)}
                    className="w-16 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-gray-200 focus:border-blue-500 outline-none"
                    min="1"
                />
                <span className="text-gray-500">×</span>
                <input
                    type="number"
                    value={physicalHeight}
                    onChange={(e) => onDimensionsChange(physicalWidth, Number(e.target.value))}
                    className="w-16 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-gray-200 focus:border-blue-500 outline-none"
                    min="1"
                />
                <span className="text-gray-500">in</span>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-gray-400">Size:</span>
                <select
                    value={squareSize}
                    onChange={(e) => onSquareSizeChange(Number(e.target.value))}
                    className="px-2 py-1 bg-gray-900 border border-gray-600 rounded text-gray-200 focus:border-blue-500 outline-none"
                >
                    <option value="0.25">0.25"</option>
                    <option value="0.5">0.5"</option>
                    <option value="1">1"</option>
                    <option value="2">2"</option>
                    <option value="3">3"</option>
                </select>
            </div>
        </div>
    );
}
