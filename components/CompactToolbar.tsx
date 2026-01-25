'use client'

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

interface CompactToolbarProps {
    // Calibration
    calibration: CalibrationData | null
    calibrationStale: boolean
    onOpenCalibration: () => void
    onResetCalibration: () => void

    // Ruler Grid
    rulerGridEnabled: boolean
    rulerGridSpacing: 0.25 | 0.5 | 1 | 2
    onToggleRulerGrid: () => void
    onRulerGridSpacingChange: (spacing: 0.25 | 0.5 | 1 | 2) => void

    // Canvas Settings
    canvasSettings: CanvasSettings
    onOpenCanvasSettings: () => void

    // Measure
    measureMode: boolean
    measurePointA: { x: number; y: number } | null
    measurePointB: { x: number; y: number } | null
    onToggleMeasure: () => void
    measurementLayer: MeasurementLayer
    onToggleMeasurementLayer: () => void

    // Palette
    palettes: Palette[]
    activePalette: Palette
    onSelectPalette: (id: string) => void
    onOpenPaletteManager: () => void

    // Layout
    compactMode: boolean
    onToggleCompactMode: () => void

    // Context
    hasImage: boolean

    // Check My Values
    onOpenCheckValues?: () => void

    // Check My Drawing
    onOpenCheckDrawing?: () => void

    // Tabs (Mobile only)
    activeTab?: TabType
    onTabChange?: (tab: TabType) => void
}

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
    const { simpleMode, valueModeEnabled, valueModeSteps, toggleValueMode, setValueModeSteps } = useStore()

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

    // Mobile simplified toolbar - just shows wordmark and stays out of the way
    // MobileNavigation component handles all navigation on mobile
    if (isMobile) {
        return (
            <div className="p-3 bg-white/80 backdrop-blur-md rounded-2xl flex items-center gap-3 shadow-sm border border-gray-100">
                {hasImage && (
                    <>
                        <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
                            <h1 className="text-lg font-wordmark text-studio leading-none tracking-tight">
                                Color Wizard
                            </h1>
                        </Link>
                        <div className="flex-1" />
                        {/* Status indicators */}
                        {calibration && (
                            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                                📐
                            </span>
                        )}
                        {canvasSettings.enabled && (
                            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg border border-purple-100">
                                🖼️
                            </span>
                        )}
                    </>
                )}
                {!hasImage && (
                    <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity mx-auto">
                        <h1 className="text-xl font-wordmark text-studio leading-none tracking-tight">
                            Color Wizard
                        </h1>
                    </Link>
                )}
            </div>
        )
    }

    // Advanced tools that are hidden in simple mode
    const advancedToolsVisible = !simpleMode || showAdvancedTools

    return (
        <div className={`p-4 bg-white/80 backdrop-blur-md rounded-2xl flex flex-wrap items-center gap-4 shadow-sm border border-gray-100 transition-all duration-500 ${compactMode ? 'toolbar-compact' : ''}`}>
            {/* Wordmark - Only show when image is loaded */}
            <div className={`mr-4 transition-all duration-500 overflow-hidden ${(!hasImage || compactMode) ? 'w-0 opacity-0 pointer-events-none' : 'w-auto opacity-100 scale-100'}`}>
                <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
                    <h1 className="text-2xl font-wordmark text-studio leading-none tracking-tight whitespace-nowrap">
                        Color Wizard
                    </h1>
                </Link>
            </div>

            {/* Simple/Advanced Toggle */}
            <SimpleAdvancedToggle />

            <div className="h-8 w-px bg-gray-100 mx-2 hidden md:block" />

            {/* Check My Values Button - Always visible, primary action */}
            {hasImage && onOpenCheckValues && (
                <button
                    onClick={onOpenCheckValues}
                    className="toolbar-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100"
                    title="Check My Values - Compare reference and WIP (9)"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3v18" />
                        <path d="M5 8h14" />
                        <path d="M5 8l-2 8h6l-2-8" />
                        <path d="M19 8l-2 8h6l-2-8" />
                    </svg>
                    <span className={`toolbar-label ${compactMode ? 'hidden' : ''}`}>Values</span>
                </button>
            )}

            {/* Check My Drawing Button - Always visible, primary action */}
            {hasImage && onOpenCheckDrawing && (
                <button
                    onClick={onOpenCheckDrawing}
                    className="toolbar-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-100"
                    title="Check My Drawing - Overlay WIP with perspective warp (0)"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M3 9h18" />
                        <path d="M9 3v18" />
                    </svg>
                    <span className={`toolbar-label ${compactMode ? 'hidden' : ''}`}>Drawing</span>
                </button>
            )}

            {/* Value Mode Toggle - Global quick-access toggle */}
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
                        className={`toolbar-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm ${valueModeEnabled
                            ? 'bg-blue-600 text-white shadow-lg border border-blue-600'
                            : 'bg-gray-50 text-studio hover:bg-gray-100 border border-gray-100'
                            }`}
                        title={`Value Mode - Toggle grayscale view (V) ${valueModeEnabled ? `- ${valueModeSteps} steps` : ''}`}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 2v20" />
                            <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" fillOpacity="0.3" />
                        </svg>
                        <span className={`toolbar-label ${compactMode ? 'hidden' : ''}`}>
                            {valueModeEnabled ? `Value: ${valueModeSteps}` : 'Value'}
                        </span>
                        {valueModeEnabled && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        )}
                    </button>

                    {/* Dropdown for step selection */}
                    {showValueModeDropdown && valueModeEnabled && (
                        <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 min-w-[140px]">
                            <div className="px-3 py-2 text-[10px] text-studio-dim uppercase font-black tracking-widest border-b border-gray-100">
                                Value Steps
                            </div>
                            {([5, 7, 9, 11] as const).map((steps) => (
                                <button
                                    key={steps}
                                    onClick={() => {
                                        setValueModeSteps(steps)
                                        setShowValueModeDropdown(false)
                                    }}
                                    className={`w-full px-4 py-2 text-left text-sm font-bold transition-colors ${valueModeSteps === steps
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'text-studio hover:bg-gray-50'
                                        }`}
                                >
                                    {steps} steps {valueModeSteps === steps && '✓'}
                                </button>
                            ))}
                            <div className="border-t border-gray-100 mt-2 pt-2">
                                <button
                                    onClick={() => {
                                        toggleValueMode()
                                        setShowValueModeDropdown(false)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
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
                    className={`toolbar-btn flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm ${showAdvancedTools
                        ? 'bg-gray-200 text-studio border border-gray-300'
                        : 'bg-gray-50 text-studio-dim hover:bg-gray-100 border border-gray-100'
                        }`}
                    title="Show/hide measurement tools"
                    aria-expanded={showAdvancedTools}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                    <span className="hidden sm:inline">Tools</span>
                </button>
            )}

            {/* Advanced Tools Section - Collapsible in Simple Mode */}
            {advancedToolsVisible && (
                <>
                    {simpleMode && <div className="w-px h-6 bg-gray-200" />}

                    {/* Calibrate Button */}
                    <button
                        onClick={onOpenCalibration}
                        className={`toolbar-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm ${calibration
                            ? 'bg-green-50 text-green-600 border border-green-100 hover:bg-green-100'
                            : 'bg-studio text-white hover:bg-studio/90 active:scale-95'
                            }`}
                        title="Calibrate screen for measurements"
                    >
                        <span>📐</span>
                        <span className={`toolbar-label ${compactMode ? 'hidden' : ''}`}>
                            {calibration ? 'Calibrated' : 'Calibrate'}
                        </span>
                    </button>

                    {/* Canvas Settings Button */}
                    <button
                        onClick={onOpenCanvasSettings}
                        className={`toolbar-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm ${canvasSettings.enabled
                            ? 'bg-purple-50 text-purple-600 border border-purple-100 hover:bg-purple-100'
                            : 'bg-gray-50 text-studio hover:bg-gray-100 border border-gray-100'
                            }`}
                        title="Canvas Settings (Set physical dimensions)"
                    >
                        <span>🖼️</span>
                        <span className={`toolbar-label ${compactMode ? 'hidden' : ''}`}>
                            {canvasSettings.enabled ? `${canvasSettings.width}x${canvasSettings.height}${canvasSettings.unit}` : 'Canvas'}
                        </span>
                    </button>

                    {/* Stale Warning */}
                    {calibration && calibrationStale && (
                        <span className="text-yellow-500 text-xs flex items-center gap-1 responsive-hide-compact">
                            <span className="responsive-hide-laptop">Zoom changed</span>
                        </span>
                    )}

                    {/* Reset Calibration */}
                    {calibration && (
                        <button
                            onClick={onResetCalibration}
                            className="px-2 py-1 text-xs text-gray-400 hover:text-red-400 transition-colors responsive-hide-compact"
                            title="Reset calibration"
                        >
                            Reset
                        </button>
                    )}

                    <div className="w-px h-6 bg-gray-100" />

                    {/* Ruler Grid Toggle */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onToggleRulerGrid}
                            disabled={!calibration}
                            className={`toolbar-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm ${rulerGridEnabled && calibration
                                ? 'bg-studio text-white shadow-lg'
                                : calibration
                                    ? 'bg-gray-50 text-studio hover:bg-gray-100 border border-gray-100'
                                    : 'bg-gray-50 text-studio-dim cursor-not-allowed border border-gray-50 opacity-50'
                                }`}
                            title="Toggle ruler grid"
                        >
                            <span>📏</span>
                            <span className={`toolbar-label ${compactMode ? 'hidden' : ''}`}>Grid</span>
                        </button>

                        {rulerGridEnabled && calibration && (
                            <select
                                value={rulerGridSpacing}
                                onChange={(e) => onRulerGridSpacingChange(Number(e.target.value) as 0.25 | 0.5 | 1 | 2)}
                                className="px-2 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-studio text-xs font-bold focus:border-blue-500 outline-none shadow-inner"
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
                        className={`toolbar-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm ${measureMode && calibration
                            ? 'bg-orange-500 text-white shadow-lg'
                            : calibration
                                ? 'bg-gray-50 text-studio hover:bg-gray-100 border border-gray-100'
                                : 'bg-gray-50 text-studio-dim cursor-not-allowed border border-gray-50 opacity-50'
                            }`}
                        title="Toggle measure mode"
                    >
                        <span>📍</span>
                        <span className={`toolbar-label ${compactMode ? 'hidden' : ''}`}>Measure</span>
                    </button>

                    {measureMode && (
                        <>
                            {/* Layer Toggle Button */}
                            <button
                                onClick={onToggleMeasurementLayer}
                                className={`toolbar-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm ${measurementLayer === 'reference'
                                    ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                    : 'bg-red-50 text-red-600 border border-red-100'
                                    }`}
                                title="Toggle measurement layer (Reference/Painting)"
                            >
                                <span>{measurementLayer === 'reference' ? '🖼️' : '🎨'}</span>
                                <span className={`toolbar-label ${compactMode ? 'hidden' : ''}`}>
                                    {measurementLayer === 'reference' ? 'Reference' : 'Painting'}
                                </span>
                            </button>
                            <span className="text-gray-400 text-xs responsive-hide-compact">
                                {!measurePointA ? 'Click first point' : !measurePointB ? 'Click second point' : 'Click to remeasure'}
                            </span>
                        </>
                    )}

                    {!calibration && !simpleMode && (
                        <span className="text-gray-500 text-xs ml-auto responsive-hide-compact">
                            Calibrate to use ruler & measure
                        </span>
                    )}
                </>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Compact Mode Toggle - Only in Pro mode */}
            {!simpleMode && (
                <button
                    onClick={onToggleCompactMode}
                    className={`toolbar-btn flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${compactMode
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-gray-50 text-studio hover:bg-gray-100 border border-gray-100'
                        }`}
                    title={`${compactMode ? 'Disable' : 'Enable'} compact mode (Ctrl+\\)`}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="3" width="18" height="18" rx="4" />
                        <path d="M9 3v18" />
                        <path d="M3 9h6" />
                        <path d="M3 15h6" />
                    </svg>
                    <span className="responsive-hide-compact uppercase tracking-widest">{compactMode ? 'Compact' : 'Normal'}</span>
                </button>
            )}

            {/* Hamburger Menu */}
            <div ref={menuRef} className={`hamburger-menu ${menuOpen ? 'open' : ''}`}>
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="toolbar-btn flex items-center justify-center w-10 h-10 rounded-xl bg-gray-50 text-studio hover:bg-gray-100 border border-gray-100 transition-all shadow-sm"
                    title="More options"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="12" cy="5" r="1.5" />
                        <circle cx="12" cy="19" r="1.5" />
                    </svg>
                </button>

                <div className="hamburger-dropdown">
                    {/* Navigation Tabs - Mobile Only */}
                    {isMobile && (
                        <div className="border-b border-gray-100 pb-2 mb-2">
                            <div className="px-4 py-2 text-[10px] text-studio-dim uppercase font-black tracking-widest">Navigation</div>
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        onTabChange?.(tab.id)
                                        setMenuOpen(false)
                                    }}
                                    className={`hamburger-item ${activeTab === tab.id ? 'bg-blue-50 text-blue-600' : ''}`}
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
                                className={`hamburger-item ${activeTab === 'pinned' ? 'bg-blue-50 text-blue-600' : ''}`}
                            >
                                <span className="w-5 h-5 flex items-center justify-center">📌</span>
                                Pinned
                            </button>
                            <button
                                onClick={() => {
                                    onTabChange?.('cards')
                                    setMenuOpen(false)
                                }}
                                className={`hamburger-item ${activeTab === 'cards' ? 'bg-purple-50 text-purple-600' : ''}`}
                            >
                                <span className="w-5 h-5 flex items-center justify-center">🍱</span>
                                Color Cards
                            </button>
                        </div>
                    )}

                    {/* Palette Selector */}
                    <div className="px-4 py-3 border-b border-gray-100">
                        <span className="text-[10px] text-studio-dim uppercase font-black tracking-widest">Active Palette</span>
                        <select
                            value={activePalette.id}
                            onChange={(e) => onSelectPalette(e.target.value)}
                            className="w-full mt-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-studio text-xs font-bold focus:border-blue-500 outline-none shadow-inner"
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
                        <span>🎨</span>
                        Manage Palettes
                    </button>

                    <Link
                        href="/color-theory"
                        className="hamburger-item"
                        onClick={() => setMenuOpen(false)}
                    >
                        <span>🔬</span>
                        Color Theory Lab
                    </Link>

                    <div className="border-t border-gray-100 mt-1 pt-1">
                        <div className="px-4 py-3 text-[10px] text-studio-dim font-bold uppercase tracking-widest">
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
