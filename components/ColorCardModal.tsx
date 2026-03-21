'use client'

import { useState, useRef, useEffect, useId } from 'react'
import { toPng } from 'html-to-image'
import ColorCardPreview from './ColorCardPreview'
import { ColorCard } from '@/lib/types/colorCard'
import { duplicateCard, saveCard, updateCard } from '@/lib/colorCardStorage'
import OverlaySurface from '@/components/ui/Overlay'
import CardMetadataFields from './CardMetadataFields'
import { parseCardTags, stringifyCardTags } from '@/lib/cardMeta'
import type { CardPriority, CardStatus } from '@/lib/cardMeta'

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
    const [project, setProject] = useState('')
    const [status, setStatus] = useState<CardStatus>('idea')
    const [priority, setPriority] = useState<CardPriority>('medium')
    const [tagsText, setTagsText] = useState('')
    const [notes, setNotes] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)
    const nameInputRef = useRef<HTMLInputElement>(null)

    // Sync name when card changes
    useEffect(() => {
        if (card) {
            setCardName(card.name)
            setProject(card.project ?? '')
            setStatus(card.status ?? 'idea')
            setPriority(card.priority ?? 'medium')
            setTagsText(stringifyCardTags(card.tags))
            setNotes(card.notes ?? '')
        }
    }, [card])

    if (!isOpen || !card) return null

    const previewCard = {
        ...card,
        name: cardName || card.name,
        project: project.trim() || undefined,
        status,
        priority,
        tags: parseCardTags(tagsText),
        notes: notes.trim() || undefined,
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const updatedCard = {
                ...card,
                name: cardName.trim() || `Color ${card.color.hex}`,
                project: project.trim() || undefined,
                status,
                priority,
                tags: parseCardTags(tagsText),
                notes: notes.trim() || undefined,
            }
            if (isNewCard) {
                saveCard(updatedCard)
            } else {
                updateCard(card.id, updatedCard)
            }
            onCardSaved?.()
            onClose()
        } catch (e) {
            console.error('Failed to save card:', e)
        } finally {
            setIsSaving(false)
        }
    }

    const handleSaveCopy = async () => {
        setIsSaving(true)
        try {
            const baseName = cardName.trim() || card.name
            const copyName = baseName.toLowerCase().startsWith('copy of ')
                ? baseName
                : `Copy of ${baseName}`

            duplicateCard(card, {
                name: copyName,
                project: project.trim() || undefined,
                status,
                priority,
                tags: parseCardTags(tagsText),
                notes: notes.trim() || undefined,
            })

            onCardSaved?.()
            onClose()
        } catch (e) {
            console.error('Failed to duplicate card:', e)
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
            panelClassName="flex max-h-[90dvh] min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl outline-none lg:flex-row"
        >
            <div className="flex items-center justify-between border-b border-gray-100 p-4 lg:absolute lg:left-0 lg:right-0 lg:top-0 lg:z-10 lg:bg-white/95 lg:backdrop-blur-sm">
                <div>
                    <h2 id={titleId} className="text-lg font-bold text-gray-900">
                        {isNewCard ? 'Save to Deck' : 'Card Detail'}
                    </h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gray-400">
                        Local deck record
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close color card modal"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                    ✕
                </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-0 lg:pt-16">
                <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
                    <aside className="flex min-h-0 flex-col border-b border-gray-100 bg-gray-50/80 lg:border-b-0 lg:border-r lg:border-gray-100">
                        <div className="border-b border-gray-100 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gray-400">
                                Card Preview
                            </p>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                            <div className="mx-auto w-full max-w-[400px]">
                                <ColorCardPreview ref={cardRef} card={previewCard} variant="embedded" />
                            </div>
                        </div>
                    </aside>

                    <section className="flex min-h-0 flex-col bg-white">
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 lg:p-6">
                            <div className="space-y-4">
                                <div>
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
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <CardMetadataFields
                                    project={project}
                                    onProjectChange={setProject}
                                    status={status}
                                    onStatusChange={setStatus}
                                    priority={priority}
                                    onPriorityChange={setPriority}
                                    tagsText={tagsText}
                                    onTagsTextChange={setTagsText}
                                    notes={notes}
                                    onNotesChange={setNotes}
                                />
                            </div>
                        </div>

                        <div className="flex shrink-0 gap-3 border-t border-gray-100 bg-gray-50 p-4">
                            <button
                                onClick={handleSave}
                                type="button"
                                disabled={isSaving}
                                className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSaving ? 'Saving…' : isNewCard ? 'Save to Deck' : 'Update Card'}
                            </button>
                            {!isNewCard && (
                                <button
                                    onClick={handleSaveCopy}
                                    type="button"
                                    disabled={isSaving}
                                    className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 font-bold text-gray-900 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isSaving ? 'Copying…' : 'Save Copy'}
                                </button>
                            )}
                            <button
                                onClick={handleExport}
                                type="button"
                                disabled={isExporting}
                                className="flex-1 rounded-xl bg-gray-900 px-4 py-3 font-bold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isExporting ? 'Exporting…' : 'Export PNG'}
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </OverlaySurface>
    )
}
