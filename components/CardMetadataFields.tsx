'use client'

import { CARD_PRIORITY_OPTIONS, CARD_STATUS_OPTIONS } from '@/lib/cardMeta'
import type { CardPriority, CardStatus } from '@/lib/cardMeta'

interface CardMetadataFieldsProps {
    project: string
    onProjectChange: (value: string) => void
    status: CardStatus
    onStatusChange: (value: CardStatus) => void
    priority: CardPriority
    onPriorityChange: (value: CardPriority) => void
    tagsText: string
    onTagsTextChange: (value: string) => void
    notes: string
    onNotesChange: (value: string) => void
    className?: string
}

export default function CardMetadataFields({
    project,
    onProjectChange,
    status,
    onStatusChange,
    priority,
    onPriorityChange,
    tagsText,
    onTagsTextChange,
    notes,
    onNotesChange,
    className = '',
}: CardMetadataFieldsProps) {
    return (
        <div className={`space-y-4 ${className}`}>
            <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                        Project / Collection
                    </span>
                    <input
                        name="color-project"
                        autoComplete="off"
                        type="text"
                        value={project}
                        onChange={(event) => onProjectChange(event.target.value)}
                        placeholder="Inbox, website refresh, spring launch…"
                        className="w-full rounded-xl border border-ink-hairline bg-paper px-4 py-3 text-sm font-medium text-ink focus:border-transparent focus:outline-none focus:ring-2 focus:ring-signal"
                    />
                    <p className="mt-1 text-[10px] text-ink-faint">
                        Leave blank to keep the card in Inbox.
                    </p>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                            Status
                        </span>
                        <select
                            name="color-status"
                            autoComplete="off"
                            value={status}
                            onChange={(event) => onStatusChange(event.target.value as CardStatus)}
                            className="w-full rounded-xl border border-ink-hairline bg-paper px-4 py-3 text-sm font-medium text-ink focus:border-transparent focus:outline-none focus:ring-2 focus:ring-signal"
                        >
                            {CARD_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                            Priority
                        </span>
                        <select
                            name="color-priority"
                            autoComplete="off"
                            value={priority}
                            onChange={(event) => onPriorityChange(event.target.value as CardPriority)}
                            className="w-full rounded-xl border border-ink-hairline bg-paper px-4 py-3 text-sm font-medium text-ink focus:border-transparent focus:outline-none focus:ring-2 focus:ring-signal"
                        >
                            {CARD_PRIORITY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            </div>

            <label className="block">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                    Tags
                </span>
                <input
                    name="color-tags"
                    autoComplete="off"
                    type="text"
                    value={tagsText}
                    onChange={(event) => onTagsTextChange(event.target.value)}
                    placeholder="UI, launch, revisit…"
                    className="w-full rounded-xl border border-ink-hairline bg-paper px-4 py-3 text-sm font-medium text-ink focus:border-transparent focus:outline-none focus:ring-2 focus:ring-signal"
                />
                <p className="mt-1 text-[10px] text-ink-faint">
                    Separate tags with commas or line breaks.
                </p>
            </label>

            <label className="block">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                    Notes
                </span>
                <textarea
                    name="color-notes"
                    autoComplete="off"
                    value={notes}
                    onChange={(event) => onNotesChange(event.target.value)}
                    placeholder="Task context, decisions, or next steps…"
                    rows={4}
                    className="w-full rounded-xl border border-ink-hairline bg-paper px-4 py-3 text-sm font-medium text-ink focus:border-transparent focus:outline-none focus:ring-2 focus:ring-signal"
                />
            </label>
        </div>
    )
}
