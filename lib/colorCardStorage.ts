import { generatePaintRecipe } from './colorMixer'
import { findClosestDMCColors } from './dmcFloss'
import { ColorCard, ColorCardRecipeSnapshot, PaintCardMatch } from './types/colorCard'
import { mapHeuristicRecipeIngredients } from './colorArtifacts'
import { parseCardTags } from './cardMeta'
import type { CardPriority, CardStatus } from './cardMeta'

export const CARD_DECK_STORAGE_KEYS = {
    current: 'colorwizard.cardDeck.v3',
    legacy: 'colorwizard.cardDeck.v2',
    ancient: 'colorwizard.cards.v1',
} as const

const STORAGE_KEY = CARD_DECK_STORAGE_KEYS.current
const LEGACY_STORAGE_KEY = 'colorwizard.cards.v1'

interface CardDeckRecord {
    version: 3
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
    dmcMatches?: Awaited<ReturnType<typeof findClosestDMCColors>>
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

function normalizeCardTagsValue(tags: unknown): string[] {
    if (!Array.isArray(tags)) return []

    return parseCardTags(
        tags
            .filter((tag): tag is string => typeof tag === 'string')
            .join(', '),
    )
}

function normalizeStatus(value: unknown): CardStatus {
    return value === 'in-progress' || value === 'blocked' || value === 'done' ? value : 'idea'
}

function normalizePriority(value: unknown): CardPriority {
    return value === 'low' || value === 'high' || value === 'urgent' ? value : 'medium'
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
    const dmcMatches = card.dmcMatches ?? []
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
        project: undefined,
        tags: [],
        status: 'idea',
        priority: 'medium',
        notes: undefined,
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
        const typed = card as ColorCard
        return {
            ...typed,
            updatedAt: typed.updatedAt ?? typed.createdAt,
            project: typed.project?.trim() || undefined,
            tags: normalizeCardTagsValue(typed.tags),
            status: normalizeStatus(typed.status),
            priority: normalizePriority(typed.priority),
            notes: typed.notes?.trim() || undefined,
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
    if (next && next.version === 3 && Array.isArray(next.cards)) {
        return {
            version: 3,
            cards: next.cards.map(normalizeCard).filter((card): card is ColorCard => Boolean(card)),
        }
    }

    const v2 = safeParse<{ version: number; cards?: unknown[] }>(localStorage.getItem(CARD_DECK_STORAGE_KEYS.legacy))
    if (v2 && Array.isArray(v2.cards)) {
        const cards = v2.cards
            .map(normalizeCard)
            .filter((card): card is ColorCard => Boolean(card))
        persistDeck(cards)
        return { version: 3, cards }
    }

    const legacy = safeParse<unknown[]>(localStorage.getItem(LEGACY_STORAGE_KEY))
    if (legacy) {
        const cards = legacy
            .map(normalizeCard)
            .filter((card): card is ColorCard => Boolean(card))
        persistDeck(cards)
        return { version: 3, cards }
    }

    return null
}

function persistDeck(cards: ColorCard[]): void {
    const record: CardDeckRecord = {
        version: 3,
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
export function saveCard(card: ColorCard): ColorCard {
    const cards = getCards()
    const nextCard = {
        ...card,
        updatedAt: card.updatedAt ?? Date.now(),
    }

    cards.unshift(nextCard)
    persistDeck(cards)
    return nextCard
}

/**
 * Update an existing card with the provided fields.
 */
export function updateCard(id: string, updates: Partial<Omit<ColorCard, 'id' | 'createdAt' | 'updatedAt'>>): ColorCard | null {
    const cards = getCards()
    const idx = cards.findIndex((c) => c.id === id)
    if (idx !== -1) {
        cards[idx] = {
            ...cards[idx],
            ...updates,
            updatedAt: Date.now(),
        }
        persistDeck(cards)
        return cards[idx]
    }

    return null
}

/**
 * Update an existing card's name.
 */
export function updateCardName(id: string, name: string): ColorCard | null {
    return updateCard(id, { name })
}

/**
 * Delete a card by ID.
 */
export function deleteCard(id: string): boolean {
    const cards = getCards().filter((c) => c.id !== id)
    persistDeck(cards)
    return true
}

/**
 * Duplicate an existing card, preserving metadata and content.
 */
export function duplicateCard(card: ColorCard, overrides: Partial<Omit<ColorCard, 'id' | 'createdAt' | 'updatedAt'>> = {}): ColorCard {
    const copy: ColorCard = {
        ...card,
        ...overrides,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
    }

    saveCard(copy)
    return copy
}

/**
 * Get a single card by ID.
 */
export function getCardById(id: string): ColorCard | undefined {
    return getCards().find((card) => card.id === id)
}
