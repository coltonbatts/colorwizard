'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useUserTier } from '@/lib/hooks/useUserTier';
import { generateAiSuggestions } from '@/lib/ai/suggestions';
import FeatureGate from './FeatureGate';

interface Suggestion {
    type: string;
    title: string;
    description: string;
    colors: string[];
    pigments?: string[];
}

interface AIAnalysis {
    chroma: string;
    value: string;
    mixingTip: string;
}

interface AISuggestionsProps {
    rgb: { r: number; g: number; b: number } | null;
}

/**
 * AISuggestions - Flagship Pro feature component.
 * Displays "AI" generated color theory advice and harmonies.
 */
export default function AISuggestions({ rgb }: AISuggestionsProps) {
    const { isPro } = useUserTier();

    const { suggestions, analysis } = useMemo(() => {
        if (!rgb) {
            return { suggestions: [] as Suggestion[], analysis: null as AIAnalysis | null };
        }
        const data = generateAiSuggestions(rgb, { isPro });
        return {
            suggestions: data.suggestions as Suggestion[],
            analysis: data.baseAnalysis,
        };
    }, [rgb, isPro]);

    if (!rgb) return null;

    return (
        <section className="space-y-5" aria-labelledby="ai-suggestions-title">
            <div className="flex items-center justify-between">
                <h3 id="ai-suggestions-title" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                    AI Palette Suggestions
                </h3>
                {!isPro && (
                    <span className="rounded-sm border border-ink-hairline bg-paper-recessed px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-secondary">Pro</span>
                )}
            </div>

            <FeatureGate
                feature="aiPaletteSuggestions"
                showPromptOnClick
            >
                <div className="space-y-5">
                    {/* Base Analysis */}
                    {analysis && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-lg border border-linen bg-paper p-5"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-md border border-subsignal bg-subsignal-muted text-subsignal">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" />
                                    </svg>
                                </div>
                                <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-secondary">Chromatic Analysis</h4>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium leading-relaxed text-ink-secondary">
                                    <span className="font-semibold text-ink">Value:</span> {analysis.value}
                                </p>
                                <p className="text-sm font-medium leading-relaxed text-ink-secondary">
                                    <span className="font-semibold text-ink">Chroma:</span> {analysis.chroma}
                                </p>
                                <p className="border-t border-ink-hairline pt-3 text-sm italic leading-relaxed text-ink-muted">
                                    “{analysis.mixingTip}”
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* Suggestions Grid */}
                    <div className="space-y-4">
                        {suggestions.map((s, i) => (
                                <motion.div
                                    key={`${s.type}-${s.title}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="group rounded-lg border border-ink-hairline bg-paper-elevated p-5 shadow-sm transition-[border-color,box-shadow] hover:border-linen-strong hover:shadow-md"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-subsignal">{s.type}</p>
                                            <h4 className="font-display text-xl font-medium tracking-tight text-ink">{s.title}</h4>
                                        </div>
                                        <div className="flex gap-1.5">
                                            {s.colors.map((c, ci) => (
                                                <div
                                                    key={ci}
                                                    className="h-8 w-8 rounded-md border border-ink-hairline shadow-inner"
                                                    style={{ backgroundColor: c }}
                                                    title={c}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <p className="mb-4 text-sm font-medium leading-relaxed text-ink-secondary">{s.description.replace(/\*\*/g, '')}</p>

                                    {s.pigments && (
                                        <div className="flex flex-wrap gap-2 border-t border-ink-hairline pt-4">
                                            <span className="mb-1 w-full text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Suggested Pigments</span>
                                            {s.pigments.map((p, pi) => (
                                                <span key={`${p}-${pi}`} className="rounded-md border border-linen bg-paper px-3 py-1 text-xs font-semibold text-ink-secondary">
                                                    {p}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                    </div>
                </div>
            </FeatureGate>
        </section>
    );
}
