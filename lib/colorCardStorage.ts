import { ColorCard } from './types/colorCard'

const STORAGE_KEY = 'colorwizard.cards.v1'

/**
 * Get all saved color cards from localStorage
 */
export function getCards(): ColorCard[] {
    if (typeof window === 'undefined') return []
    try {
        const data = localStorage.getItem(STORAGE_KEY)
        return data ? JSON.parse(data) : []
    } catch {
        console.error('Failed to load color cards from localStorage')
        return []
    }
}

/**
 * Save a new color card
 */
export function saveCard(card: ColorCard): void {
    const cards = getCards()
    cards.unshift(card) // Add to beginning
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
}

/**
 * Update an existing card's name
 */
export function updateCardName(id: string, name: string): void {
    const cards = getCards()
    const idx = cards.findIndex(c => c.id === id)
    if (idx !== -1) {
        cards[idx].name = name
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
    }
}

/**
 * Delete a card by ID
 */
export function deleteCard(id: string): void {
    const cards = getCards().filter(c => c.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
}

/**
 * Get a single card by ID
 */
export function getCardById(id: string): ColorCard | undefined {
    return getCards().find(c => c.id === id)
}
