'use client'

/**
 * OilMixTab - The "Oil Mix" tab content
 * Shows paint recipe and color wheel for mixing
 */

import { rgb as culoriRgb } from 'culori'
import PaintRecipe from '../PaintRecipe'
import PhotoshopColorWheel from '../PhotoshopColorWheel'
import { Palette } from '@/lib/types/palette'

interface OilMixTabProps {
    sampledColor: {
        hex: string
        rgb: { r: number; g: number; b: number }
        hsl: { h: number; s: number; l: number }
    } | null
    activePalette?: Palette
    onColorSelect?: (rgb: { r: number; g: number; b: number }) => void
}

export default function OilMixTab({ sampledColor, activePalette, onColorSelect }: OilMixTabProps) {
    if (!sampledColor) {
        return (
            <div className="h-full p-6 flex flex-col items-center justify-center bg-white text-studio-secondary">
                <div className="w-16 h-16 rounded-full border-2 border-gray-100 flex items-center justify-center mb-4">
                    <span className="text-2xl text-studio-dim">🎨</span>
                </div>
                <p className="text-center font-semibold text-studio">Sample a color first</p>
                <p className="text-sm text-studio-muted mt-2">Then see how to mix it</p>
            </div>
        )
    }

    const { hex, hsl } = sampledColor

    return (
        <div className="bg-white text-studio font-sans min-h-full p-4 lg:p-6 space-y-6">
            {/* Color Wheel - Compact */}
            <section>
                <h3 className="text-[10px] font-black text-studio-dim uppercase tracking-widest mb-3">Color Position</h3>
                <PhotoshopColorWheel
                    color={hex}
                    onChange={(newHex) => {
                        if (onColorSelect) {
                            const parsed = culoriRgb(newHex)
                            if (parsed) {
                                onColorSelect({
                                    r: Math.round(parsed.r * 255),
                                    g: Math.round(parsed.g * 255),
                                    b: Math.round(parsed.b * 255)
                                })
                            }
                        }
                    }}
                />
            </section>

            {/* Paint Recipe */}
            <section>
                <PaintRecipe hsl={hsl} targetHex={hex} activePalette={activePalette} />
            </section>
        </div>
    )
}
