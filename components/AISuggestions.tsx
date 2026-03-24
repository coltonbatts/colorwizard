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
        <section className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-studio-dim uppercase tracking-widest">
                    AI Palette Suggestions
                </h3>
                {!isPro && (
                    <span className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">PRO</span>
                )}
            </div>

            <FeatureGate
                feature="aiPaletteSuggestions"
                showPromptOnClick
            >
                <div className="space-y-6">
                    {/* Base Analysis */}
                    {analysis && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100/50"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-sm shadow-indigo-200 shadow-lg">📈</div>
                                <h4 className="text-xs font-black text-indigo-900 uppercase tracking-tight">Chromatic Analysis</h4>
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs text-indigo-800 font-medium leading-relaxed">
                                    <span className="font-black">VALUE:</span> {analysis.value}
                                </p>
                                <p className="text-xs text-indigo-800 font-medium leading-relaxed">
                                    <span className="font-black">CHROMA:</span> {analysis.chroma}
                                </p>
                                <p className="text-xs text-indigo-900/60 italic font-bold leading-relaxed pt-2 border-t border-indigo-200/50">
                                    &quot;{analysis.mixingTip}&quot;
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* Suggestions Grid */}
                    <div className="space-y-4">
                        {suggestions.map((s, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">{s.type}</p>
                                            <h4 className="text-lg font-black text-gray-900 tracking-tight">{s.title}</h4>
                                        </div>
                                        <div className="flex gap-1.5">
                                            {s.colors.map((c, ci) => (
                                                <div
                                                    key={ci}
                                                    className="w-8 h-8 rounded-lg shadow-inner border border-black/5"
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <p className="text-sm text-gray-600 leading-relaxed font-medium mb-4" dangerouslySetInnerHTML={{ __html: s.description }} />

                                    {s.pigments && (
                                        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-50">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest w-full mb-1">Suggested Pigments:</span>
                                            {s.pigments.map((p, pi) => (
                                                <span key={pi} className="px-3 py-1 bg-gray-50 text-gray-700 text-[10px] font-bold rounded-full border border-gray-100">
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
