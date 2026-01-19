'use client'

/**
 * SampleTab - The default "Sample" tab content
 * Shows the sampled color with hero swatch, value/chroma readouts, and actions
 */

import { useState } from 'react'
import ColorNamingDisplay from '../ColorNamingDisplay'
import FullScreenOverlay from '../FullScreenOverlay'
import ColorCardModal from '../ColorCardModal'
import { getPainterValue, getPainterChroma, getLuminance, getValueBand } from '@/lib/paintingMath'
import { PinnedColor } from '@/lib/types/pinnedColor'
import { ColorCard } from '@/lib/types/colorCard'
import { generatePaintRecipe } from '@/lib/colorMixer'
import { solveRecipe } from '@/lib/paint/solveRecipe'
import { findClosestDMCColors } from '@/lib/dmcFloss'
import { getColorName } from '@/lib/colorNaming'
import { ValueScaleSettings } from '@/lib/types/valueScale'

interface SampleTabProps {
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
    onPin: (newPin: PinnedColor) => void
    isPinned: boolean
    valueScaleSettings?: ValueScaleSettings
    lastSampleTime?: number
    onAddToSession?: (color: { hex: string; rgb: { r: number; g: number; b: number } }) => void
}

export default function SampleTab({
    sampledColor,
    onPin,
    isPinned,
    valueScaleSettings,
    lastSampleTime,
    onAddToSession
}: SampleTabProps) {
    const [label, setLabel] = useState('')
    const [isPinning, setIsPinning] = useState(false)
    const [showColorFullScreen, setShowColorFullScreen] = useState(false)
    const [showCardModal, setShowCardModal] = useState(false)
    const [pendingCard, setPendingCard] = useState<ColorCard | null>(null)
    const [copied, setCopied] = useState<string | null>(null)

    if (!sampledColor) {
        return (
            <div className="h-full p-6 flex flex-col items-center justify-center bg-white text-studio-secondary">
                <div className="w-16 h-16 rounded-full border-2 border-gray-100 flex items-center justify-center mb-4">
                    <span className="text-2xl text-studio-dim">?</span>
                </div>
                <p className="text-center font-semibold text-studio">Click image to sample</p>
                <p className="text-sm text-studio-muted mt-2">Pick a color to analyze</p>
            </div>
        )
    }

    const { hex, rgb, hsl } = sampledColor
    const chroma = getPainterChroma(hex)

    // Value readout
    const valuePercent = getLuminance(rgb.r, rgb.g, rgb.b)
    const valueBand = getValueBand(valuePercent)
    const grayscaleHex = `#${Math.round(valuePercent * 2.55).toString(16).padStart(2, '0').repeat(3)}`

    const copyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text)
        setCopied(type)
        setTimeout(() => setCopied(null), 1500)
    }

    return (
        <div className="bg-white text-studio font-sans min-h-full p-4 lg:p-6 space-y-4">
            {/* Giant Hero Swatch */}
            <div
                className="w-full aspect-[2/1] rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden group transition-all duration-500 cursor-pointer"
                style={{ backgroundColor: hex }}
                onClick={() => setShowColorFullScreen(true)}
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent pointer-events-none"></div>
                <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-3xl"></div>
                <button
                    onClick={(e) => { e.stopPropagation(); setShowColorFullScreen(true) }}
                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-black/20 hover:bg-black/40 text-white/70 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-sm"
                    title="View full screen"
                >
                    <span className="text-lg">⛶</span>
                </button>
            </div>

            {/* Color Name */}
            <ColorNamingDisplay hex={hex} key={lastSampleTime} />

            {/* HEX Display with Copy */}
            <div className="flex items-center justify-center gap-3">
                <h2 className="text-3xl lg:text-4xl font-black tracking-tighter font-mono text-studio tabular-nums">{hex}</h2>
                <button
                    onClick={() => copyToClipboard(hex, 'hex')}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-studio-dim hover:text-studio"
                    title="Copy HEX"
                >
                    {copied === 'hex' ? '✓' : '📋'}
                </button>
            </div>

            {/* Quick Copy Buttons */}
            <div className="flex justify-center gap-2 text-xs">
                <button
                    onClick={() => copyToClipboard(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, 'rgb')}
                    className={`px-3 py-1.5 rounded-lg border transition-all ${copied === 'rgb' ? 'bg-green-50 border-green-200 text-green-600' : 'border-gray-200 hover:bg-gray-50 text-studio-dim'}`}
                >
                    {copied === 'rgb' ? '✓ Copied' : `RGB ${rgb.r}, ${rgb.g}, ${rgb.b}`}
                </button>
                <button
                    onClick={() => copyToClipboard(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, 'hsl')}
                    className={`px-3 py-1.5 rounded-lg border transition-all ${copied === 'hsl' ? 'bg-green-50 border-green-200 text-green-600' : 'border-gray-200 hover:bg-gray-50 text-studio-dim'}`}
                >
                    {copied === 'hsl' ? '✓ Copied' : `HSL ${hsl.h}°`}
                </button>
            </div>

            {/* Value & Chroma Readout */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <span className="text-blue-600 text-[10px] uppercase font-black tracking-widest mb-1">Value</span>
                    <span className="font-mono text-3xl text-studio font-black tabular-nums">
                        {sampledColor.valueMetadata ? Math.round(sampledColor.valueMetadata.y * 100) : valuePercent}%
                    </span>
                    {sampledColor.valueMetadata ? (
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-4 h-4 rounded-sm border border-gray-200" style={{ backgroundColor: grayscaleHex }}></div>
                            <span className="text-yellow-600 font-mono text-sm font-bold">Step {sampledColor.valueMetadata.step}</span>
                        </div>
                    ) : (
                        <span className="text-[10px] text-studio-muted font-bold uppercase mt-1">{valueBand}</span>
                    )}
                </div>

                <div className="flex flex-col items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <span className="text-studio-dim text-[10px] uppercase font-bold tracking-widest mb-1">Chroma</span>
                    <span className="font-mono text-2xl text-studio font-black">{chroma.label}</span>
                </div>
            </div>

            {/* Label Input */}
            <input
                type="text"
                placeholder="Add a label/note..."
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-studio focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />

            {/* Action Buttons */}
            <div className="flex gap-2">
                <button
                    onClick={async () => {
                        if (isPinned) return
                        setIsPinning(true)
                        try {
                            const spectral = await solveRecipe(hex)
                            const fallback = generatePaintRecipe(hsl)
                            const dmc = findClosestDMCColors(rgb, 5)

                            onPin({
                                id: crypto.randomUUID(),
                                hex,
                                rgb,
                                hsl,
                                label: label.trim() || `Color ${hex}`,
                                timestamp: Date.now(),
                                spectralRecipe: spectral,
                                fallbackRecipe: fallback,
                                dmcMatches: dmc
                            })
                            setLabel('')
                        } catch (e) {
                            console.error('Failed to pin color', e)
                        } finally {
                            setIsPinning(false)
                        }
                    }}
                    disabled={isPinning || isPinned}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${isPinned
                        ? 'bg-green-100 text-green-600 border border-green-200'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'
                        }`}
                >
                    {isPinning ? (
                        <span className="flex items-center gap-2">
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Pinning...
                        </span>
                    ) : isPinned ? (
                        <>✓ Pinned</>
                    ) : (
                        <>📌 Pin Color</>
                    )}
                </button>

                <button
                    onClick={async () => {
                        const dmc = findClosestDMCColors(rgb, 5)
                        const luminance = getLuminance(rgb.r, rgb.g, rgb.b) / 100

                        let descriptiveName = ''
                        try {
                            const nameMatch = await getColorName(hex)
                            descriptiveName = nameMatch.name
                        } catch (e) {
                            console.error('Failed to get color name', e)
                        }

                        const newCard: ColorCard = {
                            id: crypto.randomUUID(),
                            name: label.trim() || descriptiveName || `Color ${hex}`,
                            colorName: descriptiveName,
                            createdAt: Date.now(),
                            color: { hex, rgb, hsl, luminance },
                            valueStep: sampledColor.valueMetadata?.step,
                            dmcMatches: dmc,
                            paintMatches: [],
                        }
                        setPendingCard(newCard)
                        setShowCardModal(true)
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all bg-purple-600 hover:bg-purple-500 text-white shadow-lg"
                >
                    🎴 Card
                </button>

                {onAddToSession && (
                    <button
                        onClick={() => onAddToSession({ hex, rgb })}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all bg-amber-500 hover:bg-amber-400 text-white shadow-lg"
                        title="Add to Session Palette"
                    >
                        +
                    </button>
                )}
            </div>

            {/* Full Screen Color Overlay */}
            <FullScreenOverlay
                isOpen={showColorFullScreen}
                onClose={() => setShowColorFullScreen(false)}
                backgroundColor={hex}
            />

            {/* Color Card Modal */}
            <ColorCardModal
                isOpen={showCardModal}
                onClose={() => {
                    setShowCardModal(false)
                    setPendingCard(null)
                }}
                card={pendingCard}
                isNewCard={true}
                onCardSaved={() => setLabel('')}
            />
        </div>
    )
}
