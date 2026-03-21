'use client'

import { useEffect, useMemo, useState } from 'react'
import ColorCardPreview from './ColorCardPreview'
import ColorCardModal from './ColorCardModal'
import CardMetadataFields from './CardMetadataFields'
import { createColorCard } from '@/lib/colorArtifacts'
import {
    CARD_DECK_STORAGE_KEYS,
    deleteCard,
    duplicateCard,
    getCards,
    updateCard,
} from '@/lib/colorCardStorage'
import { getColorName } from '@/lib/colorNaming'
import { ColorCard } from '@/lib/types/colorCard'
import {
    CARD_PRIORITY_OPTIONS,
    CARD_PRIORITY_STYLES,
    CARD_STATUS_OPTIONS,
    CARD_STATUS_STYLES,
    getProjectLabel,
    parseCardTags,
    stringifyCardTags,
} from '@/lib/cardMeta'
import type { CardPriority, CardStatus } from '@/lib/cardMeta'

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

type SortMode = 'recent' | 'priority' | 'name'

function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString()
}

function normalizeStatus(value?: CardStatus): CardStatus {
    return value ?? 'idea'
}

function normalizePriority(value?: CardPriority): CardPriority {
    return value ?? 'medium'
}

function priorityRank(priority: CardPriority): number {
    switch (priority) {
        case 'urgent':
            return 4
        case 'high':
            return 3
        case 'medium':
            return 2
        case 'low':
        default:
            return 1
    }
}

function sortCards(cards: ColorCard[], mode: SortMode): ColorCard[] {
    const next = [...cards]

    next.sort((a, b) => {
        if (mode === 'name') {
            return a.name.localeCompare(b.name)
        }

        if (mode === 'priority') {
            const priorityDiff = priorityRank(normalizePriority(b.priority)) - priorityRank(normalizePriority(a.priority))
            if (priorityDiff !== 0) return priorityDiff
        }

        return (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt)
    })

    return next
}

export default function ColorDeckPanel({
    sampledColor,
    activePaletteName,
    onGoToSample,
}: ColorDeckPanelProps) {
    const [cards, setCards] = useState<ColorCard[]>([])
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
    const [draftName, setDraftName] = useState('')
    const [draftProject, setDraftProject] = useState('')
    const [draftStatus, setDraftStatus] = useState<CardStatus>('idea')
    const [draftPriority, setDraftPriority] = useState<CardPriority>('medium')
    const [draftTagsText, setDraftTagsText] = useState('')
    const [draftNotes, setDraftNotes] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [projectFilter, setProjectFilter] = useState<'all' | string>('all')
    const [statusFilter, setStatusFilter] = useState<'all' | CardStatus>('all')
    const [priorityFilter, setPriorityFilter] = useState<'all' | CardPriority>('all')
    const [sortMode, setSortMode] = useState<SortMode>('recent')
    const [showCardModal, setShowCardModal] = useState(false)
    const [pendingCard, setPendingCard] = useState<ColorCard | null>(null)
    const [isCreatingFromSample, setIsCreatingFromSample] = useState(false)

    const selectedCard = useMemo(
        () => cards.find((card) => card.id === selectedCardId) ?? null,
        [cards, selectedCardId],
    )

    const refreshCards = () => {
        setCards(sortCards(getCards(), 'recent'))
    }

    useEffect(() => {
        refreshCards()

        const handleStorage = (event: StorageEvent) => {
            if (
                event.key === CARD_DECK_STORAGE_KEYS.current ||
                event.key === CARD_DECK_STORAGE_KEYS.legacy ||
                event.key === CARD_DECK_STORAGE_KEYS.ancient ||
                event.key === null
            ) {
                refreshCards()
            }
        }

        window.addEventListener('storage', handleStorage)
        return () => window.removeEventListener('storage', handleStorage)
    }, [])

    useEffect(() => {
        if (!selectedCard) {
            setDraftName('')
            setDraftProject('')
            setDraftStatus('idea')
            setDraftPriority('medium')
            setDraftTagsText('')
            setDraftNotes('')
            return
        }

        setDraftName(selectedCard.name)
        setDraftProject(selectedCard.project ?? '')
        setDraftStatus(selectedCard.status ?? 'idea')
        setDraftPriority(selectedCard.priority ?? 'medium')
        setDraftTagsText(stringifyCardTags(selectedCard.tags))
        setDraftNotes(selectedCard.notes ?? '')
    }, [selectedCard])

    useEffect(() => {
        if (selectedCardId && !cards.some((card) => card.id === selectedCardId)) {
            setSelectedCardId(null)
        }
    }, [cards, selectedCardId])

    const deckStats = useMemo(() => {
        const projectCount = new Set(cards.map((card) => getProjectLabel(card.project))).size

        return {
            recipeReady: cards.filter((card) => card.matches.paints.length > 0).length,
            spectralReady: cards.filter((card) => card.recipe.spectral).length,
            projectCount,
        }
    }, [cards])

    const projectOptions = useMemo(() => {
        const projects = Array.from(new Set(cards.map((card) => getProjectLabel(card.project))))
            .sort((a, b) => a.localeCompare(b))

        return projects
    }, [cards])

    const filteredCards = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()

        const next = cards.filter((card) => {
            const projectLabel = getProjectLabel(card.project)
            const status = normalizeStatus(card.status)
            const priority = normalizePriority(card.priority)
            const tags = card.tags ?? []

            if (projectFilter !== 'all' && projectLabel !== projectFilter) {
                return false
            }

            if (statusFilter !== 'all' && status !== statusFilter) {
                return false
            }

            if (priorityFilter !== 'all' && priority !== priorityFilter) {
                return false
            }

            if (!query) return true

            const haystack = [
                card.name,
                card.color.hex,
                card.color.colorName,
                projectLabel,
                card.notes,
                status,
                priority,
                ...tags,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()

            return haystack.includes(query)
        })

        return sortCards(next, sortMode)
    }, [cards, priorityFilter, projectFilter, searchQuery, sortMode, statusFilter])

    const groupedCards = useMemo(() => {
        if (projectFilter !== 'all') {
            return [{
                label: projectFilter,
                cards: filteredCards,
            }]
        }

        const groups = new Map<string, ColorCard[]>()
        filteredCards.forEach((card) => {
            const label = getProjectLabel(card.project)
            const existing = groups.get(label) ?? []
            existing.push(card)
            groups.set(label, existing)
        })

        return Array.from(groups.entries())
            .map(([label, groupCards]) => ({
                label,
                cards: sortCards(groupCards, sortMode),
                sortStamp: groupCards[0]?.updatedAt ?? groupCards[0]?.createdAt ?? 0,
            }))
            .sort((a, b) => {
                if (sortMode === 'name') {
                    return a.label.localeCompare(b.label)
                }

                return b.sortStamp - a.sortStamp
            })
    }, [filteredCards, projectFilter, sortMode])

    const handleDelete = (id: string) => {
        if (!window.confirm('Remove this card from the deck?')) {
            return
        }

        deleteCard(id)
        refreshCards()

        if (selectedCardId === id) {
            setSelectedCardId(null)
        }
    }

    const openCard = (card: ColorCard) => {
        setSelectedCardId(card.id)
    }

    const closeCard = () => {
        setSelectedCardId(null)
    }

    const handleUpdateSelectedCard = () => {
        if (!selectedCard) return

        const nextName = draftName.trim() || `Color ${selectedCard.color.hex}`
        const updated = updateCard(selectedCard.id, {
            name: nextName,
            project: draftProject.trim() || undefined,
            status: draftStatus,
            priority: draftPriority,
            tags: parseCardTags(draftTagsText),
            notes: draftNotes.trim() || undefined,
        })

        if (updated) {
            refreshCards()
            setSelectedCardId(updated.id)
        }
    }

    const handleSaveCopy = () => {
        if (!selectedCard) return

        const nextName = draftName.trim() || selectedCard.name
        const copyName = nextName.toLowerCase().startsWith('copy of ')
            ? nextName
            : `Copy of ${nextName}`

        const copy = duplicateCard(selectedCard, {
            name: copyName,
            project: draftProject.trim() || undefined,
            status: draftStatus,
            priority: draftPriority,
            tags: parseCardTags(draftTagsText),
            notes: draftNotes.trim() || undefined,
        })

        refreshCards()
        setSelectedCardId(copy.id)
    }

    const handleCreateFromSample = async () => {
        if (!sampledColor) return

        setIsCreatingFromSample(true)
        try {
            let descriptiveName = ''
            try {
                const result = await getColorName(sampledColor.hex)
                descriptiveName = result.name
            } catch (error) {
                console.error('Failed to get color name for deck card', error)
            }

            const newCard = await createColorCard(sampledColor, {
                name: descriptiveName || `Color ${sampledColor.hex}`,
                colorName: descriptiveName || undefined,
                recipeLabel: activePaletteName || 'Active palette',
            })

            setPendingCard(newCard)
            setShowCardModal(true)
        } catch (error) {
            console.error('Failed to create card from sample', error)
        } finally {
            setIsCreatingFromSample(false)
        }
    }

    const hasSampleMatch = (card: ColorCard) => sampledColor?.hex.toLowerCase() === card.color.hex.toLowerCase()

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
                            Local records of sampled colors, recipes, and project metadata.
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
                    <div className="rounded-xl border border-ink-hairline bg-paper-recessed px-3 py-2 text-ink-muted">
                        {deckStats.projectCount} projects
                    </div>
                    <div className="rounded-xl border border-ink-hairline bg-paper-recessed px-3 py-2 text-ink-muted">
                        {projectOptions.length} filters
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
                                {activePaletteName || 'Turn this sample into a card, then assign a project.'}
                            </p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={handleCreateFromSample}
                                disabled={isCreatingFromSample}
                                className="rounded-xl bg-signal px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-signal-hover disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {isCreatingFromSample ? 'Creating…' : 'Save as card'}
                            </button>
                            <button
                                type="button"
                                onClick={onGoToSample}
                                className="rounded-xl border border-ink-hairline bg-paper-recessed px-3 py-2 text-xs font-bold text-ink transition-colors hover:bg-paper"
                            >
                                Back to sample
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="border-b border-ink-hairline bg-paper-elevated p-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <label className="block">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                            Search
                        </span>
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Name, hex, tag, note"
                            className="w-full rounded-xl border border-ink-hairline bg-paper px-4 py-3 text-sm font-medium text-ink focus:border-transparent focus:outline-none focus:ring-2 focus:ring-signal"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                            Project
                        </span>
                        <select
                            value={projectFilter}
                            onChange={(event) => setProjectFilter(event.target.value)}
                            className="w-full rounded-xl border border-ink-hairline bg-paper px-4 py-3 text-sm font-medium text-ink focus:border-transparent focus:outline-none focus:ring-2 focus:ring-signal"
                        >
                            <option value="all">All projects</option>
                            {projectOptions.map((project) => (
                                <option key={project} value={project}>
                                    {project}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                            Status
                        </span>
                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value as 'all' | CardStatus)}
                            className="w-full rounded-xl border border-ink-hairline bg-paper px-4 py-3 text-sm font-medium text-ink focus:border-transparent focus:outline-none focus:ring-2 focus:ring-signal"
                        >
                            <option value="all">All statuses</option>
                            {CARD_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                            Sort
                        </span>
                        <select
                            value={sortMode}
                            onChange={(event) => setSortMode(event.target.value as SortMode)}
                            className="w-full rounded-xl border border-ink-hairline bg-paper px-4 py-3 text-sm font-medium text-ink focus:border-transparent focus:outline-none focus:ring-2 focus:ring-signal"
                        >
                            <option value="recent">Recent</option>
                            <option value="priority">Priority</option>
                            <option value="name">Name</option>
                        </select>
                    </label>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="block">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                            Priority
                        </span>
                        <select
                            value={priorityFilter}
                            onChange={(event) => setPriorityFilter(event.target.value as 'all' | CardPriority)}
                            className="w-full rounded-xl border border-ink-hairline bg-paper px-4 py-3 text-sm font-medium text-ink focus:border-transparent focus:outline-none focus:ring-2 focus:ring-signal"
                        >
                            <option value="all">All priorities</option>
                            {CARD_PRIORITY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="flex items-end justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('')
                                setProjectFilter('all')
                                setStatusFilter('all')
                                setPriorityFilter('all')
                                setSortMode('recent')
                            }}
                            className="rounded-xl border border-ink-hairline bg-paper-recessed px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-ink-muted transition-colors hover:text-ink"
                        >
                            Reset filters
                        </button>
                        <div className="text-right text-[10px] font-bold uppercase tracking-[0.22em] text-ink-faint">
                            {filteredCards.length} visible
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4">
                {selectedCard ? (
                    <div className="flex h-full min-h-[280px] flex-col gap-4">
                        <div className="flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={closeCard}
                                className="rounded-xl border border-ink-hairline bg-paper-recessed px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-ink-muted transition-colors hover:text-ink"
                            >
                                Back to deck
                            </button>
                            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-faint">
                                Card detail
                            </div>
                        </div>

                        <div className="mx-auto w-full max-w-[400px]">
                            <ColorCardPreview card={selectedCard} />
                        </div>

                        <div className="space-y-4 rounded-3xl border border-ink-hairline bg-paper-elevated p-4 shadow-sm">
                            <div>
                                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                                    Deck Name
                                </label>
                                <input
                                    type="text"
                                    value={draftName}
                                    onChange={(event) => setDraftName(event.target.value)}
                                    className="w-full rounded-xl border border-ink-hairline bg-paper px-4 py-3 text-sm font-medium text-ink focus:border-transparent focus:outline-none focus:ring-2 focus:ring-signal"
                                />
                            </div>

                            <CardMetadataFields
                                project={draftProject}
                                onProjectChange={setDraftProject}
                                status={draftStatus}
                                onStatusChange={setDraftStatus}
                                priority={draftPriority}
                                onPriorityChange={setDraftPriority}
                                tagsText={draftTagsText}
                                onTagsTextChange={setDraftTagsText}
                                notes={draftNotes}
                                onNotesChange={setDraftNotes}
                            />

                            <div className="grid gap-2 sm:grid-cols-3">
                                <button
                                    type="button"
                                    onClick={handleUpdateSelectedCard}
                                    className="rounded-xl bg-signal px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-signal-hover"
                                >
                                    Save Changes
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveCopy}
                                    className="rounded-xl border border-ink-hairline bg-paper-recessed px-4 py-3 text-sm font-bold text-ink transition-colors hover:bg-paper"
                                >
                                    Duplicate
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(selectedCard.id)}
                                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-100"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                ) : filteredCards.length === 0 ? (
                    <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-ink-hairline bg-paper-recessed px-6 py-10 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-ink-hairline bg-paper-elevated text-2xl">
                            🎴
                        </div>
                        <h3 className="text-lg font-black text-ink">
                            {cards.length === 0 ? 'No cards in deck yet' : 'No matching cards'}
                        </h3>
                        <p className="mt-2 max-w-sm text-sm text-ink-muted">
                            {cards.length === 0
                                ? 'Sample a color, save it to the deck, and it will show up here with its paint recipe, tags, and project metadata.'
                                : 'Try clearing filters or switching projects to see more cards.'}
                            {cards.length === 0 ? ' This deck is stored in this browser, so a fresh browser or profile starts empty.' : ''}
                        </p>
                        {cards.length === 0 ? (
                            <button
                                type="button"
                                onClick={onGoToSample}
                                className="mt-5 rounded-xl bg-signal px-4 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-signal-hover"
                            >
                                Save your first card
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('')
                                    setProjectFilter('all')
                                    setStatusFilter('all')
                                    setPriorityFilter('all')
                                }}
                                className="mt-5 rounded-xl bg-signal px-4 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-signal-hover"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-5">
                        {groupedCards.map((group) => (
                            <section key={group.label} className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-[0.22em] text-ink">
                                            {group.label}
                                        </h3>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-faint">
                                            {group.cards.length} card{group.cards.length === 1 ? '' : 's'}
                                        </p>
                                    </div>
                                    <div className="rounded-full border border-ink-hairline bg-paper-recessed px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-muted">
                                        {sortMode === 'recent' ? 'Newest first' : sortMode === 'priority' ? 'Priority sort' : 'Alphabetical'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-2">
                                    {group.cards.map((card) => {
                                        const status = normalizeStatus(card.status)
                                        const priority = normalizePriority(card.priority)
                                        const tags = card.tags ?? []
                                        const statusLabel = CARD_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? 'Idea'
                                        const priorityLabel = CARD_PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ?? 'Medium'

                                        return (
                                            <article
                                                key={card.id}
                                                className={`group overflow-hidden rounded-3xl border bg-paper-elevated shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${hasSampleMatch(card) ? 'border-signal ring-2 ring-signal/20' : 'border-ink-hairline'}`}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => openCard(card)}
                                                    className="block w-full text-left"
                                                >
                                                    <div className="relative h-28 overflow-hidden" style={{ backgroundColor: card.color.hex }}>
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                                                        <div className="absolute inset-x-0 bottom-0 flex items-end p-3 text-white">
                                                            <div className="min-w-0">
                                                                <div className="truncate text-lg font-black">{card.name}</div>
                                                                {hasSampleMatch(card) && (
                                                                    <div className="mt-1 inline-flex rounded-full border border-white/20 bg-signal/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                                                                        Current sample
                                                                    </div>
                                                                )}
                                                                {card.color.colorName && card.color.colorName !== card.name && (
                                                                    <div className="truncate text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">
                                                                        {card.color.colorName}
                                                                    </div>
                                                                )}
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
                                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${CARD_STATUS_STYLES[status]}`}>
                                                                {statusLabel}
                                                            </span>
                                                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${CARD_PRIORITY_STYLES[priority]}`}>
                                                                {priorityLabel}
                                                            </span>
                                                            <span className="rounded-full border border-ink-hairline bg-paper-recessed px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
                                                                {card.matches.dmc.length} DMC
                                                            </span>
                                                            <span className="rounded-full border border-ink-hairline bg-paper-recessed px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
                                                                {card.matches.paints.length} paint matches
                                                            </span>
                                                            {tags.slice(0, 2).map((tag) => (
                                                                <span
                                                                    key={tag}
                                                                    className="rounded-full border border-ink-hairline bg-paper-recessed px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted"
                                                                >
                                                                    #{tag}
                                                                </span>
                                                            ))}
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
                                                            openCard(card)
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
                                        )
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>

            <ColorCardModal
                isOpen={showCardModal}
                onClose={() => {
                    setShowCardModal(false)
                    setPendingCard(null)
                }}
                card={pendingCard}
                isNewCard={true}
                onCardSaved={() => {
                    refreshCards()
                    if (pendingCard) {
                        setSelectedCardId(pendingCard.id)
                    }
                }}
            />
        </div>
    )
}
