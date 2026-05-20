'use client'

/**
 * MatchesTab - The "Threads" tab content
 * Shows DMC embroidery floss matches for the sampled color
 */

import DMCFlossMatch from '../DMCFlossMatch'
import ErrorBoundary from '../ErrorBoundary'
import { SidebarErrorFallback } from '../errors/SidebarErrorFallback'
import type { ImageValueContext } from '@/lib/dmc/types'
import type { ValueBuffer } from '@/hooks/useImageAnalyzer'

interface MatchesTabProps {
    sampledColor: {
        hex: string
        rgb: { r: number; g: number; b: number }
        hsl: { h: number; s: number; l: number }
    } | null
    imageValue?: ImageValueContext | null
    valueBuffer?: ValueBuffer | null
    valueScaleClip?: number
    onColorSelect?: (rgb: { r: number; g: number; b: number }) => void
}

export default function MatchesTab({
    sampledColor,
    imageValue,
    valueBuffer,
    valueScaleClip = 0,
    onColorSelect,
}: MatchesTabProps) {
    if (!sampledColor) {
        return <ThreadsEmptyState />
    }

    return (
        <div className="tab-content-scroll h-full">
            <div className="p-3 md:p-4 lg:p-5 pb-4 md:pb-20">
                <ErrorBoundary
                    fallback={({ error, resetError }) => (
                        <SidebarErrorFallback error={error} resetError={resetError} />
                    )}
                >
                    <DMCFlossMatch
                        rgb={sampledColor.rgb}
                        imageValue={imageValue}
                        valueBuffer={valueBuffer}
                        valueScaleClip={valueScaleClip}
                        onColorSelect={onColorSelect || (() => {})}
                    />
                </ErrorBoundary>
            </div>
        </div>
    )
}

function ThreadsEmptyState() {
    return (
        <div className="tab-empty-state h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-ink-hairline bg-paper-recessed text-ink-faint">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19.5 4.5 L6.5 17.5" strokeWidth="2" />
                    <circle cx="20.5" cy="3.5" r="1.5" />
                    <path d="M20.5 3.5 C22 2 23 4 21 6 C18 9 15 8 13 11 C11 14 12 17 9 19 C7 21 4 20 3 18" />
                </svg>
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">Threads</div>
            <p className="mt-2 text-sm font-semibold text-ink">Sample a color on the canvas.</p>
        </div>
    )
}
