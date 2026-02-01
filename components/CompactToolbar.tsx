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
import Link from 'next/link'
import { Palette } from '@/lib/types/palette'
import { CalibrationData } from '@/lib/calibration'
import { MeasurementLayer } from '@/lib/types/measurement'
import { CanvasSettings } from '@/lib/types/canvas'
import { TABS, TabType } from './CollapsibleSidebar'
import { useIsMobile } from '@/hooks/useMediaQuery'
import SimpleAdvancedToggle from './SimpleAdvancedToggle'
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
    onOpenCheckValues?: () => void
    onOpenCheckDrawing?: () => void
    activeTab?: TabType
    onTabChange?: (tab: TabType) => void
}

// Icon components for cleaner rendering
const ScaleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v18" />
        <path d="M5 8h14" />
        <path d="M5 8l-2 8h6l-2-8" />
        <path d="M19 8l-2 8h6l-2-8" />
    </svg>
)

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

const RulerIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h20" />
        <path d="M6 8v4" />
        <path d="M10 6v6" />
        <path d="M14 8v4" />
        <path d="M18 6v6" />
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

const CanvasIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M15 3v6" />
    </svg>
)

const CalibrationIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h4" />
        <path d="M18 12h4" />
        <path d="M12 2v4" />
        <path d="M12 18v4" />
        <rect x="6" y="6" width="12" height="12" rx="2" />
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

const ToolsIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 5v14M5 12h14" />
    </svg>
)

const ChevronDownIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M6 9l6 6 6-6" />
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
    onOpenCheckValues,
    onOpenCheckDrawing
}: CompactToolbarProps) {
    const isMobile = useIsMobile()
    const [menuOpen, setMenuOpen] = useState(false)
    const [showAdvancedTools, setShowAdvancedTools] = useState(false)
    const [showValueModeDropdown, setShowValueModeDropdown] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const valueModeRef = useRef<HTMLDivElement>(null)
    const simpleMode = useStore(state => state.simpleMode)
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
            if (valueModeRef.current && !valueModeRef.current.contains(e.target as Node)) {
                setShowValueModeDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Mobile simplified toolbar
    if (isMobile) {
        return (
            <div className="p-3 paper-panel-raised flex items-center gap-3">
                {hasImage && (
                    <>
                        <WordmarkCompact />
                        <div className="flex-1" />
                        {/* Status indicators - minimal, structural */}
                        {calibration && (
                            <span className="w-2 h-2 rounded-full bg-subsignal" title="Calibrated" />
                        )}
                        {canvasSettings.enabled && (
                            <span className="w-2 h-2 rounded-full bg-signal" title="Canvas configured" />
                        )}
                    </>
                )}
                {!hasImage && (
                    <div className="mx-auto">
                        <WordmarkCompact />
                    </div>
                )}
            </div>
        )
    }

    const advancedToolsVisible = !simpleMode || showAdvancedTools

    return (
        <div className={`p-4 paper-panel-raised flex flex-wrap items-center gap-4 transition-all duration-200 ${compactMode ? 'toolbar-compact' : ''}`}>
            {/* Wordmark - Only show when image is loaded */}
            <div className={`mr-4 transition-all duration-300 overflow-hidden ${(!hasImage || compactMode) ? 'w-0 opacity-0 pointer-events-none' : 'w-auto opacity-100'}`}>
                <WordmarkCompact />
            </div>

            {/* Simple/Advanced Toggle */}
            <SimpleAdvancedToggle />

            <div className="h-6 w-px bg-ink-hairline mx-1 hidden md:block" />

            {/* Check My Values Button - Primary action, uses signal sparingly */}
            {hasImage && onOpenCheckValues && (
                <button
                    onClick={onOpenCheckValues}
                    className="toolbar-btn toolbar-btn-subsignal active"
                    title="Check My Values - Compare reference and WIP (9)"
                >
                    <ScaleIcon />
                    <span className={`toolbar-label ${compactMode ? 'hidden' : ''}`}>Values</span>
                </button>
            )}

            {/* Check My Drawing Button */}
            {hasImage && onOpenCheckDrawing && (
                <button
                    onClick={onOpenCheckDrawing}
                    className="toolbar-btn"
                    title="Check My Drawing - Overlay WIP with perspective warp (0)"
                >
                    <GridIcon />
                    <span className={`toolbar-label ${compactMode ? 'hidden' : ''}`}>Drawing</span>
                </button>
            )}

            {/* Value Mode Toggle */}
            {hasImage && (
                <div ref={valueModeRef} className="relative">
                    <button
                        onClick={() => {
                            if (!valueModeEnabled) {
                                toggleValueMode()
                            } else {
                                setShowValueModeDropdown(!showValueModeDropdown)
                            }
                        }}
                        className={`toolbar-btn ${valueModeEnabled ? 'active' : ''}`}
                        title={`Value Mode - Toggle grayscale view (V) ${valueModeEnabled ? `- ${valueModeSteps} steps` : ''}`}
                    >
                        <ValueIcon />
                        <span className={`toolbar-label ${compactMode ? 'hidden' : ''}`}>
                            {valueModeEnabled ? `Value: ${valueModeSteps}` : 'Value'}
                        </span>
                        {valueModeEnabled && <ChevronDownIcon />}
                    </button>

                    {/* Dropdown for step selection */}
                    {showValueModeDropdown && valueModeEnabled && (
                        <div className="absolute top-full left-0 mt-2 paper-panel-raised py-2 z-50 min-w-[140px]">
                            <div className="px-3 py-2 text-section border-b border-ink-hairline">
                                Value Steps
                            </div>
                            {([5, 7, 9, 11] as const).map((steps) => (
                                <button
                                    key={steps}
                                    onClick={() => {
                                        setValueModeSteps(steps)
                                        setShowValueModeDropdown(false)
                                    }}
                                    className={`w-full px-4 py-2 text-left text-sm font-medium transition-colors ${
                                        valueModeSteps === steps
                                            ? 'bg-signal-muted text-signal'
                                            : 'text-ink hover:bg-paper-recessed'
                                    }`}
                                >
                                    {steps} steps {valueModeSteps === steps && '·'}
                                </button>
                            ))}
                            <div className="border-t border-ink-hairline mt-2 pt-2">
                                <button
                                    onClick={() => {
                                        toggleValueMode()
                                        setShowValueModeDropdown(false)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm font-medium text-signal hover:bg-signal-muted transition-colors"
                                >
                                    Turn Off
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Advanced Tools Expand Button - Only in Simple Mode */}
            {simpleMode && (
                <button
                    onClick={() => setShowAdvancedTools(!showAdvancedTools)}
                    className={`toolbar-btn ${showAdvancedTools ? 'active' : ''}`}
                    title="Show/hide measurement tools"
                    aria-expanded={showAdvancedTools}
                >
                    <ToolsIcon />
                    <span className="hidden sm:inline">Tools</span>
                </button>
            )}

            {/* Advanced Tools Section */}
            {advancedToolsVisible && (
                <>
                    {simpleMode && <div className="w-px h-5 bg-ink-hairline" />}

                    {/* Calibrate Button */}
                    <button
                        onClick={onOpenCalibration}
                        className={`toolbar-btn ${calibration ? 'toolbar-btn-subsignal active' : 'btn-signal'}`}
                        title="Calibrate screen for measurements"
                    >
                        <CalibrationIcon />
                        <span className={`toolbar-label ${compactMode ? 'hidden' : ''}`}>
                            {calibration ? 'Calibrated' : 'Calibrate'}
                        </span>
                    </button>

                    {/* Canvas Settings Button */}
                    <button
                        onClick={onOpenCanvasSettings}
                        className={`toolbar-btn ${canvasSettings.enabled ? 'active' : ''}`}
                        title="Canvas Settings (Set physical dimensions)"
                    >
                        <CanvasIcon />
                        <span className={`toolbar-label ${compactMode ? 'hidden' : ''}`}>
                            {canvasSettings.enabled ? `${canvasSettings.width}×${canvasSettings.height}${canvasSettings.unit}` : 'Canvas'}
                        </span>
                    </button>

                    {/* Stale Warning */}
                    {calibration && calibrationStale && (
                        <span className="text-xs text-ink-muted responsive-hide-compact">
                            Zoom changed
                        </span>
                    )}

                    {/* Reset Calibration */}
                    {calibration && (
                        <button
                            onClick={onResetCalibration}
                            className="px-2 py-1 text-xs text-ink-muted hover:text-signal transition-colors responsive-hide-compact"
                            title="Reset calibration"
                        >
                            Reset
                        </button>
                    )}

                    <div className="w-px h-5 bg-ink-hairline" />

                    {/* Ruler Grid Toggle */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onToggleRulerGrid}
                            disabled={!calibration}
                            className={`toolbar-btn ${rulerGridEnabled && calibration ? 'active' : ''} ${!calibration ? 'opacity-40 cursor-not-allowed' : ''}`}
                            title="Toggle ruler grid"
                        >
                            <RulerIcon />
                            <span className={`toolbar-label ${compactMode ? 'hidden' : ''}`}>Grid</span>
                        </button>

                        {rulerGridEnabled && calibration && (
                            <select
                                value={rulerGridSpacing}
                                onChange={(e) => onRulerGridSpacingChange(Number(e.target.value) as 0.25 | 0.5 | 1 | 2)}
                                className="px-2 py-1.5 paper-well text-ink text-xs font-mono focus:border-ink-muted outline-none"
                            >
                                <option value={0.25}>0.25&quot;</option>
                                <option value={0.5}>0.5&quot;</option>
                                <option value={1}>1&quot;</option>
                                <option value={2}>2&quot;</option>
                            </select>
                        )}
                    </div>

                    {/* Measure Toggle */}
                    <button
                        onClick={onToggleMeasure}
                        disabled={!calibration}
                        className={`toolbar-btn ${measureMode && calibration ? 'active' : ''} ${!calibration ? 'opacity-40 cursor-not-allowed' : ''}`}
                        title="Toggle measure mode"
                    >
                        <MeasureIcon />
                        <span className={`toolbar-label ${compactMode ? 'hidden' : ''}`}>Measure</span>
                    </button>

                    {measureMode && (
                        <>
                            {/* Layer Toggle Button */}
                            <button
                                onClick={onToggleMeasurementLayer}
                                className={`toolbar-btn ${measurementLayer === 'reference' ? 'toolbar-btn-subsignal active' : 'active'}`}
                                title="Toggle measurement layer (Reference/Painting)"
                            >
                                {measurementLayer === 'reference' ? 'Ref' : 'Paint'}
                            </button>
                            <span className="text-xs text-ink-muted responsive-hide-compact">
                                {!measurePointA ? 'Click first point' : !measurePointB ? 'Click second point' : 'Click to remeasure'}
                            </span>
                        </>
                    )}

                    {!calibration && !simpleMode && (
                        <span className="text-xs text-ink-muted ml-auto responsive-hide-compact">
                            Calibrate to use ruler & measure
                        </span>
                    )}
                </>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Compact Mode Toggle */}
            {!simpleMode && (
                <button
                    onClick={onToggleCompactMode}
                    className={`toolbar-btn ${compactMode ? 'active' : ''}`}
                    title={`${compactMode ? 'Disable' : 'Enable'} compact mode (Ctrl+\\)`}
                >
                    <LayoutIcon />
                    <span className="responsive-hide-compact uppercase tracking-caps">{compactMode ? 'Compact' : 'Normal'}</span>
                </button>
            )}

            {/* Hamburger Menu */}
            <div ref={menuRef} className={`hamburger-menu ${menuOpen ? 'open' : ''}`}>
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="toolbar-btn w-10 h-10"
                    title="More options"
                >
                    <MoreIcon />
                </button>

                <div className="hamburger-dropdown paper-panel-raised">
                    {/* Navigation Tabs - Mobile Only */}
                    {isMobile && (
                        <div className="border-b border-ink-hairline pb-2 mb-2">
                            <div className="px-4 py-2 text-section">Navigation</div>
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        onTabChange?.(tab.id)
                                        setMenuOpen(false)
                                    }}
                                    className={`hamburger-item ${activeTab === tab.id ? 'bg-signal-muted text-signal' : ''}`}
                                >
                                    <span className="w-5 h-5 flex items-center justify-center">{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                            <button
                                onClick={() => {
                                    onTabChange?.('pinned')
                                    setMenuOpen(false)
                                }}
                                className={`hamburger-item ${activeTab === 'pinned' ? 'bg-signal-muted text-signal' : ''}`}
                            >
                                <span className="w-5 h-5 flex items-center justify-center">·</span>
                                Pinned
                            </button>
                            <button
                                onClick={() => {
                                    onTabChange?.('cards')
                                    setMenuOpen(false)
                                }}
                                className={`hamburger-item ${activeTab === 'cards' ? 'bg-subsignal-muted text-subsignal' : ''}`}
                            >
                                <span className="w-5 h-5 flex items-center justify-center">·</span>
                                Color Cards
                            </button>
                        </div>
                    )}

                    {/* Palette Selector */}
                    <div className="px-4 py-3 border-b border-ink-hairline">
                        <span className="text-section">Active Palette</span>
                        <select
                            value={activePalette.id}
                            onChange={(e) => onSelectPalette(e.target.value)}
                            className="w-full mt-2 px-3 py-2 paper-well text-ink text-sm font-medium focus:border-ink-muted outline-none"
                        >
                            {palettes.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => {
                            onOpenPaletteManager()
                            setMenuOpen(false)
                        }}
                        className="hamburger-item"
                    >
                        Manage Palettes
                    </button>

                    <Link
                        href="/color-theory"
                        className="hamburger-item"
                        onClick={() => setMenuOpen(false)}
                    >
                        Color Theory Lab
                    </Link>

                    <div className="border-t border-ink-hairline mt-1 pt-1">
                        <div className="px-4 py-3 text-caption">
                            <div className="flex justify-between">
                                <span>Toggle Panel</span>
                                <span className="font-mono">Ctrl+P</span>
                            </div>
                            <div className="flex justify-between mt-2">
                                <span>Compact Mode</span>
                                <span className="font-mono">Ctrl+\</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
