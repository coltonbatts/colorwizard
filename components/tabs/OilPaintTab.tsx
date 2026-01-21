'use client'

/**
 * OilPaintTab - Simplified oil paint recipe tab
 * Shows paint mixing recipe for the sampled color with Zorn palette + Phthalos
 */

import PaintRecipe from '../PaintRecipe'
import ErrorBoundary from '../ErrorBoundary'
import { RecipeSolverErrorFallback } from '../errors/RecipeSolverErrorFallback'
import { usePaintPaletteStore } from '@/lib/store/usePaintPaletteStore'
import { Palette } from '@/lib/types/palette'

interface OilPaintTabProps {
    sampledColor: {
        hex: string
        rgb: { r: number; g: number; b: number }
        hsl: { h: number; s: number; l: number }
    } | null
    activePalette?: Palette
}

export default function OilPaintTab({ sampledColor, activePalette }: OilPaintTabProps) {
    // Get paint palette selection
    const { getSelectedPaintIds, isUsingPaintPalette } = usePaintPaletteStore()
    const selectedPaintIds = getSelectedPaintIds()
    const hasPaintPalette = isUsingPaintPalette()

    if (!sampledColor) {
        return (
            <div className="tab-empty-state">
                <div className="tab-empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v20" />
                        <path d="m4.93 4.93 14.14 14.14" />
                        <path d="m4.93 19.07 14.14-14.14" />
                        <circle cx="12" cy="12" r="9" />
                    </svg>
                </div>
                <p className="tab-empty-title">Sample a color to see the recipe</p>
                <p className="tab-empty-subtitle">Tap anywhere on your image</p>
            </div>
        )
    }

    const { hex, hsl } = sampledColor

    return (
        <div className="tab-content-scroll">
            {/* Paint Recipe */}
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

            {/* Palette info footer */}
            <div className="tab-footer">
                <p className="tab-footer-text">
                    Using Zorn palette + Phthalos for optimal mixing
                </p>
            </div>
        </div>
    )
}
