'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import ImageCanvas from '@/components/ImageCanvas'
import ColorPanel from '@/components/ColorPanel'
import ShoppingListPanel from '@/components/ShoppingListPanel'
import PinnedColorsPanel from '@/components/PinnedColorsPanel'
import PaletteSelector from '@/components/PaletteSelector'
import PaletteManager from '@/components/PaletteManager'
import CalibrationModal from '@/components/CalibrationModal'
import RulerOverlay from '@/components/RulerOverlay'
import { useStore } from '@/lib/store/useStore'
import {
  CalibrationData,
  loadCalibration,
  saveCalibration,
  clearCalibration,
  isCalibrationStale
} from '@/lib/calibration'

export default function Home() {
  const {
    sampledColor, setSampledColor,
    activeHighlightColor, setActiveHighlightColor,
    highlightTolerance, setHighlightTolerance,
    highlightMode, setHighlightMode,
    image, setImage,
    activeTab, setActiveTab,
    pinnedColors, pinColor, unpinColor, clearPinned,
    valueScaleSettings, setValueScaleSettings,
    histogramBins, setHistogramBins,
    valueScaleResult, setValueScaleResult,
    palettes, createPalette, updatePalette, deletePalette, setActivePalette,
    showPaletteManager, setShowPaletteManager
  } = useStore()

  // Screen Calibration State
  const [showCalibrationModal, setShowCalibrationModal] = useState(false)
  const [calibration, setCalibration] = useState<CalibrationData | null>(null)
  const [calibrationStale, setCalibrationStale] = useState(false)

  // Ruler Grid State
  const [rulerGridEnabled, setRulerGridEnabled] = useState(false)
  const [rulerGridSpacing, setRulerGridSpacing] = useState<0.25 | 0.5 | 1 | 2>(1)

  // Measurement State
  const [measureMode, setMeasureMode] = useState(false)
  const [measurePointA, setMeasurePointA] = useState<{ x: number; y: number } | null>(null)
  const [measurePointB, setMeasurePointB] = useState<{ x: number; y: number } | null>(null)

  // Canvas container ref for RulerOverlay
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  // Load calibration on mount and check for staleness
  useEffect(() => {
    const saved = loadCalibration()
    if (saved) {
      setCalibration(saved)
      setCalibrationStale(isCalibrationStale(saved))
    }
  }, [])

  // Handle calibration save
  const handleCalibrationSave = (data: CalibrationData) => {
    saveCalibration(data)
    setCalibration(data)
    setCalibrationStale(false)
  }

  // Handle calibration reset
  const handleCalibrationReset = () => {
    clearCalibration()
    setCalibration(null)
    setCalibrationStale(false)
    setRulerGridEnabled(false)
    setMeasureMode(false)
  }

  // Handle measurement point updates from RulerOverlay
  const handleMeasurePointsChange = (a: { x: number; y: number } | null, b: { x: number; y: number } | null) => {
    setMeasurePointA(a)
    setMeasurePointB(b)
  }

  // Derived active palette
  const activePalette = useMemo(() => {
    return palettes.find(p => p.isActive) || palettes[0] || { id: 'default', name: 'Default', colors: [], isActive: true, isDefault: true }
  }, [palettes])

  const handleExportPalette = () => {
    const data = JSON.stringify(pinnedColors, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `colorwizard_palette_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="flex flex-col lg:flex-row h-screen bg-[#1a1a1a] overflow-hidden">
      <div className="flex-1 lg:flex-[7] p-6 flex flex-col min-h-0 min-w-0">
        {/* Header with Palette Selector and Color Theory Lab */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <PaletteSelector
            palettes={palettes}
            activePalette={activePalette}
            onSelectPalette={setActivePalette}
            onOpenManager={() => setShowPaletteManager(true)}
          />
          <Link
            href="/color-theory"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg hover:shadow-purple-500/25"
          >
            <span>🎨</span>
            Color Theory Lab
          </Link>
        </div>

        {/* Calibration & Measurement Toolbar */}
        <div className="mb-4 p-3 bg-gray-800/50 rounded-lg flex flex-wrap items-center gap-4 border border-gray-700">
          {/* Calibrate Button */}
          <button
            onClick={() => setShowCalibrationModal(true)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${calibration
              ? 'bg-green-600/20 text-green-400 border border-green-600/50 hover:bg-green-600/30'
              : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
          >
            {calibration ? '✓ Calibrated' : '📐 Calibrate'}
          </button>

          {/* Stale Warning */}
          {calibration && calibrationStale && (
            <span className="text-yellow-500 text-xs flex items-center gap-1">
              ⚠️ Zoom changed - recalibrate
            </span>
          )}

          {/* Reset Calibration */}
          {calibration && (
            <button
              onClick={handleCalibrationReset}
              className="px-2 py-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
            >
              Reset
            </button>
          )}

          <div className="w-px h-6 bg-gray-700" />

          {/* Ruler Grid Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => calibration && setRulerGridEnabled(!rulerGridEnabled)}
              disabled={!calibration}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${rulerGridEnabled && calibration
                ? 'bg-blue-600 text-white'
                : calibration
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
            >
              📏 Ruler Grid
            </button>

            {rulerGridEnabled && calibration && (
              <select
                value={rulerGridSpacing}
                onChange={(e) => setRulerGridSpacing(Number(e.target.value) as 0.25 | 0.5 | 1 | 2)}
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
            onClick={() => {
              if (calibration) {
                setMeasureMode(!measureMode)
                if (!measureMode) {
                  // Clear previous measurement when entering measure mode
                  setMeasurePointA(null)
                  setMeasurePointB(null)
                }
              }
            }}
            disabled={!calibration}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${measureMode && calibration
              ? 'bg-orange-600 text-white'
              : calibration
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
          >
            📍 Measure
          </button>

          {measureMode && (
            <span className="text-gray-400 text-xs">
              {!measurePointA ? 'Click first point' : !measurePointB ? 'Click second point' : 'Click to remeasure'}
            </span>
          )}

          {!calibration && (
            <span className="text-gray-500 text-xs ml-auto">
              Calibrate first to use ruler & measure
            </span>
          )}
        </div>

        {/* Highlight Controls - Only show active if a color is selected */}
        {activeHighlightColor && (
          <div className="mb-4 p-3 bg-gray-800 rounded-lg flex items-center gap-6 border border-gray-700 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-300">Highlight Mode:</span>
              <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                <button
                  onClick={() => setHighlightMode('solid')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${highlightMode === 'solid' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Solid
                </button>
                <button
                  onClick={() => setHighlightMode('heatmap')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${highlightMode === 'heatmap' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Heatmap
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-1">
              <span className="text-sm font-medium text-gray-300 whitespace-nowrap">Tolerance ({highlightTolerance}):</span>
              <input
                type="range"
                min="1"
                max="60"
                value={highlightTolerance}
                onChange={(e) => setHighlightTolerance(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <button
              onClick={() => setActiveHighlightColor(null)}
              className="ml-auto px-3 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              Clear Highlight
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 relative" ref={canvasContainerRef}>
          <ImageCanvas
            image={image}
            onImageLoad={setImage}
            onReset={() => setImage(null)}
            onColorSample={(color) => {
              // If measure mode is on, handle measurement instead of color sampling
              if (measureMode && calibration) {
                // Measurement is handled separately via onMeasureClick
                return
              }
              setSampledColor(color)
            }}
            highlightColor={activeHighlightColor}
            highlightTolerance={highlightTolerance}
            highlightMode={highlightMode}
            valueScaleSettings={valueScaleSettings}
            onValueScaleChange={setValueScaleSettings}
            onHistogramComputed={setHistogramBins}
            onValueScaleResult={setValueScaleResult}
            measureMode={measureMode}
            onMeasureClick={(point) => {
              if (!calibration) return
              if (!measurePointA) {
                setMeasurePointA(point)
              } else if (!measurePointB) {
                setMeasurePointB(point)
              } else {
                // Reset and start new measurement
                setMeasurePointA(point)
                setMeasurePointB(null)
              }
            }}
          />

          {/* Ruler Grid & Measurement Overlay */}
          <RulerOverlay
            gridEnabled={rulerGridEnabled}
            gridSpacing={rulerGridSpacing}
            calibration={calibration}
            measureEnabled={measureMode}
            measurePointA={measurePointA}
            measurePointB={measurePointB}
            containerRef={canvasContainerRef}
            onMeasurePointsChange={handleMeasurePointsChange}
          />
        </div>
      </div>
      <div className="w-full lg:w-[30%] lg:min-w-[400px] border-l border-gray-700 flex flex-col h-1/2 lg:h-full bg-gray-950 shadow-2xl z-10">
        {/* Simple Tab Switcher */}
        <div className="flex border-b border-gray-700">
          <button
            className={`flex-1 py-3 text-sm font-medium transition-colors ${!activeTab || activeTab === 'inspect' ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-800/50' : 'text-gray-400 hover:text-gray-200'}`}
            onClick={() => setActiveTab('inspect')}
          >
            Inspect
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'shopping' ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-800/50' : 'text-gray-400 hover:text-gray-200'}`}
            onClick={() => setActiveTab('shopping')}
          >
            List
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'pinned' ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-800/50' : 'text-gray-400 hover:text-gray-200'}`}
            onClick={() => setActiveTab('pinned')}
          >
            Pinned <span className="text-[10px] bg-gray-700 px-1 rounded ml-1">{pinnedColors.length}</span>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden relative">
          {(!activeTab || activeTab === 'inspect') ? (
            <div className="absolute inset-0 overflow-y-auto">
              <ColorPanel
                sampledColor={sampledColor}
                onColorSelect={(rgb) => setActiveHighlightColor(rgb)}
                onPin={pinColor}
                isPinned={!!sampledColor && pinnedColors.some(p => p.hex === sampledColor.hex)}
                valueScaleSettings={valueScaleSettings}
                onValueScaleChange={setValueScaleSettings}
                activePalette={activePalette}
                histogramBins={histogramBins}
                valueScaleResult={valueScaleResult}
              />
            </div>
          ) : activeTab === 'shopping' ? (
            <div className="absolute inset-0">
              <ShoppingListPanel image={image} />
            </div>
          ) : (
            <div className="absolute inset-0 overflow-y-auto">
              <PinnedColorsPanel
                pinnedColors={pinnedColors}
                activeHighlightColor={activeHighlightColor}
                onUnpin={unpinColor}
                onClearAll={clearPinned}
                onExport={handleExportPalette}
                onSelect={(rgb: { r: number; g: number; b: number }) => setActiveHighlightColor(rgb)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Palette Manager Modal */}
      <PaletteManager
        isOpen={showPaletteManager}
        onClose={() => setShowPaletteManager(false)}
        palettes={palettes}
        onCreatePalette={createPalette}
        onUpdatePalette={updatePalette}
        onDeletePalette={deletePalette}
      />

      {/* Calibration Modal */}
      <CalibrationModal
        isOpen={showCalibrationModal}
        onClose={() => setShowCalibrationModal(false)}
        onSave={handleCalibrationSave}
        initialCalibration={calibration}
      />
    </main>
  )
}
