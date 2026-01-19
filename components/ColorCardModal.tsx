'use client'

import { useState, useRef, useEffect } from 'react'
import { toPng } from 'html-to-image'
import ColorCardPreview from './ColorCardPreview'
import { ColorCard } from '@/lib/types/colorCard'
import { saveCard, updateCardName } from '@/lib/colorCardStorage'

interface ColorCardModalProps {
    isOpen: boolean
    onClose: () => void
    card: ColorCard | null
    isNewCard?: boolean
    onCardSaved?: () => void
}

/**
 * Modal for previewing, editing, and exporting color cards.
 */
export default function ColorCardModal({
    isOpen,
    onClose,
    card,
    isNewCard = false,
    onCardSaved,
}: ColorCardModalProps) {
    const [cardName, setCardName] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)

    // Sync name when card changes
    useEffect(() => {
        if (card) {
            setCardName(card.name)
        }
    }, [card])

    if (!isOpen || !card) return null

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const updatedCard = { ...card, name: cardName.trim() || `Color ${card.color.hex}` }
            if (isNewCard) {
                saveCard(updatedCard)
            } else {
                updateCardName(card.id, updatedCard.name)
            }
            onCardSaved?.()
            onClose()
        } catch (e) {
            console.error('Failed to save card:', e)
        } finally {
            setIsSaving(false)
        }
    }

    const handleExport = async () => {
        if (!cardRef.current) return
        setIsExporting(true)
        try {
            const dataUrl = await toPng(cardRef.current, {
                pixelRatio: 3, // 3x for crisp export
                backgroundColor: '#ffffff',
            })
            // Sanitize filename
            const safeName = cardName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                || 'color'
            const link = document.createElement('a')
            link.download = `colorwizard-card-${safeName}.png`
            link.href = dataUrl
            link.click()
        } catch (e) {
            console.error('Failed to export card:', e)
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">
                        {isNewCard ? 'Create Color Card' : 'View Color Card'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Card Name Input */}
                <div className="px-4 pt-4">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                        Card Name
                    </label>
                    <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="Enter card name..."
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>

                {/* Card Preview */}
                <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
                    <div className="transform scale-[0.85] origin-top">
                        <ColorCardPreview ref={cardRef} card={{ ...card, name: cardName || card.name }} />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-4 border-t border-gray-100 bg-gray-50">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Saving...' : isNewCard ? 'Save Card' : 'Update Name'}
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex-1 px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isExporting ? 'Exporting...' : 'Download PNG'}
                    </button>
                </div>
            </div>
        </div>
    )
}
