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
        <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-gray-100 mb-4 flex flex-wrap items-center gap-4 text-sm shadow-sm">
            <label className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={gridEnabled}
                    onChange={(e) => onToggleGrid(e.target.checked)}
                    className="w-4 h-4 rounded-md border-gray-200 bg-gray-50 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-studio font-bold">Grid Overlay</span>
            </label>

            <div className="flex items-center gap-2">
                <span className="text-studio-dim font-black text-[10px] uppercase tracking-widest">Canvas:</span>
                <input
                    type="number"
                    value={physicalWidth}
                    onChange={(e) => onDimensionsChange(Number(e.target.value), physicalHeight)}
                    className="w-16 px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg text-studio font-mono text-sm focus:border-blue-500 outline-none shadow-inner"
                    min="1"
                />
                <span className="text-gray-300">×</span>
                <input
                    type="number"
                    value={physicalHeight}
                    onChange={(e) => onDimensionsChange(physicalWidth, Number(e.target.value))}
                    className="w-16 px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg text-studio font-mono text-sm focus:border-blue-500 outline-none shadow-inner"
                    min="1"
                />
                <span className="text-studio-dim font-bold">in</span>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-studio-dim font-black text-[10px] uppercase tracking-widest">Size:</span>
                <select
                    value={squareSize}
                    onChange={(e) => onSquareSizeChange(Number(e.target.value))}
                    className="px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg text-studio font-mono text-sm focus:border-blue-500 outline-none shadow-sm"
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
