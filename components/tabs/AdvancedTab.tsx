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
                ? 'bg-ink border-ink-muted text-white'
                : 'bg-paper-recessed border-ink-hairline text-ink hover:bg-paper-recessed'
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
        <div className="bg-paper-elevated text-ink font-sans min-h-full p-4 lg:p-6 space-y-3">
            {/* Header */}
            <div className="mb-4">
                <h2 className="text-lg font-bold text-ink mb-1">Advanced Tools</h2>
                <p className="text-sm text-ink-muted">Power features for deep color work</p>
            </div>

            {/* Mix Lab Section */}
            <div>
                <SectionHeader section="mixlab" title="Spectral Mix Lab" icon="🔬" />
                {openSection === 'mixlab' && (
                    <div className="mt-2 p-4 bg-ink rounded-xl border border-ink-muted">
                        {sampledColor ? (
                            <MixLab targetHex={sampledColor.hex} />
                        ) : (
                            <p className="text-white/50 text-center py-8">Sample a color to use Mix Lab</p>
                        )}
                    </div>
                )}
            </div>

            {/* Harmonies Section */}
            <div>
                <SectionHeader section="harmonies" title="Color Harmonies" icon="🎨" />
                {openSection === 'harmonies' && (
                    <div className="mt-2 p-4 bg-paper-elevated rounded-xl border border-ink-hairline">
                        {sampledColor ? (
                            <ColorHarmonies rgb={sampledColor.rgb} onColorSelect={onColorSelect || (() => { })} />
                        ) : (
                            <p className="text-ink-muted text-center py-8">Sample a color to see harmonies</p>
                        )}
                    </div>
                )}
            </div>

            {/* Value Scale Section */}
            <div>
                <SectionHeader section="value" title="Value Distribution" icon="📊" />
                {openSection === 'value' && valueScaleSettings && (
                    <div className="mt-2 p-4 bg-ink rounded-xl border border-ink-muted space-y-4">
                        {histogramBins && histogramBins.length > 0 && (
                            <ValueHistogram
                                bins={histogramBins}
                                thresholds={valueScaleResult?.thresholds}
                                currentValue={sampledColor ? getLuminance(sampledColor.rgb.r, sampledColor.rgb.g, sampledColor.rgb.b) / 100 : undefined}
                            />
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-ink-muted">
                            <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Settings</span>
                            <button
                                onClick={() => onValueScaleChange?.({ ...valueScaleSettings, enabled: !valueScaleSettings.enabled })}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${valueScaleSettings.enabled ? 'bg-signal text-white' : 'bg-ink text-white/50 hover:text-white/80'}`}
                            >
                                {valueScaleSettings.enabled ? 'Overlay ON' : 'Overlay OFF'}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-[10px] text-white/60 font-bold uppercase block mb-1">Steps</span>
                                <select
                                    value={valueScaleSettings.steps}
                                    onChange={(e) => onValueScaleChange?.({ ...valueScaleSettings, steps: parseInt(e.target.value) })}
                                    className="w-full bg-ink border border-ink-muted rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-signal"
                                >
                                    <option value="5">5 Steps</option>
                                    <option value="7">7 Steps</option>
                                    <option value="9">9 Steps</option>
                                    <option value="11">11 Steps</option>
                                </select>
                            </div>
                            <div>
                                <span className="text-[10px] text-white/60 font-bold uppercase block mb-1">Mode</span>
                                <select
                                    value={valueScaleSettings.mode}
                                    onChange={(e) => onValueScaleChange?.({ ...valueScaleSettings, mode: e.target.value as ValueScaleMode })}
                                    className="w-full bg-ink border border-ink-muted rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-signal"
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
                    <div className="mt-2 p-4 bg-paper-elevated rounded-xl border border-ink-hairline space-y-4">
                        <p className="text-sm text-ink-muted mb-4">Explore the visual breakdown of the painting process.</p>
                        <ProcessSlider
                            value={breakdownValue}
                            onChange={onBreakdownChange}
                            activeStep={activeBreakdownStep}
                        />
                        <div className="p-3 bg-subsignal-muted rounded-xl border border-subsignal">
                            <p className="text-xs text-subsignal leading-relaxed">
                                <strong>Tip:</strong> Use these stages to plan your physical painting layers.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
