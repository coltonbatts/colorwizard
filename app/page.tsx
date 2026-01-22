'use client'

/**
 * Home page - Main application entry point.
 * Refactored UI with calm progressive disclosure.
 */

import { useMemo, useEffect, useRef, useCallback, useState } from 'react'
import ImageCanvas from '@/components/ImageCanvas'
import CollapsibleSidebar, { TABS, TabType } from '@/components/CollapsibleSidebar'
import CompactToolbar from '@/components/CompactToolbar'
import PaletteManager from '@/components/PaletteManager'
import CalibrationModal from '@/components/CalibrationModal'
import CanvasSettingsModal from '@/components/CanvasSettingsModal'
import SessionPaletteStrip, { SessionColor, useSessionPalette, useHasSessionColors } from '@/components/SessionPaletteStrip'
import MobileDashboard from '@/components/MobileDashboard'
import MobileNavigation from '@/components/MobileNavigation'
import { useIsMobile } from '@/hooks/useMediaQuery'

// Tab content components
import SampleTab from '@/components/tabs/SampleTab'
import OilMixTab from '@/components/tabs/OilMixTab'
import PaletteTab from '@/components/tabs/PaletteTab'
import MatchesTab from '@/components/tabs/MatchesTab'
import AdvancedTab from '@/components/tabs/AdvancedTab'
import PaintLibraryTab from '@/components/tabs/PaintLibraryTab'
import CheckMyValuesView from '@/components/CheckMyValuesView'
import PinnedColorsPanel from '@/components/PinnedColorsPanel'
import MyCardsPanel from '@/components/MyCardsPanel'
import ErrorBoundary from '@/components/ErrorBoundary'
import { CanvasErrorFallback } from '@/components/errors/CanvasErrorFallback'
import { SidebarErrorFallback } from '@/components/errors/SidebarErrorFallback'

import { useStore } from '@/lib/store/useStore'

export default function Home() {
  const isMobile = useIsMobile()
  // Track whether mobile user is viewing dashboard vs browsing tabs
  const [mobileShowDashboard, setMobileShowDashboard] = useState(true)
  // Track Check My Values full-screen view
  const [showCheckValues, setShowCheckValues] = useState(false)
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

    // Layout state
    sidebarCollapsed, toggleSidebar,
    sidebarWidth, setSidebarWidth,
    compactMode, toggleCompactMode,

    // Breakdown state
    breakdownValue, setBreakdownValue,

    // Modal state
    showCanvasSettingsModal, setShowCanvasSettingsModal,
    lastSampleTime
  } = useStore()

  // Session palette integration
  const { addColor: addToSession } = useSessionPalette()

  // Resize logic
  const isResizing = useRef(false)

  const stopResizing = useCallback(() => {
    isResizing.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', stopResizing)
    document.body.style.cursor = 'default'
    document.body.style.userSelect = 'auto'
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return
    const newWidth = window.innerWidth - e.clientX
    if (newWidth >= 300 && newWidth <= 800) {
      setSidebarWidth(newWidth)
    }
  }, [setSidebarWidth])

  const startResizing = useCallback((e: React.MouseEvent) => {
    isResizing.current = true
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', stopResizing)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [handleMouseMove, stopResizing])

  // Canvas container ref
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  // Load calibration on mount
  useEffect(() => {
    loadCalibrationFromStorage()
  }, [loadCalibrationFromStorage])

  // Keyboard shortcuts for tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // [ and ] for collapse/expand
      if (e.key === '[') {
        e.preventDefault()
        if (!sidebarCollapsed) toggleSidebar()
      }
      if (e.key === ']') {
        e.preventDefault()
        if (sidebarCollapsed) toggleSidebar()
      }

      // 1-8 for tab switching
      const tabKeys: { [key: string]: TabType } = {
        '1': 'sample',
        '2': 'oilmix',
        '3': 'palette',
        '4': 'matches',
        '5': 'advanced',
        '6': 'pinned',
        '7': 'cards',
        '8': 'library',
      }
      if (tabKeys[e.key]) {
        e.preventDefault()
        setActiveTab(tabKeys[e.key])
        if (sidebarCollapsed) toggleSidebar()
      }
      // 9 for Check My Values full-screen
      if (e.key === '9' && image) {
        e.preventDefault()
        setShowCheckValues(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sidebarCollapsed, toggleSidebar, setActiveTab])

  // Derived active palette
  const activePalette = useMemo(() => {
    return palettes.find(p => p.isActive) || palettes[0] || { id: 'default', name: 'Default', colors: [], isActive: true, isDefault: true }
  }, [palettes])

  // Export palette handler
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

  // Session palette add handler
  const handleAddToSession = (color: { hex: string; rgb: { r: number; g: number; b: number } }) => {
    addToSession(color.hex, color.rgb)
  }

  // Session color select handler
  const handleSessionColorSelect = (color: SessionColor) => {
    // Convert session color to sampled color format
    setSampledColor({
      hex: color.hex,
      rgb: color.rgb,
      hsl: { h: 0, s: 0, l: 0 } // Will be recalculated
    })
    setActiveTab('sample')
  }

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'sample':
        return (
          <SampleTab
            sampledColor={sampledColor}
            onPin={pinColor}
            isPinned={!!sampledColor && pinnedColors.some(p => p.hex === sampledColor.hex)}
            valueScaleSettings={valueScaleSettings}
            lastSampleTime={lastSampleTime}
            onAddToSession={handleAddToSession}
          />
        )
      case 'oilmix':
        return (
          <OilMixTab
            sampledColor={sampledColor}
            activePalette={activePalette}
            onColorSelect={(rgb) => setActiveHighlightColor(rgb)}
          />
        )
      case 'palette':
        return <PaletteTab />
      case 'matches':
        return (
          <MatchesTab
            sampledColor={sampledColor}
            onColorSelect={(rgb) => setActiveHighlightColor(rgb)}
          />
        )
      case 'advanced':
        return (
          <AdvancedTab
            sampledColor={sampledColor}
            onColorSelect={(rgb) => setActiveHighlightColor(rgb)}
            valueScaleSettings={valueScaleSettings}
            onValueScaleChange={setValueScaleSettings}
            histogramBins={histogramBins}
            valueScaleResult={valueScaleResult}
            breakdownValue={breakdownValue}
            onBreakdownChange={setBreakdownValue}
          />
        )
      case 'pinned':
        return (
          <PinnedColorsPanel
            pinnedColors={pinnedColors}
            activeHighlightColor={activeHighlightColor}
            onUnpin={unpinColor}
            onClearAll={clearPinned}
            onExport={handleExportPalette}
            onSelect={(rgb) => setActiveHighlightColor(rgb)}
          />
        )
      case 'cards':
        return <MyCardsPanel />
      case 'library':
        return (
          <PaintLibraryTab
            onColorSelect={(rgb) => setActiveHighlightColor(rgb)}
          />
        )
      default:
        return null
    }
  }

  // Session palette check for layout padding
  const hasSessionColors = useHasSessionColors()

  return (
    <main className={`flex flex-col ${image ? 'md:flex-row' : ''} h-screen bg-white overflow-hidden ${compactMode ? 'compact-mode' : ''} ${hasSessionColors ? 'pb-14 md:pb-0' : ''} ${!image ? 'layout-hero-mode' : ''}`}>
      <div className={`flex-1 flex flex-col min-h-0 min-w-0 ${compactMode ? 'p-0 md:p-3' : 'p-0 md:p-6'}`}>
        {/* Compact Toolbar */}
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
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onOpenCheckValues={() => setShowCheckValues(true)}
          />
        </div>

        {/* Highlight Controls - contextual */}
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

        {/* Main Canvas Area */}
        <div className="flex-1 min-h-0 relative" ref={canvasContainerRef}>
          <ErrorBoundary
            fallback={({ resetError }) => (
              <CanvasErrorFallback
                resetError={resetError}
                onReset={() => setImage(null)}
              />
            )}
          >
            <ImageCanvas
              image={image}
              onImageLoad={setImage}
              onReset={() => setImage(null)}
              onColorSample={(color) => {
                if (measureMode && calibration) {
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
          </ErrorBoundary>

          {/* Quick Access: Threads Button - Mobile only */}
          {isMobile && image && mobileShowDashboard && (
            <button
              onClick={() => {
                setActiveTab('matches')
                setMobileShowDashboard(false)
              }}
              className="mobile-quick-threads-btn"
              aria-label="Open Threads / DMC Floss"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19.5 4.5 L6.5 17.5" strokeWidth="2" />
                <circle cx="20.5" cy="3.5" r="1.5" />
                <path d="M20.5 3.5 C22 2 23 4 21 6 C18 9 15 8 13 11 C11 14 12 17 9 19 C7 21 4 20 3 18" />
              </svg>
              <span>Threads</span>
            </button>
          )}
        </div>
      </div>

      {/* Resize Handle - only show when image exists */}
      {image && !sidebarCollapsed && (
        <div
          onMouseDown={startResizing}
          className="w-1.5 hover:w-2 bg-transparent hover:bg-blue-500/20 cursor-col-resize transition-all z-20"
          title="Drag to resize"
        />
      )}

      {/* Sidebar - only show when image exists */}
      {image && (
        <CollapsibleSidebar
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          pinnedCount={pinnedColors.length}
          width={sidebarWidth}
        >
          {/* Tab Bar - only shown when expanded and NOT mobile dashboard mode */}
          {!isMobile && (
            <div className="flex border-b border-gray-100 bg-white items-stretch">
              {TABS.map((tab, index) => (
                <button
                  key={tab.id}
                  className={`flex-1 flex items-center justify-center py-4 transition-all relative ${activeTab === tab.id
                    ? 'text-blue-600'
                    : 'text-studio-dim hover:text-studio-secondary hover:bg-gray-50'
                    }`}
                  onClick={() => setActiveTab(tab.id)}
                  title={`${tab.tooltip} (${index + 1})`}
                >
                  {tab.icon}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 animate-in fade-in zoom-in-95" />
                  )}
                </button>
              ))}
              {/* ... rest of the buttons ... */}
              <button
                className={`flex-1 flex items-center justify-center py-4 transition-all relative ${activeTab === 'pinned'
                  ? 'text-blue-600'
                  : 'text-studio-dim hover:text-studio-secondary hover:bg-gray-50'
                  }`}
                onClick={() => setActiveTab('pinned')}
                title={`Pinned Colors (${pinnedColors.length})`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 17v5" />
                  <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4.76Z" />
                </svg>
                {pinnedColors.length > 0 && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {pinnedColors.length > 9 ? '9+' : pinnedColors.length}
                  </span>
                )}
                {activeTab === 'pinned' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 animate-in fade-in zoom-in-95" />
                )}
              </button>
              <button
                className={`flex-1 flex items-center justify-center py-4 transition-all relative ${activeTab === 'cards'
                  ? 'text-purple-600'
                  : 'text-studio-dim hover:text-studio-secondary hover:bg-gray-50'
                  }`}
                onClick={() => setActiveTab('cards')}
                title="Color Cards"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <path d="M3 9h18" />
                </svg>
                {activeTab === 'cards' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 animate-in fade-in zoom-in-95" />
                )}
              </button>
            </div>
          )}

          {/* Tab Content */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50/30">
            {isMobile && image && mobileShowDashboard ? (
              <MobileDashboard
                sampledColor={sampledColor}
                activePalette={palettes.find(p => p.id === activePalette.id)}
              />
            ) : (
              <ErrorBoundary
                fallback={({ error, resetError }) => (
                  <SidebarErrorFallback error={error} resetError={resetError} />
                )}
                key={activeTab}
              >
                {renderTabContent()}
              </ErrorBoundary>
            )}
          </div>
        </CollapsibleSidebar>
      )}

      {/* Mobile Navigation */}
      {isMobile && (
        <MobileNavigation
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab)
            setMobileShowDashboard(false) // Switch from dashboard to tab view
          }}
          pinnedCount={pinnedColors.length}
          onOpenCanvasSettings={() => setShowCanvasSettingsModal(true)}
          onOpenCalibration={() => setShowCalibrationModal(true)}
          showDashboard={mobileShowDashboard}
          onReturnToDashboard={() => setMobileShowDashboard(true)}
          hasImage={!!image}
        />
      )}

      {/* Session Palette Strip */}
      <SessionPaletteStrip onColorSelect={handleSessionColorSelect} />

      {/* Modals */}
      <PaletteManager
        isOpen={showPaletteManager}
        onClose={() => setShowPaletteManager(false)}
        palettes={palettes}
        onCreatePalette={createPalette}
        onUpdatePalette={updatePalette}
        onDeletePalette={deletePalette}
      />

      <CalibrationModal
        isOpen={showCalibrationModal}
        onClose={() => setShowCalibrationModal(false)}
        onSave={saveCalibration}
        initialCalibration={calibration}
      />

      <CanvasSettingsModal
        isOpen={showCanvasSettingsModal}
        onClose={() => setShowCanvasSettingsModal(false)}
        onSave={setCanvasSettings}
        initialSettings={canvasSettings}
      />

      {/* Check My Values Full-Screen View */}
      {showCheckValues && (
        <CheckMyValuesView
          referenceImage={image}
          onClose={() => setShowCheckValues(false)}
        />
      )}
    </main>
  )
}
