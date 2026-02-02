'use client'

/**
 * SampleTab - The default "Sample" tab content
 * Shows the sampled color with hero swatch, value/chroma readouts, and actions
 */

import { useState, useEffect } from 'react'
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
import { useStore } from '@/lib/store/useStore'
import { getValueModeMetadataFromRgb, luminanceToGrayHex } from '@/lib/valueMode'
import { useIsMobile } from '@/hooks/useMediaQuery'

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
    onSwitchToMatches?: () => void
}

export default function SampleTab({
    sampledColor,
    onPin,
    isPinned,
    valueScaleSettings,
    lastSampleTime,
    onAddToSession,
    onSwitchToMatches
}: SampleTabProps) {
    const isMobile = useIsMobile()
    const [label, setLabel] = useState('')
    const [isPinning, setIsPinning] = useState(false)
    const [showColorFullScreen, setShowColorFullScreen] = useState(false)
    const [showCardModal, setShowCardModal] = useState(false)
    const [pendingCard, setPendingCard] = useState<ColorCard | null>(null)
    const [copied, setCopied] = useState<string | null>(null)
    const [colorName, setColorName] = useState<string>('')
    const {
        simpleMode,
        valueModeEnabled,
        valueModeSteps
    } = useStore()

    // Fetch color name for mobile display
    useEffect(() => {
        if (!sampledColor) {
            setColorName('')
            return
        }
        getColorName(sampledColor.hex)
            .then(result => setColorName(result.name))
            .catch(() => setColorName(''))
    }, [sampledColor?.hex])

    if (!sampledColor) {
        return (
            <div className="h-full p-6 flex flex-col items-center justify-center bg-paper-elevated text-ink-secondary">
                <div className="w-16 h-16 rounded-full border-2 border-ink-hairline flex items-center justify-center mb-4">
                    <span className="text-2xl text-ink-faint">?</span>
                </div>
                <p className="text-center font-semibold text-ink">Click image to sample</p>
                <p className="text-sm text-ink-muted mt-2">Pick a color to analyze</p>
            </div>
        )
    }

    const { hex, rgb, hsl } = sampledColor
    const chroma = getPainterChroma(hex)

    // Value readout
    const valuePercent = getLuminance(rgb.r, rgb.g, rgb.b)
    const valueBand = getValueBand(valuePercent)

    const valueModeMeta = valueModeEnabled ? getValueModeMetadataFromRgb(rgb, valueModeSteps) : null
    const valueModeGrayHex = valueModeMeta ? luminanceToGrayHex(valueModeMeta.y) : null
    const grayscaleHex = valueModeGrayHex ?? `#${Math.round(valuePercent * 2.55).toString(16).padStart(2, '0').repeat(3)}`

    const copyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text)
        setCopied(type)
        setTimeout(() => setCopied(null), 1500)
    }

    // Mobile-first, art-forward layout
    if (isMobile) {
        return (
            <div className="bg-paper-elevated text-ink font-sans min-h-full flex flex-col">
                {/* Large, prominent color swatch - no hex overlay, just pure color */}
                <div
                    className="w-full flex-shrink-0"
                    style={{ 
                        height: '40vh',
                        minHeight: '300px',
                        backgroundColor: valueModeEnabled ? grayscaleHex : hex 
                    }}
                />

                {/* Color info - simple, art-forward */}
                <div className="flex-1 p-6 space-y-6">
                    {/* Color Name - prominent */}
                    <div>
                        <h2 className="text-3xl font-black text-ink tracking-tight leading-tight mb-2">
                            {colorName || 'Analyzing...'}
                        </h2>
                        <p className="text-sm text-ink-muted">
                            {valueBand} • {chroma}
                        </p>
                    </div>

                    {/* DMC Threads Button - prominent */}
                    {onSwitchToMatches && (
                        <button
                            onClick={onSwitchToMatches}
                            className="w-full py-5 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19.5 4.5 L6.5 17.5" strokeWidth="2" />
                                <circle cx="20.5" cy="3.5" r="1.5" />
                                <path d="M20.5 3.5 C22 2 23 4 21 6 C18 9 15 8 13 11 C11 14 12 17 9 19 C7 21 4 20 3 18" />
                            </svg>
                            <span>Match DMC Threads</span>
                        </button>
                    )}
                </div>
            </div>
        )
    }

    // Desktop layout (unchanged for now)
    return (
        <div className="bg-paper-elevated text-ink font-sans min-h-full p-4 lg:p-6 space-y-4">
            {/* Value Mode Active Indicator - shows when enabled via toolbar */}
            {valueModeEnabled && (
                <div className="flex items-center gap-2 bg-subsignal-muted border border-subsignal rounded-xl px-4 py-2">
                    <div className="w-2 h-2 bg-signal rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-signal uppercase tracking-widest">
                        Value Mode Active ({valueModeSteps} steps)
                    </span>
                    <span className="text-xs text-signal ml-auto">Press V to toggle</span>
                </div>
            )}

            {/* Giant Hero Swatch - No hex overlay, clean */}
            <div
                className="w-full aspect-[4/3] rounded-2xl shadow-lg border-2 border-ink-hairline relative overflow-hidden group transition-all duration-500 cursor-pointer"
                style={{ backgroundColor: valueModeEnabled ? grayscaleHex : hex }}
                onClick={() => setShowColorFullScreen(true)}
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent pointer-events-none"></div>
                <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-2xl"></div>
                <button
                    onClick={(e) => { e.stopPropagation(); setShowColorFullScreen(true) }}
                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-black/30 hover:bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-sm"
                    title="View full screen"
                >
                    <span className="text-lg">⛶</span>
                </button>
            </div>

            {/* Color Name */}
            <ColorNamingDisplay hex={hex} key={lastSampleTime} />

            {/* Primary Readout */}
            {valueModeEnabled && valueModeMeta ? (
                <div className="flex flex-col items-center justify-center gap-1">
                    <div className="text-[10px] uppercase tracking-widest font-black text-ink-faint">Value Step</div>
                    <div className="font-mono text-5xl lg:text-6xl font-black tabular-nums text-ink">{valueModeMeta.step}</div>
                    <div className="text-xs font-bold text-ink-faint">of {valueModeSteps}</div>
                </div>
            ) : null}

            {/* HEX Display with Copy */}
            <div className="flex items-center justify-center gap-3">
                <h2 className="text-3xl lg:text-4xl font-black tracking-tighter font-mono text-ink tabular-nums">{hex}</h2>
                <button
                    onClick={() => copyToClipboard(hex, 'hex')}
                    className="p-2 rounded-lg hover:bg-paper-recessed transition-colors text-ink-faint hover:text-ink"
                    title="Copy HEX"
                >
                    {copied === 'hex' ? '✓' : '📋'}
                </button>
            </div>

            {/* Quick Copy Buttons - Simplified in Simple Mode */}
            {!simpleMode && (
                <div className="flex justify-center gap-2 text-xs">
                    <button
                        onClick={() => copyToClipboard(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, 'rgb')}
                        className={`px-3 py-1.5 rounded-lg border transition-all ${copied === 'rgb' ? 'bg-subsignal-muted border-subsignal text-subsignal' : 'border-ink-hairline hover:bg-paper-recessed text-ink-faint'}`}
                    >
                        {copied === 'rgb' ? '✓ Copied' : `RGB ${rgb.r}, ${rgb.g}, ${rgb.b}`}
                    </button>
                    <button
                        onClick={() => copyToClipboard(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, 'hsl')}
                        className={`px-3 py-1.5 rounded-lg border transition-all ${copied === 'hsl' ? 'bg-subsignal-muted border-subsignal text-subsignal' : 'border-ink-hairline hover:bg-paper-recessed text-ink-faint'}`}
                    >
                        {copied === 'hsl' ? '✓ Copied' : `HSL ${hsl.h}°`}
                    </button>
                </div>
            )}

            {/* Value & Chroma Readout */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center bg-paper-recessed p-4 rounded-lg border border-ink-hairline">
                    <span className="text-signal text-[10px] uppercase font-black tracking-widest mb-1">Value</span>
                    <span className="font-mono text-3xl text-ink font-black tabular-nums">
                        {valueModeEnabled && valueModeMeta ? Math.round(valueModeMeta.y * 100) : (sampledColor.valueMetadata ? Math.round(sampledColor.valueMetadata.y * 100) : valuePercent)}%
                    </span>

                    {valueModeEnabled && valueModeMeta ? (
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-4 h-4 rounded-sm border border-ink-hairline" style={{ backgroundColor: grayscaleHex }}></div>
                            <span className="text-ink-secondary font-mono text-sm font-bold">Step {valueModeMeta.step} / {valueModeSteps}</span>
                        </div>
                    ) : sampledColor.valueMetadata ? (
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-4 h-4 rounded-sm border border-ink-hairline" style={{ backgroundColor: grayscaleHex }}></div>
                            <span className="text-ink-secondary font-mono text-sm font-bold">Step {sampledColor.valueMetadata.step}</span>
                        </div>
                    ) : (
                        <span className="text-[10px] text-ink-muted font-bold uppercase mt-1">{valueBand}</span>
                    )}
                </div>

                <div className="flex flex-col items-center bg-paper-recessed p-4 rounded-lg border border-ink-hairline">
                    <span className="text-ink-faint text-[10px] uppercase font-bold tracking-widest mb-1">Chroma</span>
                    <span className="font-mono text-2xl text-ink font-black">{chroma.label}</span>
                </div>
            </div>

            {/* Label Input - Hidden in Simple Mode */}
            {!simpleMode && (
                <input
                    type="text"
                    placeholder="Add a label/note..."
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full bg-paper-elevated border border-ink-hairline rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-signal transition-all"
                />
            )}

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
                        ? 'bg-subsignal-muted text-subsignal border border-subsignal'
                        : 'bg-signal hover:bg-signal-hover text-white shadow-lg'
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

                {/* Make Card - Pro mode only */}
                {!simpleMode && (
                    <button
                        onClick={async () => {
                            const dmc = findClosestDMCColors(rgb, 5)
                            const luminance = (valueModeMeta?.y ?? (getLuminance(rgb.r, rgb.g, rgb.b) / 100))

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
                                valueStep: valueModeEnabled && valueModeMeta ? valueModeMeta.step : sampledColor.valueMetadata?.step,
                                dmcMatches: dmc,
                                paintMatches: [],
                            }
                            setPendingCard(newCard)
                            setShowCardModal(true)
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all bg-subsignal hover:bg-subsignal-hover text-white shadow-lg"
                    >
                        🎴 Card
                    </button>
                )}

                {/* Add to Session - Pro mode only */}
                {!simpleMode && onAddToSession && (
                    <button
                        onClick={() => onAddToSession({ hex, rgb })}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all bg-signal-muted0 hover:bg-amber-400 text-white shadow-lg"
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
