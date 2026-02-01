import { DMCMatch } from '../dmcFloss'

/**
 * Simplified paint match for card display
 */
export interface PaintCardMatch {
    name: string
    brand: string
    hex: string
    ratio: number
}

/**
 * Color Wizard Card - a saveable, exportable color reference card
 */
export interface ColorCard {
    id: string
    name: string
    createdAt: number
    color: {
        hex: string
        rgb: { r: number; g: number; b: number }
        hsl: { h: number; s: number; l: number }
        luminance: number
    }
    valueStep?: number
    colorName?: string
    dmcMatches: DMCMatch[]
    paintMatches: PaintCardMatch[]
}
