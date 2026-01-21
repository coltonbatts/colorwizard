'use client'

/**
 * DMCFlossTab - Simplified DMC thread matching tab
 * Shows matching DMC embroidery floss for the sampled color
 */

import DMCFlossMatch from '../DMCFlossMatch'
import ErrorBoundary from '../ErrorBoundary'
import { SidebarErrorFallback } from '../errors/SidebarErrorFallback'

interface DMCFlossTabProps {
    sampledColor: {
        hex: string
        rgb: { r: number; g: number; b: number }
        hsl: { h: number; s: number; l: number }
    } | null
    onColorSelect?: (rgb: { r: number; g: number; b: number }) => void
}

export default function DMCFlossTab({ sampledColor, onColorSelect }: DMCFlossTabProps) {
    if (!sampledColor) {
        return (
            <div className="tab-empty-state">
                <div className="tab-empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        {/* Needle */}
                        <path d="M19.5 4.5 L6.5 17.5" strokeWidth="2" />
                        <circle cx="20.5" cy="3.5" r="1.5" />
                        {/* Thread */}
                        <path d="M20.5 3.5 C22 2 23 4 21 6 C18 9 15 8 13 11 C11 14 12 17 9 19 C7 21 4 20 3 18" />
                    </svg>
                </div>
                <p className="tab-empty-title">Sample a color to find matching threads</p>
                <p className="tab-empty-subtitle">Tap anywhere on your image</p>
            </div>
        )
    }

    return (
        <div className="tab-content-scroll">
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
    )
}
