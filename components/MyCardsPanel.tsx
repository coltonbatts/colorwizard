'use client'

import { useState, useEffect } from 'react'
import { getCards, deleteCard } from '@/lib/colorCardStorage'
import { ColorCard } from '@/lib/types/colorCard'
import ColorCardModal from './ColorCardModal'

/**
 * Panel displaying saved color cards library.
 */
export default function MyCardsPanel() {
    const [cards, setCards] = useState<ColorCard[]>([])
    const [selectedCard, setSelectedCard] = useState<ColorCard | null>(null)

    // Load cards on mount
    useEffect(() => {
        setCards(getCards())
    }, [])

    const handleDelete = (id: string) => {
        if (confirm('Delete this card?')) {
            deleteCard(id)
            setCards(getCards())
        }
    }

    const handleCardSaved = () => {
        setCards(getCards())
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">My Cards</h2>
                <p className="text-xs text-gray-500 mt-1">
                    {cards.length} saved card{cards.length !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Cards Grid */}
            <div className="flex-1 overflow-y-auto p-4">
                {cards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                            <span className="text-2xl">🎨</span>
                        </div>
                        <p className="text-sm font-medium text-gray-600">No cards yet</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Sample a color and click &quot;Make Card&quot; to create one
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {cards.map((card) => (
                            <div
                                key={card.id}
                                className="group relative bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
                                onClick={() => setSelectedCard(card)}
                            >
                                {/* Color Swatch */}
                                <div
                                    className="w-full h-20"
                                    style={{ backgroundColor: card.color.hex }}
                                />
                                {/* Info */}
                                <div className="p-3">
                                    <p className="text-xs font-bold text-gray-900 leading-tight break-words">{card.name}</p>
                                    {card.colorName && card.colorName !== card.name && (
                                        <p className="text-[10px] text-studio font-medium opacity-60 mt-0.5 break-words">{card.colorName}</p>
                                    )}
                                    <p className="text-[10px] font-mono text-gray-400 mt-1">{card.color.hex}</p>
                                </div>
                                {/* Delete button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleDelete(card.id)
                                    }}
                                    className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-black/50 hover:bg-red-500 text-white/70 hover:text-white rounded-md opacity-0 group-hover:opacity-100 transition-all text-xs"
                                    title="Delete card"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* View Card Modal */}
            <ColorCardModal
                isOpen={!!selectedCard}
                onClose={() => setSelectedCard(null)}
                card={selectedCard}
                isNewCard={false}
                onCardSaved={handleCardSaved}
            />
        </div>
    )
}
