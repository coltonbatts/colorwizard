import { findClosestDMCColors } from './dmcFloss'
import { generatePaintRecipe, HEURISTIC_WEIGHT_MAP } from './colorMixer'
import { solveRecipe, SolveOptions } from './paint/solveRecipe'
import { getLuminance } from './paintingMath'
import {
    ColorCard,
    ColorCardRecipeSnapshot,
    ColorRecipeIngredient,
    PaintCardMatch,
} from './types/colorCard'
import type { CardPriority, CardStatus } from './cardMeta'
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
    solveOptions?: SolveOptions
    recipeLabel?: string
    project?: string
    tags?: string[]
    status?: CardStatus
    priority?: CardPriority
    notes?: string
}

export const HEURISTIC_PIGMENT_HEX: Record<string, string> = {
    'Titanium White': '#FDFDFD',
    'Ivory Black': '#0B0B0B',
    'Yellow Ochre': '#CC8E35',
    'Cadmium Red': '#E52B21',
    'Phthalo Green': '#123524',
    'Phthalo Blue': '#0F2E53',
}

function getRecipeSourceLabel(options: CreateColorCardOptions): string {
    if (options.recipeLabel?.trim()) {
        return options.recipeLabel.trim()
    }

    if (options.solveOptions?.useCatalog) {
        const count = options.solveOptions.paintIds?.length
        return count ? `Paint library (${count})` : 'Paint library'
    }

    if (options.solveOptions?.paletteColorIds?.length) {
        return `Active palette (${options.solveOptions.paletteColorIds.length})`
    }

    return 'Heuristic mix'
}

export function mapHeuristicRecipeIngredients(
    recipe: ReturnType<typeof generatePaintRecipe>,
): ColorRecipeIngredient[] {
    return recipe.colors
        .map((ingredient) => ({
            name: ingredient.name,
            amount: ingredient.amount,
            hex: HEURISTIC_PIGMENT_HEX[ingredient.name] ?? '#888888',
            ratio: Math.round((HEURISTIC_WEIGHT_MAP[ingredient.amount] ?? 0) * 100),
        }))
        .filter((ingredient) => ingredient.ratio > 0)
}

function mapPaintMatchesFromIngredients(
    ingredients: Array<{ pigment?: { name: string; hex: string }; name?: string; hex?: string; amount?: string; weight?: number }>,
    sourceLabel: string,
): PaintCardMatch[] {
    return ingredients
        .map((ingredient) => {
            const name = ingredient.pigment?.name ?? ingredient.name ?? 'Unknown pigment'
            const hex = ingredient.pigment?.hex ?? ingredient.hex ?? '#888888'
            const ratio = typeof ingredient.weight === 'number'
                ? Math.round(ingredient.weight * 100)
                : Math.round((HEURISTIC_WEIGHT_MAP[ingredient.amount ?? ''] ?? 0) * 100)

            return {
                name,
                brand: sourceLabel,
                hex,
                ratio,
            }
        })
        .filter((ingredient) => ingredient.ratio > 0)
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
        dmcMatches: await findClosestDMCColors(sampledColor.rgb, 5),
    }
}

export async function createColorCard(
    sampledColor: SampledColorInput,
    options: CreateColorCardOptions
): Promise<ColorCard> {
    const now = Date.now()
    const heuristicRecipe = generatePaintRecipe(sampledColor.hsl)
    const sourceLabel = getRecipeSourceLabel(options)

    let solvedRecipe: Awaited<ReturnType<typeof solveRecipe>> | null = null
    let spectralRecipe: ColorCardRecipeSnapshot['spectral'] = null
    try {
        solvedRecipe = await solveRecipe(sampledColor.hex, options.solveOptions)
        spectralRecipe = {
            predictedHex: solvedRecipe.predictedHex,
            error: solvedRecipe.error,
            matchQuality: solvedRecipe.matchQuality,
            steps: solvedRecipe.steps,
        }
    } catch (error) {
        console.error('Failed to solve spectral recipe for color card:', error)
    }

    const paintMatches = solvedRecipe
        ? mapPaintMatchesFromIngredients(solvedRecipe.ingredients, sourceLabel)
        : mapPaintMatchesFromIngredients(
            heuristicRecipe.colors.map((ingredient) => ({
                name: ingredient.name,
                amount: ingredient.amount,
                hex: HEURISTIC_PIGMENT_HEX[ingredient.name] ?? '#888888',
                weight: HEURISTIC_WEIGHT_MAP[ingredient.amount] ?? 0,
            })),
            'Heuristic mix',
        )

    return {
        id: crypto.randomUUID(),
        name: options.name,
        updatedAt: now,
        createdAt: now,
        project: options.project?.trim() || undefined,
        tags: options.tags?.length ? options.tags : [],
        status: options.status ?? 'idea',
        priority: options.priority ?? 'medium',
        notes: options.notes?.trim() || undefined,
        color: {
            hex: sampledColor.hex,
            rgb: sampledColor.rgb,
            hsl: sampledColor.hsl,
            luminance: getLuminance(sampledColor.rgb.r, sampledColor.rgb.g, sampledColor.rgb.b) / 100,
            valueStep: options.valueStep,
            colorName: options.colorName,
        },
        recipe: {
            sourceLabel,
            summary: heuristicRecipe.description,
            ingredients: mapHeuristicRecipeIngredients(heuristicRecipe),
            steps: heuristicRecipe.steps,
            notes: heuristicRecipe.notes,
            spectral: spectralRecipe,
        },
        matches: {
            dmc: await findClosestDMCColors(sampledColor.rgb, 5),
            paints: paintMatches,
        },
    }
}
