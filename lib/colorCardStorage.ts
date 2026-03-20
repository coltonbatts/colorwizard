import { generatePaintRecipe } from './colorMixer'
import { findClosestDMCColors } from './dmcFloss'
import { ColorCard, ColorCardRecipeSnapshot, PaintCardMatch } from './types/colorCard'
import { mapHeuristicRecipeIngredients } from './colorArtifacts'

const STORAGE_KEY = 'colorwizard.cardDeck.v2'
const LEGACY_STORAGE_KEY = 'colorwizard.cards.v1'

interface CardDeckRecord {
    version: 2
    cards: ColorCard[]
}

type LegacyColorCard = {
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
    mixingSteps?: string[]
    dmcMatches?: ReturnType<typeof findClosestDMCColors>
    paintMatches?: PaintCardMatch[]
}

function isColorCard(value: unknown): value is ColorCard {
    return Boolean(
        value &&
        typeof value === 'object' &&
        'id' in value &&
        'name' in value &&
        'color' in value &&
        'recipe' in value &&
        'matches' in value,
    )
}

function safeParse<T>(data: string | null): T | null {
    if (!data) return null
    try {
        return JSON.parse(data) as T
    } catch {
        return null
    }
}

function normalizeLegacyCard(card: LegacyColorCard): ColorCard {
    const heuristicRecipe = generatePaintRecipe(card.color.hsl)
    const dmcMatches = card.dmcMatches ?? findClosestDMCColors(card.color.rgb, 5)
    const paintMatches = card.paintMatches?.length
        ? card.paintMatches
        : mapHeuristicRecipeIngredients(heuristicRecipe).map((ingredient) => ({
            name: ingredient.name,
            brand: 'Heuristic mix',
            hex: ingredient.hex,
            ratio: ingredient.ratio,
        }))

    const recipe: ColorCardRecipeSnapshot = {
        sourceLabel: 'Legacy card',
        summary: heuristicRecipe.description,
        ingredients: mapHeuristicRecipeIngredients(heuristicRecipe),
        steps: card.mixingSteps?.length ? card.mixingSteps : heuristicRecipe.steps,
        notes: heuristicRecipe.notes,
        spectral: null,
    }

    return {
        id: card.id,
        name: card.name,
        createdAt: card.createdAt,
        updatedAt: card.createdAt,
        color: {
            hex: card.color.hex,
            rgb: card.color.rgb,
            hsl: card.color.hsl,
            luminance: card.color.luminance,
            valueStep: card.valueStep,
            colorName: card.colorName,
        },
        recipe,
        matches: {
            dmc: dmcMatches,
            paints: paintMatches,
        },
    }
}

function normalizeCard(card: unknown): ColorCard | null {
    if (!card || typeof card !== 'object') return null
    if (isColorCard(card)) {
        return {
            ...card,
            updatedAt: card.updatedAt ?? card.createdAt,
        }
    }

    const legacyCard = card as Partial<LegacyColorCard>
    if (
        typeof legacyCard.id === 'string' &&
        typeof legacyCard.name === 'string' &&
        typeof legacyCard.createdAt === 'number' &&
        legacyCard.color &&
        typeof legacyCard.color.hex === 'string' &&
        legacyCard.color.rgb &&
        legacyCard.color.hsl &&
        typeof legacyCard.color.luminance === 'number'
    ) {
        return normalizeLegacyCard(legacyCard as LegacyColorCard)
    }

    return null
}

function readStoredDeck(): CardDeckRecord | null {
    const next = safeParse<CardDeckRecord>(localStorage.getItem(STORAGE_KEY))
    if (next && next.version === 2 && Array.isArray(next.cards)) {
        return {
            version: 2,
            cards: next.cards.map(normalizeCard).filter((card): card is ColorCard => Boolean(card)),
        }
    }

    const legacy = safeParse<unknown[]>(localStorage.getItem(LEGACY_STORAGE_KEY))
    if (legacy) {
        const cards = legacy
            .map(normalizeCard)
            .filter((card): card is ColorCard => Boolean(card))
        persistDeck(cards)
        return { version: 2, cards }
    }

    return null
}

function persistDeck(cards: ColorCard[]): void {
    const record: CardDeckRecord = {
        version: 2,
        cards,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
}

/**
 * Get all saved color cards from localStorage.
 */
export function getCards(): ColorCard[] {
    if (typeof window === 'undefined') return []
    try {
        return readStoredDeck()?.cards ?? []
    } catch {
        console.error('Failed to load color cards from localStorage')
        return []
    }
}

/**
 * Save a new color card.
 */
export function saveCard(card: ColorCard): void {
    const cards = getCards()
    const nextCard = {
        ...card,
        updatedAt: card.updatedAt ?? Date.now(),
    }

    cards.unshift(nextCard)
    persistDeck(cards)
}

/**
 * Update an existing card's name.
 */
export function updateCardName(id: string, name: string): void {
    const cards = getCards()
    const idx = cards.findIndex((c) => c.id === id)
    if (idx !== -1) {
        cards[idx] = {
            ...cards[idx],
            name,
            updatedAt: Date.now(),
        }
        persistDeck(cards)
    }
}

/**
 * Delete a card by ID.
 */
export function deleteCard(id: string): void {
    const cards = getCards().filter((c) => c.id !== id)
    persistDeck(cards)
}

/**
 * Get a single card by ID.
 */
export function getCardById(id: string): ColorCard | undefined {
    return getCards().find((card) => card.id === id)
}
