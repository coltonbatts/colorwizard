'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Palette } from '@/lib/types/palette'
import { CalibrationData } from '@/lib/calibration'

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

    // Measure
    measureMode: boolean
    measurePointA: { x: number; y: number } | null
    measurePointB: { x: number; y: number } | null
    onToggleMeasure: () => void

    // Palette
    palettes: Palette[]
    activePalette: Palette
    onSelectPalette: (id: string) => void
    onOpenPaletteManager: () => void

    // Layout
    compactMode: boolean
    onToggleCompactMode: () => void
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
    palettes,
    activePalette,
    onSelectPalette,
    onOpenPaletteManager,
    compactMode,
    onToggleCompactMode
}: CompactToolbarProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className={`p-3 bg-gray-800/50 rounded-lg flex flex-wrap items-center gap-3 border border-gray-700 ${compactMode ? 'toolbar-compact' : ''}`}>
            {/* Calibrate Button */}
            <button
                onClick={onOpenCalibration}
                className={`toolbar-btn flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${calibration
                    ? 'bg-green-600/20 text-green-400 border border-green-600/50 hover:bg-green-600/30'
                    : 'bg-blue-600 text-white hover:bg-blue-500'
                    }`}
                title="Calibrate screen for measurements"
            >
                <span>📐</span>
                <span className={`toolbar-label ${compactMode ? 'hidden' : ''}`}>
                    {calibration ? 'Calibrated' : 'Calibrate'}
                </span>
            </button>

            {/* Stale Warning */}
            {calibration && calibrationStale && (
                <span className="text-yellow-500 text-xs flex items-center gap-1 responsive-hide-compact">
                    ⚠️ <span className="responsive-hide-laptop">Zoom changed</span>
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

            <div className="w-px h-6 bg-gray-700" />

            {/* Ruler Grid Toggle */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onToggleRulerGrid}
                    disabled={!calibration}
                    className={`toolbar-btn flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${rulerGridEnabled && calibration
                        ? 'bg-blue-600 text-white'
                        : calibration
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
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
                        className="px-2 py-1 bg-gray-900 border border-gray-600 rounded text-gray-200 text-sm focus:border-blue-500 outline-none"
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
                className={`toolbar-btn flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${measureMode && calibration
                    ? 'bg-orange-600 text-white'
                    : calibration
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    }`}
                title="Toggle measure mode"
            >
                <span>📍</span>
                <span className={`toolbar-label ${compactMode ? 'hidden' : ''}`}>Measure</span>
            </button>

            {measureMode && (
                <span className="text-gray-400 text-xs responsive-hide-compact">
                    {!measurePointA ? 'Click first point' : !measurePointB ? 'Click second point' : 'Click to remeasure'}
                </span>
            )}

            {!calibration && (
                <span className="text-gray-500 text-xs ml-auto responsive-hide-compact">
                    Calibrate to use ruler & measure
                </span>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Compact Mode Toggle */}
            <button
                onClick={onToggleCompactMode}
                className={`toolbar-btn flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${compactMode
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                title={`${compactMode ? 'Disable' : 'Enable'} compact mode (Ctrl+\\)`}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 3v18" />
                    <path d="M3 9h6" />
                    <path d="M3 15h6" />
                </svg>
                <span className="responsive-hide-compact">{compactMode ? 'Compact' : 'Normal'}</span>
            </button>

            {/* Hamburger Menu */}
            <div ref={menuRef} className={`hamburger-menu ${menuOpen ? 'open' : ''}`}>
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="toolbar-btn flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                    title="More options"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="19" cy="12" r="1" />
                        <circle cx="5" cy="12" r="1" />
                    </svg>
                </button>

                <div className="hamburger-dropdown">
                    {/* Palette Selector */}
                    <div className="px-3 py-2 border-b border-gray-700">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Palette</span>
                        <select
                            value={activePalette.id}
                            onChange={(e) => onSelectPalette(e.target.value)}
                            className="w-full mt-1 px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-gray-200 text-sm focus:border-blue-500 outline-none"
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

                    <div className="border-t border-gray-700 mt-1 pt-1">
                        <div className="px-3 py-2 text-[10px] text-gray-500">
                            <div className="flex justify-between">
                                <span>Toggle Panel</span>
                                <span className="text-gray-600">Ctrl+P</span>
                            </div>
                            <div className="flex justify-between mt-1">
                                <span>Compact Mode</span>
                                <span className="text-gray-600">Ctrl+\</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
