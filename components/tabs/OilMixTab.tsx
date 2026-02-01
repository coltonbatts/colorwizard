'use client'

/**
 * OilMixTab - The "Oil Mix" tab content
 * Shows paint recipe and color wheel for mixing
 */

import { rgb as culoriRgb } from 'culori'
import PaintRecipe from '../PaintRecipe'
import PhotoshopColorWheel from '../PhotoshopColorWheel'
import { Palette } from '@/lib/types/palette'
import ErrorBoundary from '../ErrorBoundary'
import { RecipeSolverErrorFallback } from '../errors/RecipeSolverErrorFallback'
import { usePaintPaletteStore } from '@/lib/store/usePaintPaletteStore'
import AISuggestions from '../AISuggestions'
import ColorHarmonies from '../ColorHarmonies'

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
    // Get paint palette selection
    const { getSelectedPaintIds, isUsingPaintPalette } = usePaintPaletteStore()
    const selectedPaintIds = getSelectedPaintIds()
    const hasPaintPalette = isUsingPaintPalette()

    if (!sampledColor) {
        return (
            <div className="h-full p-6 flex flex-col items-center justify-center bg-paper-elevated text-ink-secondary">
                <div className="w-16 h-16 rounded-full border-2 border-ink-hairline flex items-center justify-center mb-4">
                    <span className="text-2xl text-ink-faint">🎨</span>
                </div>
                <p className="text-center font-semibold text-ink">Sample a color first</p>
                <p className="text-sm text-ink-muted mt-2">Then see how to mix it</p>
            </div>
        )
    }

    const { hex, hsl } = sampledColor

    return (
        <div className="bg-paper-elevated text-ink font-sans min-h-full p-4 lg:p-6 space-y-6">
            {/* Color Wheel - Compact */}
            <section>
                <h3 className="text-[10px] font-black text-ink-faint uppercase tracking-widest mb-3">Color Position</h3>
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

            {/* AI Suggestions & Harmonies */}
            <section className="space-y-8">
                <AISuggestions rgb={sampledColor.rgb} />

                <div className="pt-4 border-t border-ink-hairline">
                    <h3 className="text-[10px] font-black text-ink-faint uppercase tracking-widest mb-4">
                        Standard Harmonies
                    </h3>
                    <ColorHarmonies
                        rgb={sampledColor.rgb}
                        onColorSelect={onColorSelect || (() => { })}
                    />
                </div>
            </section>

            {/* Paint Recipe - Wrapped in ErrorBoundary */}
            <section>
                <ErrorBoundary
                    fallback={({ error, resetError }) => (
                        <RecipeSolverErrorFallback
                            error={error}
                            resetError={resetError}
                            targetHex={hex}
                        />
                    )}
                >
                    <PaintRecipe
                        hsl={hsl}
                        targetHex={hex}
                        activePalette={activePalette}
                        useCatalog={hasPaintPalette}
                        paintIds={hasPaintPalette ? selectedPaintIds : undefined}
                    />
                </ErrorBoundary>
            </section>
        </div>
    )
}
