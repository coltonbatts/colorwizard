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
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-[18px] px-3 py-2 text-xs shadow-[0_12px_30px_rgba(33,24,14,0.12)]"
            >
                <div className="flex flex-wrap items-center gap-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-secondary">
                        {formattedModeLabel}
                    </div>
                    <div className="font-mono text-[10px] font-bold text-ink-faint">
                        {Math.round(zoomLevel * 100)}%
                    </div>
                    {activeModes.map((mode) => (
                        <span
                            key={mode.label}
                            className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] ${
                                mode.tone === 'subsignal'
                                    ? 'border-subsignal bg-subsignal-muted text-subsignal'
                                    : 'border-signal bg-signal-muted text-signal'
                            }`}
                        >
                            {mode.label}
                        </span>
                    ))}
                </div>

                {liveColorHex && (
                    <div className="mt-2 flex items-center gap-2 border-t border-ink-hairline pt-2">
                        <motion.div
                            layoutId="live-color-swatch"
                            className="h-5 w-5 rounded-[7px] border border-black/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.28)]"
                            style={{ backgroundColor: liveColorHex }}
                        />
                        <div className="font-mono text-[11px] font-bold text-ink">
                            {liveColorHex.toUpperCase()}
                        </div>

                        {livePaintMixHex && (
                            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-ink-secondary">
                                <motion.div
                                    layoutId="paint-mix-swatch"
                                    className="h-4 w-4 rounded-[4px] border border-black/10"
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
