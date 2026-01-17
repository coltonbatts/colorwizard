/**
 * CanvasHUD - Heads-up display overlay for the canvas.
 * Shows view mode indicators and live paint preview.
 */
'use client';

import { motion, AnimatePresence } from 'framer-motion';

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
}

export default function CanvasHUD({
    valueOverlayEnabled = false,
    splitViewEnabled = false,
    gridEnabled = false,
    zoomLevel = 1,
    liveColorHex = null,
    livePaintMixHex = null,
    livePaintMixError = null,
}: CanvasHUDProps) {
    return (
        <div className="absolute top-3 left-3 pointer-events-none">
            {/* View Modes Panel */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-lg px-3 py-2.5 text-xs"
            >
                <div className="text-[10px] font-semibold text-studio-secondary tracking-wider mb-1.5">
                    VIEW MODES
                </div>
                <div className="space-y-0.5">
                    <ModeIndicator
                        label="[V] Value Overlay"
                        active={valueOverlayEnabled}
                    />
                    <ModeIndicator
                        label="[S] Split View"
                        active={splitViewEnabled}
                    />
                    <ModeIndicator
                        label="[G] Grid"
                        active={gridEnabled}
                    />
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-studio-muted">
                    Zoom: {Math.round(zoomLevel * 100)}%
                </div>
            </motion.div>

            {/* Live Paint Mix Preview */}
            <AnimatePresence>
                {liveColorHex && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className="glass-panel rounded-lg p-2.5 mt-2"
                    >
                        <div className="text-[10px] font-semibold text-studio-secondary tracking-wider mb-1.5">
                            SAMPLED COLOR
                        </div>
                        <div className="flex items-center gap-2">
                            <motion.div
                                layoutId="live-color-swatch"
                                className="w-8 h-8 rounded-md ring-1 ring-white/20"
                                style={{ backgroundColor: liveColorHex }}
                            />
                            <div className="text-[11px] text-studio font-mono">
                                {liveColorHex.toUpperCase()}
                            </div>
                        </div>

                        {livePaintMixHex && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                                <div className="text-[10px] text-studio-muted mb-1">
                                    Paint Mix Match
                                </div>
                                <div className="flex items-center gap-2">
                                    <motion.div
                                        layoutId="paint-mix-swatch"
                                        className="w-6 h-6 rounded ring-1 ring-white/20"
                                        style={{ backgroundColor: livePaintMixHex }}
                                    />
                                    <div className="text-[10px] text-studio-secondary">
                                        ΔE: {livePaintMixError !== null ? livePaintMixError.toFixed(2) : '—'}
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ModeIndicator({
    label,
    active,
}: {
    label: string;
    active: boolean;
}) {
    return (
        <motion.div
            animate={{ opacity: active ? 1 : 0.5 }}
            className={`flex items-center gap-1.5 text-[11px] ${active ? 'text-blue-600 font-medium' : 'text-studio-dim'
                }`}
        >
            <motion.div
                animate={{
                    scale: active ? 1 : 0.8,
                    backgroundColor: active ? 'rgb(99, 102, 241)' : 'rgba(255, 255, 255, 0.2)',
                }}
                className="w-1.5 h-1.5 rounded-full"
            />
            {label}: {active ? 'ON' : 'OFF'}
        </motion.div>
    );
}
