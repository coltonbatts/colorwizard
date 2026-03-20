'use client'

import { useEffect, useMemo, useState } from 'react'
import ColorCardModal from './ColorCardModal'
import { deleteCard, getCards } from '@/lib/colorCardStorage'
import { ColorCard } from '@/lib/types/colorCard'

interface ColorDeckPanelProps {
    sampledColor: {
        hex: string
        rgb: { r: number; g: number; b: number }
        hsl: { h: number; s: number; l: number }
        valueMetadata?: {
            y: number
            step: number
            range: [number, number]
            percentile: number
        }
    } | null
    activePaletteName?: string
    onGoToSample: () => void
}

function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString()
}

export default function ColorDeckPanel({
    sampledColor,
    activePaletteName,
    onGoToSample,
}: ColorDeckPanelProps) {
    const [cards, setCards] = useState<ColorCard[]>([])
    const [selectedCard, setSelectedCard] = useState<ColorCard | null>(null)

    const refreshCards = () => {
        setCards(getCards().sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt)))
    }

    useEffect(() => {
        refreshCards()

        const handleStorage = (event: StorageEvent) => {
            if (event.key === 'colorwizard.cardDeck.v2' || event.key === 'colorwizard.cards.v1') {
                refreshCards()
            }
        }

        window.addEventListener('storage', handleStorage)
        return () => window.removeEventListener('storage', handleStorage)
    }, [])

    const deckStats = useMemo(() => {
        return {
            recipeReady: cards.filter((card) => card.matches.paints.length > 0).length,
            spectralReady: cards.filter((card) => card.recipe.spectral).length,
        }
    }, [cards])

    const handleDelete = (id: string) => {
        if (!window.confirm('Remove this card from the deck?')) {
            return
        }

        deleteCard(id)
        refreshCards()

        if (selectedCard?.id === id) {
            setSelectedCard(null)
        }
    }

    return (
        <div className="flex h-full min-h-0 flex-col bg-paper-elevated text-ink">
            <div className="border-b border-ink-hairline bg-paper-elevated/90 p-4 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-ink-faint">
                            Saved Deck
                        </p>
                        <h2 className="mt-1 text-lg font-black text-ink">Card Deck</h2>
                        <p className="mt-1 text-xs text-ink-muted">
                            Local records of sampled colors, recipes, and matches.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-ink-hairline bg-paper-recessed px-3 py-2 text-right">
                        <div className="text-lg font-black text-ink">{cards.length}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                            saved
                        </div>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-widest">
                    <div className="rounded-xl border border-ink-hairline bg-paper-recessed px-3 py-2 text-ink-muted">
                        {deckStats.recipeReady} recipe-ready
                    </div>
                    <div className="rounded-xl border border-ink-hairline bg-paper-recessed px-3 py-2 text-ink-muted">
                        {deckStats.spectralReady} spectral matches
                    </div>
                </div>
            </div>

            {sampledColor && (
                <div className="border-b border-ink-hairline bg-gradient-to-br from-paper-recessed to-paper p-4">
                    <div className="flex items-center gap-4">
                        <div
                            className="h-16 w-16 shrink-0 rounded-2xl border border-ink-hairline shadow-inner"
                            style={{ backgroundColor: sampledColor.hex }}
                        />
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-signal">
                                Current working color
                            </p>
                            <h3 className="truncate text-xl font-black text-ink">{sampledColor.hex}</h3>
                            <p className="text-xs text-ink-muted">
                                {activePaletteName || 'Use the current sample to create a new card.'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onGoToSample}
                            className="rounded-xl bg-ink px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-ink-secondary"
                        >
                            Back to sample
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto p-4">
                {cards.length === 0 ? (
                    <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-ink-hairline bg-paper-recessed px-6 py-10 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-ink-hairline bg-paper-elevated text-2xl">
                            🎴
                        </div>
                        <h3 className="text-lg font-black text-ink">No cards in deck yet</h3>
                        <p className="mt-2 max-w-sm text-sm text-ink-muted">
                            Sample a color, save it to the deck, and it will show up here with its paint recipe and match data.
                        </p>
                        <button
                            type="button"
                            onClick={onGoToSample}
                            className="mt-5 rounded-xl bg-signal px-4 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-signal-hover"
                        >
                            Save your first card
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-2">
                        {cards.map((card) => (
                            <article
                                key={card.id}
                                className="group overflow-hidden rounded-3xl border border-ink-hairline bg-paper-elevated shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                            >
                                <button
                                    type="button"
                                    onClick={() => setSelectedCard(card)}
                                    className="block w-full text-left"
                                >
                                    <div className="relative h-28 overflow-hidden" style={{ backgroundColor: card.color.hex }}>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                                        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 text-white">
                                            <div className="min-w-0">
                                                <div className="truncate text-lg font-black">{card.name}</div>
                                                {card.color.colorName && card.color.colorName !== card.name && (
                                                    <div className="truncate text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">
                                                        {card.color.colorName}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="rounded-full border border-white/20 bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
                                                {card.recipe.spectral?.matchQuality || 'Heuristic'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 p-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-ink">{card.recipe.summary}</p>
                                            <p className="max-h-10 overflow-hidden text-xs leading-5 text-ink-muted">
                                                {card.recipe.sourceLabel}
                                                {card.recipe.notes ? ` • ${card.recipe.notes}` : ''}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <span className="rounded-full border border-ink-hairline bg-paper-recessed px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
                                                {card.matches.dmc.length} DMC
                                            </span>
                                            <span className="rounded-full border border-ink-hairline bg-paper-recessed px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
                                                {card.matches.paints.length} paint matches
                                            </span>
                                            {card.color.valueStep !== undefined && (
                                                <span className="rounded-full border border-ink-hairline bg-paper-recessed px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
                                                    Step {card.color.valueStep}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between gap-3 border-t border-ink-hairline pt-3">
                                            <div className="min-w-0">
                                                <div className="truncate font-mono text-xs font-bold text-ink">{card.color.hex}</div>
                                                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-faint">
                                                    Saved {formatDate(card.updatedAt || card.createdAt)}
                                                </div>
                                            </div>
                                            <div className="rounded-xl bg-ink px-3 py-2 text-xs font-bold text-white transition-colors group-hover:bg-signal">
                                                Open card
                                            </div>
                                        </div>
                                    </div>
                                </button>

                                <div className="flex items-center justify-end gap-2 border-t border-ink-hairline bg-paper-recessed px-3 py-2">
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            setSelectedCard(card)
                                        }}
                                        className="rounded-lg border border-ink-hairline bg-paper-elevated px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted transition-colors hover:text-ink"
                                    >
                                        View
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            handleDelete(card.id)
                                        }}
                                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-red-600 transition-colors hover:bg-red-100"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>

            <ColorCardModal
                isOpen={!!selectedCard}
                onClose={() => setSelectedCard(null)}
                card={selectedCard}
                isNewCard={false}
                onCardSaved={refreshCards}
            />
        </div>
    )
}
