export type CardStatus = 'idea' | 'in-progress' | 'blocked' | 'done'

export type CardPriority = 'low' | 'medium' | 'high' | 'urgent'

export const CARD_STATUS_OPTIONS: Array<{ value: CardStatus; label: string }> = [
    { value: 'idea', label: 'Idea' },
    { value: 'in-progress', label: 'In progress' },
    { value: 'blocked', label: 'Blocked' },
    { value: 'done', label: 'Done' },
]

export const CARD_PRIORITY_OPTIONS: Array<{ value: CardPriority; label: string }> = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
]

export const CARD_STATUS_STYLES: Record<CardStatus, string> = {
    idea: 'border-amber-200 bg-amber-50 text-amber-700',
    'in-progress': 'border-blue-200 bg-blue-50 text-blue-700',
    blocked: 'border-red-200 bg-red-50 text-red-700',
    done: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

export const CARD_PRIORITY_STYLES: Record<CardPriority, string> = {
    low: 'border-slate-200 bg-slate-50 text-slate-600',
    medium: 'border-sky-200 bg-sky-50 text-sky-700',
    high: 'border-orange-200 bg-orange-50 text-orange-700',
    urgent: 'border-red-200 bg-red-50 text-red-700',
}

export function parseCardTags(value: string): string[] {
    return value
        .split(/[\n,]/g)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .filter((tag, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === tag.toLowerCase()) === index)
}

export function stringifyCardTags(tags: string[] | undefined): string {
    return tags?.join(', ') ?? ''
}

export function getProjectLabel(project?: string | null): string {
    return project?.trim() || 'Inbox'
}
