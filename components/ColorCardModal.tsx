'use client'

import { useState, useRef, useEffect, useId } from 'react'
import { toPng } from 'html-to-image'
import ColorCardPreview from './ColorCardPreview'
import { ColorCard } from '@/lib/types/colorCard'
import { saveCard, updateCardName } from '@/lib/colorCardStorage'
import OverlaySurface from '@/components/ui/Overlay'

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
    const titleId = useId()
    const inputId = useId()
    const [cardName, setCardName] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)
    const nameInputRef = useRef<HTMLInputElement>(null)

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
        <OverlaySurface
            isOpen={isOpen}
            onClose={onClose}
            preset="dialog"
            ariaLabelledBy={titleId}
            initialFocusRef={nameInputRef}
            rootClassName="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            backdropClassName="absolute inset-0 bg-black/60 backdrop-blur-sm"
            panelClassName="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl outline-none"
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
                <div>
                    <h2 id={titleId} className="text-lg font-bold text-gray-900">
                        {isNewCard ? 'Save to Deck' : 'Card Detail'}
                    </h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gray-400">
                        Local deck record
                    </p>
                </div>
                <button
                    onClick={onClose}
                    type="button"
                    aria-label="Close color card modal"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                    ✕
                </button>
            </div>

            {/* Card Name Input */}
            <div className="px-4 pt-4">
                <label htmlFor={inputId} className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Deck Name
                </label>
                <input
                    ref={nameInputRef}
                    id={inputId}
                    name="cardName"
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    autoComplete="off"
                    placeholder="Enter card name…"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
            </div>

            {/* Card Preview */}
            <div className="flex flex-1 items-start justify-center overflow-auto overscroll-contain p-4">
                <div className="origin-top scale-[0.85] transform">
                    <ColorCardPreview ref={cardRef} card={{ ...card, name: cardName || card.name }} />
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t border-gray-100 bg-gray-50 p-4">
                <button
                    onClick={handleSave}
                    type="button"
                    disabled={isSaving}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isSaving ? 'Saving…' : isNewCard ? 'Save to Deck' : 'Update Card'}
                </button>
                <button
                    onClick={handleExport}
                    type="button"
                    disabled={isExporting}
                    className="flex-1 rounded-xl bg-gray-900 px-4 py-3 font-bold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isExporting ? 'Exporting…' : 'Export PNG'}
                </button>
            </div>
        </OverlaySurface>
    )
}
