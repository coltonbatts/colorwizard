'use client'

/**
 * MatchesTab - The "Threads" tab content
 * Shows matching DMC embroidery floss for the sampled color
 */

import DMCFlossMatch from '../DMCFlossMatch'
import ErrorBoundary from '../ErrorBoundary'
import { SidebarErrorFallback } from '../errors/SidebarErrorFallback'

interface MatchesTabProps {
    sampledColor: {
        hex: string
        rgb: { r: number; g: number; b: number }
        hsl: { h: number; s: number; l: number }
    } | null
    onColorSelect?: (rgb: { r: number; g: number; b: number }) => void
}

export default function MatchesTab({ sampledColor, onColorSelect }: MatchesTabProps) {
    if (!sampledColor) {
        return (
            <div className="tab-empty-state h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="tab-empty-icon mb-4 opacity-20">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19.5 4.5 L6.5 17.5" strokeWidth="2" />
                        <circle cx="20.5" cy="3.5" r="1.5" />
                        <path d="M20.5 3.5 C22 2 23 4 21 6 C18 9 15 8 13 11 C11 14 12 17 9 19 C7 21 4 20 3 18" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-studio mb-1">Sample a color first</h3>
                <p className="text-sm text-studio-muted">Tap the image to see matching DMC embroidery floss</p>
            </div>
        )
    }

    return (
        <div className="tab-content-scroll h-full">
            <div className="p-2.5 md:p-4 lg:p-6 pb-4 md:pb-20">
                <ErrorBoundary
                    fallback={({ error, resetError }) => (
                        <SidebarErrorFallback error={error} resetError={resetError} />
                    )}
                >
                    <DMCFlossMatch
                        rgb={sampledColor.rgb}
                        onColorSelect={onColorSelect || (() => { })}
                    />
                </ErrorBoundary>
            </div>
        </div>
    )
}
