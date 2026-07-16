'use client'

import { getColorHarmonies, ColorWheelSegment, RGB } from '@/lib/colorTheory'
import { getContrastColor } from '@/lib/paintingMath'

interface ColorHarmoniesProps {
    rgb: RGB
    onColorSelect: (rgb: RGB) => void
}

export default function ColorHarmonies({ rgb, onColorSelect }: ColorHarmoniesProps) {
    const harmonies = getColorHarmonies(rgb)

    const HarmonyItem = ({ label, segments }: { label: string, segments: ColorWheelSegment | ColorWheelSegment[] }) => {
        const items = Array.isArray(segments) ? segments : [segments]

        return (
            <div className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{label}</h4>
                <div className="grid grid-cols-2 gap-2">
                    {items.map((segment, i) => {
                        // Convert hex to RGB object for onColorSelect
                        const hex = segment.color
                        const r = parseInt(hex.slice(1, 3), 16)
                        const g = parseInt(hex.slice(3, 5), 16)
                        const b = parseInt(hex.slice(5, 7), 16)
                        const contrast = getContrastColor(hex)

                        return (
                            <button
                                type="button"
                                key={`${label}-${i}`}
                                onClick={() => onColorSelect({ r, g, b })}
                                className="group relative flex flex-col items-center justify-center rounded-lg border border-linen bg-paper-elevated p-2.5 text-left transition-colors hover:border-ink-muted hover:bg-paper"
                            >
                                <div
                                    className="mb-2 flex h-12 w-full items-center justify-center rounded-md border border-black/10 shadow-inner"
                                    style={{ backgroundColor: hex }}
                                >
                                    <span
                                        className="font-mono text-[11px] font-bold opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                                        style={{ color: contrast }}
                                    >
                                        {hex}
                                    </span>
                                </div>
                                <div className="w-full">
                                    <span className="block truncate text-xs font-semibold text-ink">{segment.name}</span>
                                    <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{segment.type}</span>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="mb-4 flex items-center gap-2">
                <div className={`rounded-sm border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${harmonies.temperature === 'warm' ? 'border-[#d77b5c]/30 bg-[#d77b5c]/10 text-[#9f4e35]' :
                        harmonies.temperature === 'cool' ? 'border-[#697d9d]/30 bg-[#697d9d]/10 text-[#4b5f7f]' :
                            'border-linen-strong bg-paper-recessed text-ink-muted'
                    }`}>
                    {harmonies.temperature}
                </div>
                <span className="text-[11px] font-medium text-ink-muted">
                    Based on 12-segment RYB wheel
                </span>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <HarmonyItem label="Complementary" segments={harmonies.complementary} />
                <HarmonyItem label="Split-Complementary" segments={harmonies.splitComplementary} />
                <HarmonyItem label="Analogous" segments={harmonies.analogous} />
                <HarmonyItem label="Triadic" segments={harmonies.triadic} />
            </div>

            <div className="border-t border-ink-hairline pt-4">
                <p className="text-[11px] leading-relaxed text-ink-muted">
                    <span className="font-semibold text-ink-secondary">Studio note:</span> Use these to find colors for shadows, highlights, or focal points that naturally coordinate with your subject.
                </p>
            </div>
        </div>
    )
}
