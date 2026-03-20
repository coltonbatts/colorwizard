import { DMCMatch } from '../dmcFloss'
import { SpectralRecipe } from '../spectral/types'
import type { CardPriority, CardStatus } from '../cardMeta'

/**
 * Simplified paint match for card display
 */
export interface PaintCardMatch {
    name: string
    brand: string
    hex: string
    ratio: number
}

export interface ColorRecipeIngredient {
    name: string
    amount: string
    hex: string
    ratio: number
}

export interface ColorCardRecipeSnapshot {
    sourceLabel: string
    summary: string
    ingredients: ColorRecipeIngredient[]
    steps: string[]
    notes?: string
    spectral?: {
        predictedHex: string
        error: number
        matchQuality: SpectralRecipe['matchQuality']
        steps: string[]
    } | null
}

export interface ColorCardMatchSet {
    dmc: DMCMatch[]
    paints: PaintCardMatch[]
}

/**
 * Color Wizard Card - a saveable, exportable color reference card
 */
export interface ColorCard {
    id: string
    name: string
    createdAt: number
    updatedAt: number
    project?: string
    tags?: string[]
    status?: CardStatus
    priority?: CardPriority
    notes?: string
    color: {
        hex: string
        rgb: { r: number; g: number; b: number }
        hsl: { h: number; s: number; l: number }
        luminance: number
        valueStep?: number
        colorName?: string
    }
    recipe: ColorCardRecipeSnapshot
    matches: ColorCardMatchSet
}
