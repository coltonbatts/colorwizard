import { findClosestDMCColors } from './dmcFloss'
import { generatePaintRecipe } from './colorMixer'
import { solveRecipe, SolveOptions } from './paint/solveRecipe'
import { getLuminance } from './paintingMath'
import { ColorCard } from './types/colorCard'
import { PinnedColor } from './types/pinnedColor'

interface SampledColorInput {
    hex: string
    rgb: { r: number; g: number; b: number }
    hsl: { h: number; s: number; l: number }
}

interface CreatePinnedColorOptions {
    label: string
    solveOptions?: SolveOptions
}

interface CreateColorCardOptions {
    name: string
    colorName?: string
    valueStep?: number
}

export async function createPinnedColor(
    sampledColor: SampledColorInput,
    { label, solveOptions }: CreatePinnedColorOptions
): Promise<PinnedColor> {
    const fallbackRecipe = generatePaintRecipe(sampledColor.hsl)

    let spectralRecipe: PinnedColor['spectralRecipe'] = null
    try {
        spectralRecipe = await solveRecipe(sampledColor.hex, solveOptions)
    } catch (error) {
        console.error('Failed to solve spectral recipe for pinned color:', error)
    }

    return {
        id: crypto.randomUUID(),
        hex: sampledColor.hex,
        rgb: sampledColor.rgb,
        hsl: sampledColor.hsl,
        label,
        timestamp: Date.now(),
        spectralRecipe,
        fallbackRecipe,
        dmcMatches: findClosestDMCColors(sampledColor.rgb, 5),
    }
}

export function createColorCard(
    sampledColor: SampledColorInput,
    { name, colorName, valueStep }: CreateColorCardOptions
): ColorCard {
    return {
        id: crypto.randomUUID(),
        name,
        colorName,
        createdAt: Date.now(),
        color: {
            hex: sampledColor.hex,
            rgb: sampledColor.rgb,
            hsl: sampledColor.hsl,
            luminance: getLuminance(sampledColor.rgb.r, sampledColor.rgb.g, sampledColor.rgb.b) / 100,
        },
        valueStep,
        dmcMatches: findClosestDMCColors(sampledColor.rgb, 5),
        paintMatches: [],
    }
}
