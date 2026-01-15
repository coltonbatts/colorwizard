'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type BreakdownStep = 'Original' | 'Imprimatura' | 'Dead Color' | 'Local Color' | 'Spectral Glaze';

interface ProcessSliderProps {
    value: number; // 0 to 100
    onChange: (value: number) => void;
    activeStep: BreakdownStep;
    isGenerating?: boolean;
}

const STEPS: { label: BreakdownStep; min: number; max: number }[] = [
    { label: 'Original', min: 0, max: 10 },
    { label: 'Imprimatura', min: 11, max: 35 },
    { label: 'Dead Color', min: 36, max: 60 },
    { label: 'Local Color', min: 61, max: 85 },
    { label: 'Spectral Glaze', min: 86, max: 100 },
];

const ProcessSlider: React.FC<ProcessSliderProps> = ({ value, onChange, activeStep, isGenerating }) => {
    return (
        <div className="w-full space-y-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 backdrop-blur-sm">
            <div className="flex justify-between items-center">
                <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Breakdown Stage</span>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {activeStep}
                        {isGenerating && (
                            <motion.span
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                className="inline-block w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full"
                            />
                        )}
                    </h3>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-black text-primary-500">{Math.round(value)}%</span>
                </div>
            </div>

            <div className="relative pt-6 pb-2">
                {/* Custom Track with Labels */}
                <div className="absolute top-0 left-0 w-full flex justify-between px-1">
                    {STEPS.map((s) => (
                        <span
                            key={s.label}
                            className={`text-[10px] uppercase font-bold transition-colors ${activeStep === s.label ? 'text-primary-400' : 'text-zinc-600'
                                }`}
                        >
                            {s.label}
                        </span>
                    ))}
                </div>

                <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />

                {/* Markers */}
                <div className="flex justify-between w-full px-1 mt-1">
                    {STEPS.map((s) => (
                        <div
                            key={s.label}
                            className={`w-1 h-3 rounded-full transition-colors ${value >= s.min && value <= s.max ? 'bg-primary-500' : 'bg-zinc-700'
                                }`}
                        />
                    ))}
                </div>
            </div>

            <p className="text-zinc-400 text-xs italic">
                {activeStep === 'Original' && "Reference image as uploaded."}
                {activeStep === 'Imprimatura' && "Dominant undertone wash (The Ground)."}
                {activeStep === 'Dead Color' && "Posterized value block-in (The Grissaile)."}
                {activeStep === 'Local Color' && "Simplified core color shapes."}
                {activeStep === 'Spectral Glaze' && "Final details and vibrant highlights."}
            </p>
        </div>
    );
};

export default ProcessSlider;
