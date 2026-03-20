'use client'

/**
 * SampleTab - The default "Sample" tab content
 * Shows the sampled color with hero swatch, value/chroma readouts, and actions
 */

import { useState, useEffect, useMemo } from 'react'
import ColorNamingDisplay from '../ColorNamingDisplay'
import FullScreenOverlay from '../FullScreenOverlay'
import ColorCardModal from '../ColorCardModal'
import PaintRecipe from '../PaintRecipe'
import { getPainterChroma, getLuminance, getValueBand } from '@/lib/paintingMath'
import { PinnedColor } from '@/lib/types/pinnedColor'
import { ColorCard } from '@/lib/types/colorCard'
import { Palette } from '@/lib/types/palette'
import { getColorName } from '@/lib/colorNaming'
import { getValueModeMetadataFromRgb, luminanceToGrayHex } from '@/lib/valueMode'
import { useIsMobile, useMediaQuery } from '@/hooks/useMediaQuery'
import { createColorCard, createPinnedColor } from '@/lib/colorArtifacts'

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
    lastSampleTime?: number
    activePalette: Palette
    simpleMode: boolean
    valueModeEnabled: boolean
    valueModeSteps: 5 | 7 | 9 | 11
    onAddToSession?: (color: { hex: string; rgb: { r: number; g: number; b: number } }) => void
    onSwitchToMatches?: () => void
}

export default function SampleTab({
    sampledColor,
    onPin,
    isPinned,
    lastSampleTime,
    activePalette,
    simpleMode,
    valueModeEnabled,
    valueModeSteps,
    onAddToSession,
    onSwitchToMatches
}: SampleTabProps) {
    const isMobile = useIsMobile()
    const isShortViewport = useMediaQuery('(max-height: 920px)')
    const [label, setLabel] = useState('')
    const [isPinning, setIsPinning] = useState(false)
    const [showColorFullScreen, setShowColorFullScreen] = useState(false)
    const [showCardModal, setShowCardModal] = useState(false)
    const [pendingCard, setPendingCard] = useState<ColorCard | null>(null)
    const [copied, setCopied] = useState<string | null>(null)
    const [colorName, setColorName] = useState<string>('')

    // Fetch color name for mobile display
    useEffect(() => {
        if (!sampledColor) {
            setColorName('')
            return
        }
        getColorName(sampledColor.hex)
            .then(result => setColorName(result.name))
            .catch(() => setColorName(''))
    }, [sampledColor])

    const recipeOptions = useMemo(() => {
        if (activePalette.isDefault) return undefined
        return {
            paletteColorIds: activePalette.colors.map(color => color.id),
        }
    }, [activePalette])

    if (!sampledColor) {
        return (
            <div className="h-full p-6 flex flex-col items-center justify-center bg-paper-elevated text-ink-secondary">
                <div className="w-16 h-16 rounded-full border-2 border-ink-hairline flex items-center justify-center mb-4">
                    <span className="text-2xl text-ink-faint">?</span>
                </div>
                <p className="text-center font-semibold text-ink">Tap or click the image to sample</p>
                <p className="text-sm text-ink-muted mt-2 text-center max-w-xs">
                    I’ll show you the paint mix, thread matches, and color name for that spot.
                </p>
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
    const recipeVariant = isMobile ? 'standard' : isShortViewport ? 'compact' : 'standard'

    const recipePanel = (
        <div className="space-y-3">
            <div className="flex items-end justify-between gap-3 px-1">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] font-black text-signal">Oil Paint Recipe</div>
                    <p className="text-xs text-ink-muted mt-1">A starting mix you can put on the palette right away.</p>
                </div>
                <div className="text-[10px] font-bold text-ink-faint uppercase tracking-widest text-right">
                    {activePalette.isDefault ? 'Core six-color mix' : activePalette.name}
                </div>
            </div>

            <PaintRecipe
                hsl={hsl}
                targetHex={hex}
                activePalette={activePalette}
                variant={recipeVariant}
                showExportButton={false}
            />
        </div>
    )

    const copyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text)
        setCopied(type)
        setTimeout(() => setCopied(null), 1500)
    }

    const handlePin = async () => {
        if (isPinned) return

        setIsPinning(true)
        try {
            const pinnedColor = await createPinnedColor(
                { hex, rgb, hsl },
                {
                    label: label.trim() || colorName || `Color ${hex}`,
                    solveOptions: recipeOptions,
                }
            )

            onPin(pinnedColor)
            setLabel('')
        } finally {
            setIsPinning(false)
        }
    }

    // Mobile-first, art-forward layout - COMPACT
    if (isMobile) {
        return (
            <div className="bg-paper-elevated text-ink font-sans min-h-full flex flex-col p-4 space-y-4">
                {/* Header-like row: Swatch + Name */}
                <div className="flex items-center gap-4">
                    <div
                        className="w-16 h-16 rounded-xl shadow-inner border border-ink-hairline flex-shrink-0"
                        style={{ backgroundColor: valueModeEnabled ? grayscaleHex : hex }}
                    />
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-ink truncate leading-tight">
                            {colorName || 'Analyzing...'}
                        </h2>
                        <p className="text-xs text-ink-muted uppercase tracking-wider font-bold">
                            {valueBand} • {chroma.label}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-mono font-bold text-ink">{hex}</div>
                    </div>
                </div>

                {/* Primary Readout Row: Value Step (if active) */}
                {valueModeEnabled && valueModeMeta && (
                    <div className="bg-paper-recessed rounded-xl p-3 flex items-center justify-between border border-ink-hairline">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-signal rounded-full animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-signal">Value Step</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-ink">{valueModeMeta.step}</span>
                            <span className="text-xs font-bold text-ink-faint">/ {valueModeSteps}</span>
                        </div>
                    </div>
                )}

                {/* Oil Paint Recipe */}
                {recipePanel}

                {/* Main Actions Row */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={handlePin}
                        disabled={isPinning || isPinned}
                        className={`flex items-center justify-center gap-2 py-4 px-4 rounded-xl text-sm font-bold transition-all ${isPinned
                            ? 'bg-subsignal-muted text-subsignal border border-subsignal'
                            : 'bg-signal text-white shadow-lg active:scale-95'
                            }`}
                    >
                        {isPinning ? 'Pinning…' : isPinned ? '✓ Pinned' : '📌 Pin'}
                    </button>

                    {onSwitchToMatches && (
                        <button
                            onClick={onSwitchToMatches}
                            className="flex items-center justify-center gap-2 py-4 px-4 bg-ink text-white rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19.5 4.5 L6.5 17.5" />
                                <circle cx="20.5" cy="3.5" r="1.5" />
                                <path d="M20.5 3.5 C22 2 23 4 21 6 C18 9 15 8 13 11 C11 14 12 17 9 19 C7 21 4 20 3 18" />
                            </svg>
                            <span>Threads</span>
                        </button>
                    )}
                </div>

                {/* Sub-actions / Copy */}
                <div className="flex gap-2">
                    <button
                        onClick={() => copyToClipboard(hex, 'hex')}
                        className="flex-1 py-2 rounded-lg bg-paper-recessed text-[11px] font-bold text-ink-secondary hover:text-ink transition-colors border border-ink-hairline"
                    >
                        {copied === 'hex' ? '✓ Copied' : `Copy HEX`}
                    </button>
                    <button
                        onClick={() => copyToClipboard(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, 'rgb')}
                        className="flex-1 py-2 rounded-lg bg-paper-recessed text-[11px] font-bold text-ink-secondary hover:text-ink transition-colors border border-ink-hairline"
                    >
                        {copied === 'rgb' ? '✓ Copied' : `Copy RGB`}
                    </button>
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

            {/* Oil Paint Recipe */}
            {recipePanel}

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
                    onClick={handlePin}
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
                            let descriptiveName = ''
                            try {
                                const nameMatch = await getColorName(hex)
                                descriptiveName = nameMatch.name
                            } catch (e) {
                                console.error('Failed to get color name', e)
                            }

                            const newCard: ColorCard = createColorCard(
                                { hex, rgb, hsl },
                                {
                                    name: label.trim() || descriptiveName || `Color ${hex}`,
                                    colorName: descriptiveName,
                                    valueStep: valueModeEnabled && valueModeMeta ? valueModeMeta.step : sampledColor.valueMetadata?.step,
                                }
                            )
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
