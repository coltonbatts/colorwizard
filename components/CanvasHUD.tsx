'use client'

import { motion } from 'framer-motion'

export interface CanvasHUDProps {
    /** Whether value overlay is enabled */
    valueOverlayEnabled?: boolean;
    /** Whether split view is enabled */
    splitViewEnabled?: boolean;
    /** Whether grid is enabled */
    gridEnabled?: boolean;
    /** Current zoom level */
    zoomLevel?: number;
    /** Live sampled color hex */
    liveColorHex?: string | null;
    /** Live paint mix result hex */
    livePaintMixHex?: string | null;
    /** Delta E of live paint mix */
    livePaintMixError?: number | null;
    /** Whether measurement mode is enabled */
    measureEnabled?: boolean;
    /** Current workspace label */
    workspaceModeLabel?: string;
}

export default function CanvasHUD({
    valueOverlayEnabled = false,
    splitViewEnabled = false,
    gridEnabled = false,
    zoomLevel = 1,
    liveColorHex = null,
    livePaintMixHex = null,
    livePaintMixError = null,
    measureEnabled = false,
    workspaceModeLabel = 'Sample',
}: CanvasHUDProps) {
    const formattedModeLabel =
        workspaceModeLabel
            .split('-')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')

    const activeModes = [
        { label: 'Value', active: valueOverlayEnabled, tone: 'signal' },
        { label: 'Split', active: splitViewEnabled, tone: 'subsignal' },
        { label: 'Grid', active: gridEnabled, tone: 'subsignal' },
        { label: 'Measure', active: measureEnabled, tone: 'signal' },
    ].filter(mode => mode.active)

    return (
        <div className="absolute top-3 left-3 z-20 pointer-events-none max-w-[18rem]">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-panel px-3 py-2 text-xs"
            >
                <div className="flex flex-wrap items-center gap-2">
                    <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-secondary">
                        {formattedModeLabel}
                    </div>
                    <div className="font-mono text-[10px] text-ink-muted" title="Zoom level">
                        zoom {Math.round(zoomLevel * 100)}%
                    </div>
                    {activeModes.map((mode) => (
                        <span
                            key={mode.label}
                            className="rounded-sm border border-ink-hairline bg-paper-recessed px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-ink"
                        >
                            {mode.label}
                        </span>
                    ))}
                </div>

                {liveColorHex && (
                    <div className="mt-2 flex items-center gap-2 border-t border-ink-hairline pt-2">
                        <motion.div
                            layoutId="live-color-swatch"
                            className="h-5 w-5 rounded-sm border border-ink-hairline"
                            style={{ backgroundColor: liveColorHex }}
                        />
                        <div className="font-mono text-[11px] text-ink">
                            {liveColorHex.toUpperCase()}
                        </div>

                        {livePaintMixHex && (
                            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-ink-secondary">
                                <motion.div
                                    layoutId="paint-mix-swatch"
                                    className="h-4 w-4 rounded-sm border border-ink-hairline"
                                    style={{ backgroundColor: livePaintMixHex }}
                                />
                                <span>
                                    dE {livePaintMixError !== null ? livePaintMixError.toFixed(1) : '-'}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    )
}
