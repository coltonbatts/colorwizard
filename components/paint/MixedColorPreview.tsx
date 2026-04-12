'use client'

/**
 * MixedColorPreview - Shows the predicted mix result with comparison
 */

import { motion } from 'framer-motion'

interface MixedColorPreviewProps {
    /** Target hex color we're trying to match */
    targetHex: string
    /** Solver-backed preview details, when available */
    preview?: {
        predictedHex: string
        matchQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor'
        error: number
    } | null
    /** Whether this panel is solver-backed or heuristic */
    mixSource: 'solver' | 'heuristic'
    /** Layout density */
    variant?: 'standard' | 'dashboard' | 'compact' | 'board'
}

// Match quality styling
const QUALITY_STYLES = {
    Excellent: {
        bg: 'bg-emerald-500/12',
        border: 'border-emerald-500/20',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500'
    },
    Good: {
        bg: 'bg-green-500/12',
        border: 'border-green-500/20',
        text: 'text-green-700',
        dot: 'bg-green-500'
    },
    Fair: {
        bg: 'bg-amber-500/12',
        border: 'border-amber-500/20',
        text: 'text-amber-700',
        dot: 'bg-yellow-500'
    },
    Poor: {
        bg: 'bg-red-500/12',
        border: 'border-red-500/20',
        text: 'text-red-700',
        dot: 'bg-red-500'
    },
}

export default function MixedColorPreview({
    targetHex,
    preview = null,
    mixSource,
    variant = 'standard',
}: MixedColorPreviewProps) {
    const isCompact = variant === 'compact'
    const isBoard = variant === 'board'
    const styles = preview ? QUALITY_STYLES[preview.matchQuality] : null

    if (isBoard) {
        return (
            <div className="mb-5">
                <motion.div
                    className="rounded-[28px] border border-ink-hairline bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(245,239,229,0.94))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                >
                    <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-ink-faint">
                        Target Color
                    </div>

                    <div
                        className="h-36 rounded-[24px] border border-black/8 shadow-[0_18px_40px_rgba(33,24,14,0.12)]"
                        style={{ backgroundColor: targetHex }}
                    />

                    {preview && styles ? (
                        <div className="mt-4 rounded-[22px] border border-ink-hairline bg-[rgba(255,252,247,0.82)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.62)]">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">
                                        Solver Fit
                                    </div>
                                    <div className="mt-1 flex items-center gap-2">
                                        <div className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
                                        <span className={`text-sm font-semibold ${styles.text}`}>
                                            {preview.matchQuality}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono text-[11px] font-black uppercase tracking-[0.16em] text-ink-faint">
                                        Delta
                                    </div>
                                    <div className="mt-1 font-mono text-xl font-black text-ink">
                                        {preview.error.toFixed(1)}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 flex items-center gap-3">
                                <div
                                    className="h-10 w-10 rounded-[14px] border border-black/8"
                                    style={{ backgroundColor: preview.predictedHex }}
                                />
                                <div className="min-w-0">
                                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">
                                        Mixed Preview
                                    </div>
                                    <div className="mt-1 font-mono text-sm font-bold text-ink">
                                        {preview.predictedHex.toUpperCase()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 rounded-[22px] border border-subsignal/20 bg-subsignal-muted/70 px-4 py-3">
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-subsignal">
                                {mixSource === 'heuristic' ? 'Studio Guide' : 'Preview Pending'}
                            </div>
                            <p className="mt-1 text-sm leading-5 text-ink-secondary">
                                Use this target swatch and the recipe below.
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>
        )
    }

    return (
        <div className={`${isCompact ? 'mb-3' : 'mb-5'}`}>
            <motion.div
                className={`rounded-[24px] border border-ink-hairline bg-[linear-gradient(180deg,rgba(255,252,247,0.96),rgba(245,239,229,0.88))] ${isCompact ? 'p-3' : 'p-4'} shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
            >
                <div className="flex items-start gap-3">
                    <motion.div
                        className="min-w-0 flex-1"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 }}
                    >
                        <div className={`${isCompact ? 'mb-1 text-[8px]' : 'mb-1.5 text-[9px]'} font-black uppercase tracking-[0.18em] text-ink-faint`}>
                            {preview ? 'Solver Preview' : 'Reference Color'}
                        </div>
                        <div
                            className={`${isCompact ? 'h-20 rounded-[20px]' : 'h-24 rounded-[24px]'} border border-black/8 shadow-[0_16px_38px_rgba(33,24,14,0.12)]`}
                            style={{ backgroundColor: preview?.predictedHex ?? targetHex }}
                        />
                    </motion.div>

                    {preview && (
                        <motion.div
                            className={isCompact ? 'w-16 shrink-0' : 'w-20 shrink-0'}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.18 }}
                        >
                            <div className={`${isCompact ? 'mb-1 text-[8px]' : 'mb-1.5 text-[9px]'} font-black uppercase tracking-[0.18em] text-ink-faint`}>
                                Target
                            </div>
                            <div
                                className={`${isCompact ? 'h-20 rounded-[18px]' : 'h-24 rounded-[22px]'} border border-black/8 shadow-[0_12px_28px_rgba(33,24,14,0.08)]`}
                                style={{ backgroundColor: targetHex }}
                            />
                        </motion.div>
                    )}
                </div>

                {preview && styles ? (
                    <div className="mt-3 flex items-center justify-between gap-2">
                        <div className={`inline-flex items-center gap-1.5 rounded-full border ${styles.bg} ${styles.border} ${isCompact ? 'px-2 py-1' : 'px-3 py-1.5'}`}>
                            <div className={`h-2 w-2 rounded-full ${styles.dot}`} />
                            <span className={`${isCompact ? 'text-[10px]' : 'text-sm'} font-semibold ${styles.text}`}>
                                {preview.matchQuality} screen fit
                            </span>
                        </div>

                        <div className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink-secondary">
                            dE {preview.error.toFixed(1)}
                        </div>
                    </div>
                ) : (
                    <div className="mt-3 rounded-[18px] border border-subsignal/20 bg-subsignal-muted/70 px-3 py-2.5">
                        <div className="text-[9px] font-black uppercase tracking-[0.18em] text-subsignal">
                            {mixSource === 'heuristic' ? 'Heuristic guide' : 'Preview unavailable'}
                        </div>
                        <p className={`mt-1 text-ink-secondary ${isCompact ? 'text-[10px] leading-4' : 'text-[11px] leading-5'}`}>
                            {isCompact
                                ? 'Using the reference swatch until a solver fit is available.'
                                : 'Built from hue and value heuristics. No predicted mix swatch or deltaE score is shown until the solver returns.'}
                        </p>
                    </div>
                )}
            </motion.div>
        </div>
    )
}
