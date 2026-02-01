'use client'

/**
 * AdvancedTab - The "Advanced" tab content
 * Power features: MixLab, Value Scale, Harmonies, Process Slider
 */

import { useState } from 'react'
import MixLab from '../MixLab'
import ColorHarmonies from '../ColorHarmonies'
import ValueHistogram from '../ValueHistogram'
import ProcessSlider, { BreakdownStep } from '../ProcessSlider'
import { ValueScaleSettings } from '@/lib/types/valueScale'
import { ValueScaleResult, ValueScaleMode } from '@/lib/valueScale'
import { getLuminance } from '@/lib/paintingMath'

interface AdvancedTabProps {
    sampledColor: {
        hex: string
        rgb: { r: number; g: number; b: number }
        hsl: { h: number; s: number; l: number }
    } | null
    onColorSelect?: (rgb: { r: number; g: number; b: number }) => void
    valueScaleSettings?: ValueScaleSettings
    onValueScaleChange?: (settings: ValueScaleSettings) => void
    histogramBins?: number[]
    valueScaleResult?: ValueScaleResult | null
    breakdownValue: number
    onBreakdownChange: (value: number) => void
}

type Section = 'mixlab' | 'harmonies' | 'value' | 'stages'

export default function AdvancedTab({
    sampledColor,
    onColorSelect,
    valueScaleSettings,
    onValueScaleChange,
    histogramBins,
    valueScaleResult,
    breakdownValue,
    onBreakdownChange
}: AdvancedTabProps) {
    const [openSection, setOpenSection] = useState<Section | null>('mixlab')

    // Derive active breakdown step
    const activeBreakdownStep: BreakdownStep = (() => {
        if (breakdownValue <= 10) return 'Original'
        if (breakdownValue <= 35) return 'Imprimatura'
        if (breakdownValue <= 60) return 'Dead Color'
        if (breakdownValue <= 85) return 'Local Color'
        return 'Spectral Glaze'
    })()

    const toggleSection = (section: Section) => {
        setOpenSection(openSection === section ? null : section)
    }

    const SectionHeader = ({ section, title, icon }: { section: Section; title: string; icon: string }) => (
        <button
            onClick={() => toggleSection(section)}
            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${openSection === section
                ? 'bg-gray-900 border-gray-800 text-white'
                : 'bg-gray-50 border-gray-200 text-studio hover:bg-gray-100'
                }`}
        >
            <span className="flex items-center gap-2 font-bold text-sm">
                <span>{icon}</span>
                {title}
            </span>
            <span className={`transform transition-transform ${openSection === section ? 'rotate-180' : ''}`}>
                ▼
            </span>
        </button>
    )

    return (
        <div className="bg-white text-studio font-sans min-h-full p-4 lg:p-6 space-y-3">
            {/* Header */}
            <div className="mb-4">
                <h2 className="text-lg font-bold text-studio mb-1">Advanced Tools</h2>
                <p className="text-sm text-studio-muted">Power features for deep color work</p>
            </div>

            {/* Mix Lab Section */}
            <div>
                <SectionHeader section="mixlab" title="Spectral Mix Lab" icon="🔬" />
                {openSection === 'mixlab' && (
                    <div className="mt-2 p-4 bg-gray-900 rounded-xl border border-gray-800">
                        {sampledColor ? (
                            <MixLab targetHex={sampledColor.hex} />
                        ) : (
                            <p className="text-gray-400 text-center py-8">Sample a color to use Mix Lab</p>
                        )}
                    </div>
                )}
            </div>

            {/* Harmonies Section */}
            <div>
                <SectionHeader section="harmonies" title="Color Harmonies" icon="🎨" />
                {openSection === 'harmonies' && (
                    <div className="mt-2 p-4 bg-white rounded-xl border border-gray-200">
                        {sampledColor ? (
                            <ColorHarmonies rgb={sampledColor.rgb} onColorSelect={onColorSelect || (() => { })} />
                        ) : (
                            <p className="text-studio-muted text-center py-8">Sample a color to see harmonies</p>
                        )}
                    </div>
                )}
            </div>

            {/* Value Scale Section */}
            <div>
                <SectionHeader section="value" title="Value Distribution" icon="📊" />
                {openSection === 'value' && valueScaleSettings && (
                    <div className="mt-2 p-4 bg-gray-900 rounded-xl border border-gray-800 space-y-4">
                        {histogramBins && histogramBins.length > 0 && (
                            <ValueHistogram
                                bins={histogramBins}
                                thresholds={valueScaleResult?.thresholds}
                                currentValue={sampledColor ? getLuminance(sampledColor.rgb.r, sampledColor.rgb.g, sampledColor.rgb.b) / 100 : undefined}
                            />
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Settings</span>
                            <button
                                onClick={() => onValueScaleChange?.({ ...valueScaleSettings, enabled: !valueScaleSettings.enabled })}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${valueScaleSettings.enabled ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
                            >
                                {valueScaleSettings.enabled ? 'Overlay ON' : 'Overlay OFF'}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Steps</span>
                                <select
                                    value={valueScaleSettings.steps}
                                    onChange={(e) => onValueScaleChange?.({ ...valueScaleSettings, steps: parseInt(e.target.value) })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="5">5 Steps</option>
                                    <option value="7">7 Steps</option>
                                    <option value="9">9 Steps</option>
                                    <option value="11">11 Steps</option>
                                </select>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Mode</span>
                                <select
                                    value={valueScaleSettings.mode}
                                    onChange={(e) => onValueScaleChange?.({ ...valueScaleSettings, mode: e.target.value as ValueScaleMode })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="Even">Even</option>
                                    <option value="Percentile">Percentile</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Painting Stages Section */}
            <div>
                <SectionHeader section="stages" title="Painting Stages" icon="🖼️" />
                {openSection === 'stages' && (
                    <div className="mt-2 p-4 bg-white rounded-xl border border-gray-200 space-y-4">
                        <p className="text-sm text-studio-muted mb-4">Explore the visual breakdown of the painting process.</p>
                        <ProcessSlider
                            value={breakdownValue}
                            onChange={onBreakdownChange}
                            activeStep={activeBreakdownStep}
                        />
                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                            <p className="text-xs text-blue-700 leading-relaxed">
                                <strong>Tip:</strong> Use these stages to plan your physical painting layers.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
