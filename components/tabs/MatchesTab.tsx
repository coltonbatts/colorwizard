'use client'

/**
 * MatchesTab - The "Matches" tab content
 * DMC thread matching
 */

import DMCFlossMatch from '../DMCFlossMatch'

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
            <div className="h-full p-6 flex flex-col items-center justify-center bg-white text-studio-secondary">
                <div className="w-16 h-16 rounded-full border-2 border-gray-100 flex items-center justify-center mb-4">
                    <span className="text-2xl text-studio-dim">🧵</span>
                </div>
                <p className="text-center font-semibold text-studio">Sample a color first</p>
                <p className="text-sm text-studio-muted mt-2">Then see matching threads</p>
            </div>
        )
    }

    return (
        <div className="bg-white text-studio font-sans min-h-full p-4 lg:p-6">
            <DMCFlossMatch rgb={sampledColor.rgb} onColorSelect={onColorSelect || (() => { })} />
        </div>
    )
}
