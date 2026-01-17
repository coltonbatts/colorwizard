'use client'

/**
 * Home page - Main application entry point.
 * Refactored to use Zustand store for centralized state management.
 */

import { useMemo, useEffect, useRef } from 'react'
import ImageCanvas from '@/components/ImageCanvas'
import ColorPanel from '@/components/ColorPanel'
import ShoppingListPanel from '@/components/ShoppingListPanel'
import PinnedColorsPanel from '@/components/PinnedColorsPanel'
import PaletteManager from '@/components/PaletteManager'
import CalibrationModal from '@/components/CalibrationModal'
import CollapsibleSidebar from '@/components/CollapsibleSidebar'
import CompactToolbar from '@/components/CompactToolbar'
import CanvasSettingsModal from '@/components/CanvasSettingsModal'
import { useStore } from '@/lib/store/useStore'
import { useLayoutPreferences } from '@/hooks/useLayoutPreferences'

export default function Home() {
  const {
    // Core color state
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
    showPaletteManager, setShowPaletteManager,
    canvasSettings, setCanvasSettings,

    // Calibration state
    calibration, calibrationStale,
    showCalibrationModal, setShowCalibrationModal,
    saveCalibration, resetCalibration, loadCalibrationFromStorage,

    // Measurement state
    measureMode, measurePointA, measurePointB, measurementLayer,
    setMeasurePoints, toggleMeasureMode, toggleMeasurementLayer,

    // Grid/Ruler state
    rulerGridEnabled, rulerGridSpacing,
    toggleRulerGrid, setRulerGridSpacing,

    // Transform state
    setTransformState,

    // Modal state
    showCanvasSettingsModal, setShowCanvasSettingsModal,
  } = useStore()

  // Layout preferences
  const { sidebarCollapsed, compactMode, toggleSidebar, toggleCompactMode } = useLayoutPreferences()

  // Canvas container ref for RulerOverlay
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  // Load calibration on mount
  useEffect(() => {
    loadCalibrationFromStorage()
  }, [loadCalibrationFromStorage])

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
    <main className={`flex flex-col lg:flex-row h-screen bg-white overflow-hidden ${compactMode ? 'compact-mode' : ''}`}>
      <div className={`flex-1 flex flex-col min-h-0 min-w-0 ${compactMode ? 'p-3' : 'p-6'}`}>
        {/* Compact Toolbar with all controls */}
        <div className="mb-4">
          <CompactToolbar
            calibration={calibration}
            calibrationStale={calibrationStale}
            onOpenCalibration={() => setShowCalibrationModal(true)}
            onResetCalibration={resetCalibration}
            rulerGridEnabled={rulerGridEnabled}
            rulerGridSpacing={rulerGridSpacing}
            onToggleRulerGrid={toggleRulerGrid}
            onRulerGridSpacingChange={setRulerGridSpacing}
            measureMode={measureMode}
            measurePointA={measurePointA}
            measurePointB={measurePointB}
            onToggleMeasure={toggleMeasureMode}
            measurementLayer={measurementLayer}
            onToggleMeasurementLayer={toggleMeasurementLayer}
            palettes={palettes}
            activePalette={activePalette}
            onSelectPalette={setActivePalette}
            onOpenPaletteManager={() => setShowPaletteManager(true)}
            compactMode={compactMode}
            onToggleCompactMode={toggleCompactMode}
            canvasSettings={canvasSettings}
            onOpenCanvasSettings={() => setShowCanvasSettingsModal(true)}
            hasImage={!!image}
          />
        </div>

        {/* Highlight Controls - Only show active if a color is selected */}
        {activeHighlightColor && (
          <div className="mb-4 p-4 bg-white rounded-2xl flex items-center gap-6 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-studio-dim uppercase tracking-widest">Highlight Mode</span>
              <div className="flex bg-gray-50 rounded-xl p-1 border border-gray-100 shadow-inner">
                <button
                  onClick={() => setHighlightMode('solid')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${highlightMode === 'solid' ? 'bg-white text-blue-600 shadow-sm' : 'text-studio-dim hover:text-studio-secondary'}`}
                >
                  Solid
                </button>
                <button
                  onClick={() => setHighlightMode('heatmap')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${highlightMode === 'heatmap' ? 'bg-white text-blue-600 shadow-sm' : 'text-studio-dim hover:text-studio-secondary'}`}
                >
                  Heatmap
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-1">
              <span className="text-[10px] font-black text-studio-dim uppercase tracking-widest whitespace-nowrap">Tolerance ({highlightTolerance})</span>
              <input
                type="range"
                min="1"
                max="60"
                value={highlightTolerance}
                onChange={(e) => setHighlightTolerance(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <button
              onClick={() => setActiveHighlightColor(null)}
              className="ml-auto px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              Clear
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
                // Measurement is handled separately via onMeasurePointsChange
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
            onMeasurePointsChange={setMeasurePoints}
            onTransformChange={setTransformState}
            calibration={calibration}
            gridEnabled={rulerGridEnabled}
            gridSpacing={rulerGridSpacing}
            measurePointA={measurePointA}
            measurePointB={measurePointB}
            measurementLayer={measurementLayer}
            canvasSettings={canvasSettings}
          />
        </div>
      </div>
      <CollapsibleSidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pinnedCount={pinnedColors.length}
      >
        {/* Simple Tab Switcher - only shown when expanded */}
        <div className="flex border-b border-gray-100 bg-white">
          <button
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${!activeTab || activeTab === 'inspect' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-studio-dim hover:text-studio-secondary hover:bg-gray-50'}`}
            onClick={() => setActiveTab('inspect')}
          >
            Inspect
          </button>
          <button
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'shopping' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-studio-dim hover:text-studio-secondary hover:bg-gray-50'}`}
            onClick={() => setActiveTab('shopping')}
          >
            List
          </button>
          <button
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'pinned' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-studio-dim hover:text-studio-secondary hover:bg-gray-50'}`}
            onClick={() => setActiveTab('pinned')}
          >
            Pinned <span className="text-[10px] bg-studio text-white px-1.5 py-0.5 rounded-md ml-1 font-mono">{pinnedColors.length}</span>
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
      </CollapsibleSidebar>

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
        onSave={saveCalibration}
        initialCalibration={calibration}
      />

      {/* Canvas Settings Modal */}
      <CanvasSettingsModal
        isOpen={showCanvasSettingsModal}
        onClose={() => setShowCanvasSettingsModal(false)}
        onSave={setCanvasSettings}
        initialSettings={canvasSettings}
      />
    </main>
  )
}
