'use client'

/**
 * CompactToolbar — Editorial Modernism
 *
 * A calm, functional toolbar that recedes when not needed.
 * Uses the Editorial Modernism color system:
 * - Signal (red) for primary actions
 * - Subsignal (blue-gray) for utility actions
 * - Ink for text and icons
 * - Paper for backgrounds
 */

import { useState, useRef, useEffect } from 'react'
import { Palette } from '@/lib/types/palette'
import { CalibrationData } from '@/lib/calibration'
import { MeasurementLayer } from '@/lib/types/measurement'
import { CanvasSettings } from '@/lib/types/canvas'
import { TABS, TabType } from './CollapsibleSidebar'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useStore } from '@/lib/store/useStore'
import { WordmarkCompact } from './Wordmark'

interface CompactToolbarProps {
    calibration: CalibrationData | null
    calibrationStale: boolean
    onOpenCalibration: () => void
    onResetCalibration: () => void
    rulerGridEnabled: boolean
    rulerGridSpacing: 0.25 | 0.5 | 1 | 2
    onToggleRulerGrid: () => void
    onRulerGridSpacingChange: (spacing: 0.25 | 0.5 | 1 | 2) => void
    canvasSettings: CanvasSettings
    onOpenCanvasSettings: () => void
    measureMode: boolean
    measurePointA: { x: number; y: number } | null
    measurePointB: { x: number; y: number } | null
    onToggleMeasure: () => void
    measurementLayer: MeasurementLayer
    onToggleMeasurementLayer: () => void
    palettes: Palette[]
    activePalette: Palette
    onSelectPalette: (id: string) => void
    onOpenPaletteManager: () => void
    compactMode: boolean
    onToggleCompactMode: () => void
    hasImage: boolean
    activeTab?: TabType
    onTabChange?: (tab: TabType) => void
    onResetView?: () => void
}

const GridIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 3v18" />
    </svg>
)

const ValueIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2v20" />
        <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" fillOpacity="0.3" />
    </svg>
)

const MeasureIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4" />
        <path d="M12 18v4" />
        <path d="M2 12h4" />
        <path d="M18 12h4" />
    </svg>
)

const MoreIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="5" r="1.5" />
        <circle cx="12" cy="19" r="1.5" />
    </svg>
)

const LayoutIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <path d="M9 3v18" />
        <path d="M3 9h6" />
        <path d="M3 15h6" />
    </svg>
)

const FitIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h6v6" />
        <path d="M9 21H3v-6" />
        <path d="M21 3l-7 7" />
        <path d="M3 21l7-7" />
    </svg>
)

export default function CompactToolbar({
    calibration,
    calibrationStale,
    onOpenCalibration,
    onResetCalibration,
    rulerGridEnabled,
    rulerGridSpacing,
    onToggleRulerGrid,
    onRulerGridSpacingChange,
    measureMode,
    measurePointA,
    measurePointB,
    onToggleMeasure,
    measurementLayer,
    onToggleMeasurementLayer,
    palettes,
    activePalette,
    onSelectPalette,
    onOpenPaletteManager,
    compactMode,
    onToggleCompactMode,
    canvasSettings,
    onOpenCanvasSettings,
    hasImage,
    activeTab,
    onTabChange,
    onResetView
}: CompactToolbarProps) {
    const isMobile = useIsMobile()
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const valueModeEnabled = useStore(state => state.valueModeEnabled)
    const valueModeSteps = useStore(state => state.valueModeSteps)
    const toggleValueMode = useStore(state => state.toggleValueMode)
    const setValueModeSteps = useStore(state => state.setValueModeSteps)

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false)
            }
        }
        if (menuOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [menuOpen])

    // Mobile: Ergonomic Bottom-Anchored Toolbar
    if (isMobile) {
        if (!hasImage) return null;

        return (
            <div className="fixed bottom-0 left-0 right-0 z-[60] safe-area-bottom">
                <div className="mx-3 mb-3 paper-panel-raised flex items-center justify-around h-14 px-2 shadow-2xl border-ink-hairline bg-paper-elevated/95 backdrop-blur-md">
                    {/* Snap to Fit - Critical for mobile navigation sanity */}
                    <button
                        onClick={onResetView}
                        className="flex flex-col items-center justify-center w-12 h-12 text-ink-secondary hover:text-signal transition-colors"
                        aria-label="Snap to Fit"
                    >
                        <FitIcon />
                        <span className="text-[9px] mt-0.5 font-bold uppercase tracking-tighter">Fit</span>
                    </button>

                    {/* Value Mode Toggle */}
                    <button
                        onClick={() => toggleValueMode()}
                        className={`flex flex-col items-center justify-center w-12 h-12 transition-colors ${valueModeEnabled ? 'text-signal' : 'text-ink-secondary'
                            }`}
                        aria-label="Toggle Value Mode"
                    >
                        <ValueIcon />
                        <span className="text-[9px] mt-0.5 font-bold uppercase tracking-tighter">Value</span>
                    </button>

                    {/* Grid Toggle */}
                    <button
                        onClick={onToggleRulerGrid}
                        disabled={!calibration}
                        className={`flex flex-col items-center justify-center w-12 h-12 transition-colors ${rulerGridEnabled ? 'text-subsignal' : 'text-ink-secondary'
                            } ${!calibration ? 'opacity-30' : ''}`}
                        aria-label="Toggle Grid"
                    >
                        <GridIcon />
                        <span className="text-[9px] mt-0.5 font-bold uppercase tracking-tighter">Grid</span>
                    </button>

                    {/* Measure Mode Toggle */}
                    <button
                        onClick={onToggleMeasure}
                        disabled={!calibration}
                        className={`flex flex-col items-center justify-center w-12 h-12 transition-colors ${measureMode ? 'text-signal' : 'text-ink-secondary'
                            } ${!calibration ? 'opacity-30' : ''}`}
                        aria-label="Toggle Measure"
                    >
                        <MeasureIcon />
                        <span className="text-[9px] mt-0.5 font-bold uppercase tracking-tighter">Measure</span>
                    </button>

                    {/* Navigation Tab Switcher Shorthand */}
                    <button
                        onClick={() => onTabChange?.(activeTab === 'sample' ? 'matches' : 'sample')}
                        className="flex flex-col items-center justify-center w-12 h-12 text-ink-secondary hover:text-subsignal transition-colors"
                        aria-label="Switch Tab"
                    >
                        <LayoutIcon />
                        <span className="text-[9px] mt-0.5 font-bold uppercase tracking-tighter">
                            {activeTab === 'sample' ? 'Match' : 'Pick'}
                        </span>
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className={`p-3 paper-panel-raised flex items-center justify-between transition-all duration-200`}>
            {/* Wordmark - minimal */}
            {hasImage && (
                <div className="flex-1 flex items-center justify-center">
                    <WordmarkCompact />
                </div>
            )}
            {!hasImage && (
                <div className="flex-1 flex items-center justify-center">
                    <WordmarkCompact />
                </div>
            )}

            {/* Single Settings Menu - Everything Hidden */}
            {hasImage && (
                <div ref={menuRef} className={`relative`}>
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="toolbar-btn w-10 h-10 p-0"
                        title="Settings"
                    >
                        <MoreIcon />
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 top-full mt-2 paper-panel-raised py-2 z-50 min-w-[200px] shadow-lg">
                            {/* Value Mode - Desktop only (hidden on mobile/tablet for art-first simplicity) */}
                            {!isMobile && (
                                <div className="px-4 py-2 border-b border-ink-hairline">
                                    <div className="text-section mb-2">View</div>
                                    <div className="space-y-1">
                                        <button
                                            onClick={() => {
                                                if (!valueModeEnabled) {
                                                    toggleValueMode()
                                                } else {
                                                    toggleValueMode()
                                                }
                                                setMenuOpen(false)
                                            }}
                                            className={`w-full px-4 py-2 text-left text-sm font-medium transition-colors ${valueModeEnabled
                                                ? 'bg-signal-muted text-signal'
                                                : 'text-ink hover:bg-paper-recessed'
                                                }`}
                                        >
                                            Value Mode {valueModeEnabled && `(${valueModeSteps} steps)`}
                                        </button>
                                        {valueModeEnabled && (
                                            <div className="pl-4 space-y-1">
                                                {([5, 7, 9, 11] as const).map((steps) => (
                                                    <button
                                                        key={steps}
                                                        onClick={() => {
                                                            setValueModeSteps(steps)
                                                            setMenuOpen(false)
                                                        }}
                                                        className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${valueModeSteps === steps
                                                            ? 'bg-signal-muted text-signal'
                                                            : 'text-ink hover:bg-paper-recessed'
                                                            }`}
                                                    >
                                                        {steps} steps
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tools - Desktop only (hidden on mobile/tablet) */}
                            {!isMobile && (
                                <div className="px-4 py-2 border-b border-ink-hairline">
                                    <div className="text-section mb-2">Tools</div>
                                    <div className="space-y-1">
                                        <button
                                            onClick={() => {
                                                onOpenCalibration()
                                                setMenuOpen(false)
                                            }}
                                            className={`w-full px-4 py-2 text-left text-sm font-medium transition-colors ${calibration
                                                ? 'bg-subsignal-muted text-subsignal'
                                                : 'text-ink hover:bg-paper-recessed'
                                                }`}
                                        >
                                            {calibration ? '✓ Calibrated' : 'Calibrate'}
                                        </button>
                                        {calibration && (
                                            <button
                                                onClick={() => {
                                                    onResetCalibration()
                                                    setMenuOpen(false)
                                                }}
                                                className="w-full px-4 py-2 text-left text-xs text-ink-muted hover:text-signal transition-colors"
                                            >
                                                Reset Calibration
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                onOpenCanvasSettings()
                                                setMenuOpen(false)
                                            }}
                                            className={`w-full px-4 py-2 text-left text-sm font-medium transition-colors ${canvasSettings.enabled
                                                ? 'bg-signal-muted text-signal'
                                                : 'text-ink hover:bg-paper-recessed'
                                                }`}
                                        >
                                            Canvas Settings
                                        </button>
                                        <button
                                            onClick={() => {
                                                onToggleRulerGrid()
                                                setMenuOpen(false)
                                            }}
                                            disabled={!calibration}
                                            className={`w-full px-4 py-2 text-left text-sm font-medium transition-colors ${rulerGridEnabled && calibration
                                                ? 'bg-signal-muted text-signal'
                                                : 'text-ink hover:bg-paper-recessed'
                                                } ${!calibration ? 'opacity-40 cursor-not-allowed' : ''}`}
                                        >
                                            Ruler Grid
                                        </button>
                                        <button
                                            onClick={() => {
                                                onToggleMeasure()
                                                setMenuOpen(false)
                                            }}
                                            disabled={!calibration}
                                            className={`w-full px-4 py-2 text-left text-sm font-medium transition-colors ${measureMode && calibration
                                                ? 'bg-signal-muted text-signal'
                                                : 'text-ink hover:bg-paper-recessed'
                                                } ${!calibration ? 'opacity-40 cursor-not-allowed' : ''}`}
                                        >
                                            Measure
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Palette */}
                            <div className="px-4 py-2">
                                <div className="text-section mb-2">Palette</div>
                                <select
                                    value={activePalette.id}
                                    onChange={(e) => onSelectPalette(e.target.value)}
                                    className="w-full px-3 py-2 paper-well text-ink text-sm font-medium focus:border-ink-muted outline-none mb-2"
                                >
                                    {palettes.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => {
                                        onOpenPaletteManager()
                                        setMenuOpen(false)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-ink hover:bg-paper-recessed transition-colors"
                                >
                                    Manage Palettes
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
