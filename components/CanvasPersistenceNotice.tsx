'use client'

import { useEffect, useState } from 'react'
import {
    getCanvasPersistenceStatus,
    subscribeToCanvasPersistence,
    type CanvasPersistenceStatus,
} from '@/lib/store/storage'

/**
 * ColorWizard is local-first: the workbench restores your reference and settings from
 * browser storage. When a reference will not fit that storage we keep working, but the
 * user has to know the session will not come back — silent loss is the thing to avoid.
 */
const MESSAGES: Record<Exclude<CanvasPersistenceStatus['kind'], 'ok'>, { headline: string; detail: string }> = {
    'reference-dropped': {
        headline: 'This reference is too large to save.',
        detail: 'Your settings are still saved, but the image will not be here when you come back. Open it again next session.',
    },
    failed: {
        headline: 'Local saving is unavailable.',
        detail: 'Your browser is out of storage or blocking it, so this session will not be restored.',
    },
}

export default function CanvasPersistenceNotice() {
    const [status, setStatus] = useState<CanvasPersistenceStatus>({ kind: 'ok' })
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        setStatus(getCanvasPersistenceStatus())
        return subscribeToCanvasPersistence((next) => {
            setStatus(next)
            if (next.kind !== 'ok') setDismissed(false)
        })
    }, [])

    if (status.kind === 'ok' || dismissed) return null

    const { headline, detail } = MESSAGES[status.kind]

    return (
        <div
            role="status"
            className="fixed left-0 right-0 top-0 z-[100] flex items-start justify-center gap-3 border-b border-warning bg-paper-elevated px-4 py-2.5 text-xs leading-snug text-ink"
        >
            <p className="max-w-2xl text-center">
                <span className="font-semibold">{headline}</span> {detail}
            </p>
            <button
                type="button"
                onClick={() => setDismissed(true)}
                aria-label="Dismiss storage notice"
                className="shrink-0 border border-ink-hairline px-1.5 leading-tight text-ink-muted transition-colors duration-normal hover:border-ink hover:text-ink"
            >
                ✕
            </button>
        </div>
    )
}
