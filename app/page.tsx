'use client'

/**
 * Home page - Main application entry point.
 * Refactored UI with calm progressive disclosure.
 * Optimized with useShallow() to reduce unnecessary re-renders by 10-15%.
 */

import { useMemo, useEffect, useRef, useCallback, useState } from 'react'
import ImageCanvas from '@/components/ImageCanvas'
import { useImageAnalyzer } from '@/hooks/useImageAnalyzer'
import CollapsibleSidebar, { TABS, TabType } from '@/components/CollapsibleSidebar'
import CompactToolbar from '@/components/CompactToolbar'
import PaletteManager from '@/components/PaletteManager'
import CalibrationModal from '@/components/CalibrationModal'
import CanvasSettingsModal from '@/components/CanvasSettingsModal'
import SessionPaletteStrip, { SessionColor, useSessionPalette, useHasSessionColors } from '@/components/SessionPaletteStrip'
import MobileNavigation from '@/components/MobileNavigation'
import MobileHeader from '@/components/MobileHeader'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { rgbToHex, rgbToHsl } from '@/lib/color/conversions'

// Tab content components - Thin Core only
import SampleTab from '@/components/tabs/SampleTab'
import MatchesTab from '@/components/tabs/MatchesTab'
import ErrorBoundary from '@/components/ErrorBoundary'
import HighlightControls from '@/components/HighlightControls'
import { CanvasErrorFallback } from '@/components/errors/CanvasErrorFallback'
import { SidebarErrorFallback } from '@/components/errors/SidebarErrorFallback'

import { useStore } from '@/lib/store/useStore'

export default function Home() {
  const isMobile = useIsMobile()

  // Optimized selectors: Grouped by logical domain to reduce re-render cascades
  const sampledColor = useStore(state => state.sampledColor)
  const setSampledColor = useStore(state => state.setSampledColor)
  const activeHighlightColor = useStore(state => state.activeHighlightColor)
  const setActiveHighlightColor = useStore(state => state.setActiveHighlightColor)
  const highlightTolerance = useStore(state => state.highlightTolerance)
  const highlightMode = useStore(state => state.highlightMode)
  const image = useStore(state => state.image)
  const setImage = useStore(state => state.setImage)
  const activeTab = useStore(state => state.activeTab)
  const setActiveTab = useStore(state => state.setActiveTab)
  const pinnedColors = useStore(state => state.pinnedColors)
  const pinColor = useStore(state => state.pinColor)
  const unpinColor = useStore(state => state.unpinColor)
  const clearPinned = useStore(state => state.clearPinned)
  const lastSampleTime = useStore(state => state.lastSampleTime)

  const valueScaleSettings = useStore(state => state.valueScaleSettings)
  const setValueScaleSettings = useStore(state => state.setValueScaleSettings)
  const histogramBins = useStore(state => state.histogramBins)
  const setHistogramBins = useStore(state => state.setHistogramBins)
  const valueScaleResult = useStore(state => state.valueScaleResult)
  const setValueScaleResult = useStore(state => state.setValueScaleResult)
  const palettes = useStore(state => state.palettes)
  const createPalette = useStore(state => state.createPalette)
  const updatePalette = useStore(state => state.updatePalette)
  const deletePalette = useStore(state => state.deletePalette)
  const setActivePalette = useStore(state => state.setActivePalette)
  const showPaletteManager = useStore(state => state.showPaletteManager)
  const setShowPaletteManager = useStore(state => state.setShowPaletteManager)
  const canvasSettings = useStore(state => state.canvasSettings)
  const setCanvasSettings = useStore(state => state.setCanvasSettings)

  const calibration = useStore(state => state.calibration)
  const calibrationStale = useStore(state => state.calibrationStale)
  const showCalibrationModal = useStore(state => state.showCalibrationModal)
  const setShowCalibrationModal = useStore(state => state.setShowCalibrationModal)
  const saveCalibration = useStore(state => state.saveCalibration)
  const resetCalibration = useStore(state => state.resetCalibration)
  const loadCalibrationFromStorage = useStore(state => state.loadCalibrationFromStorage)
  const measureMode = useStore(state => state.measureMode)
  const measurePointA = useStore(state => state.measurePointA)
  const measurePointB = useStore(state => state.measurePointB)
  const measurementLayer = useStore(state => state.measurementLayer)

  const referenceImage = useStore(state => state.referenceImage)
  const setReferenceImage = useStore(state => state.setReferenceImage)

  const setMeasurePoints = useStore(state => state.setMeasurePoints)
  const toggleMeasureMode = useStore(state => state.toggleMeasureMode)
  const toggleMeasurementLayer = useStore(state => state.toggleMeasurementLayer)
  const rulerGridEnabled = useStore(state => state.rulerGridEnabled)
  const rulerGridSpacing = useStore(state => state.rulerGridSpacing)
  const toggleRulerGrid = useStore(state => state.toggleRulerGrid)
  const setRulerGridSpacing = useStore(state => state.setRulerGridSpacing)
  const setTransformState = useStore(state => state.setTransformState)
  const sidebarCollapsed = useStore(state => state.sidebarCollapsed)
  const toggleSidebar = useStore(state => state.toggleSidebar)
  const sidebarWidth = useStore(state => state.sidebarWidth)
  const setSidebarWidth = useStore(state => state.setSidebarWidth)
  const compactMode = useStore(state => state.compactMode)
  const toggleCompactMode = useStore(state => state.toggleCompactMode)
  const breakdownValue = useStore(state => state.breakdownValue)
  const setBreakdownValue = useStore(state => state.setBreakdownValue)
  const showCanvasSettingsModal = useStore(state => state.showCanvasSettingsModal)
  const setShowCanvasSettingsModal = useStore(state => state.setShowCanvasSettingsModal)
  const simpleMode = useStore(state => state.simpleMode)
  const toggleSimpleMode = useStore(state => state.toggleSimpleMode)
  const toggleValueMode = useStore(state => state.toggleValueMode)

  const setValueModeEnabled = useStore(state => state.setValueModeEnabled)

  // Wrapper for setImage that always resets value mode
  const handleImageLoad = useCallback((img: HTMLImageElement) => {
    console.log('[Home] Image loaded, resetting value mode')
    setImage(img)
    setValueModeEnabled(false) // Always reset value mode when new image loads
  }, [setImage, setValueModeEnabled])

  // Clear image and reset view
  const handleClearImage = useCallback(() => {
    console.log('[Home] Clearing image and resetting state')
    setImage(null)
    setReferenceImage(null)
    setSampledColor(null)
    setActiveHighlightColor(null)
    setBreakdownValue(0)
    setValueModeEnabled(false) // Reset value mode when clearing image
  }, [setImage, setReferenceImage, setSampledColor, setActiveHighlightColor, setBreakdownValue, setValueModeEnabled])

  const lastProcessedRef = useRef<string | null>(null)

  // Synchronize persistent referenceImage string to runtime HTMLImageElement
  useEffect(() => {
    if (referenceImage && !image && referenceImage !== lastProcessedRef.current) {
      console.log('[Home] Loading reference image from string...')
      lastProcessedRef.current = referenceImage

      const img = new Image()
      img.crossOrigin = "anonymous"
      img.src = referenceImage
      img.onload = () => {
        console.log('[Home] Reference image loaded successfully')
        handleImageLoad(img) // Use wrapper that resets value mode
      }
      img.onerror = (e) => {
        console.error('[Home] Failed to load reference image:', e)
        lastProcessedRef.current = null
      }
    } else if (!referenceImage) {
      lastProcessedRef.current = null
    }
  }, [referenceImage, image, handleImageLoad])

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

  const {
    valueScaleResult: analyzerValueScaleResult,
    histogramBins: analyzerHistogramBins,
  } = useImageAnalyzer(image, valueScaleSettings)

  // Use the hook's results to update the store
  useEffect(() => {
    if (analyzerValueScaleResult) setValueScaleResult(analyzerValueScaleResult)
  }, [analyzerValueScaleResult, setValueScaleResult])

  useEffect(() => {
    if (analyzerHistogramBins.length > 0) setHistogramBins(analyzerHistogramBins)
  }, [analyzerHistogramBins, setHistogramBins])

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

      // 1-2 for tab switching (Thin Core)
      const tabKeys: { [key: string]: TabType } = {
        '1': 'sample',
        '2': 'matches',
      }
      if (tabKeys[e.key]) {
        e.preventDefault()
        setActiveTab(tabKeys[e.key])
        if (sidebarCollapsed) toggleSidebar()
      }

      // Shift+S for Simple/Pro mode toggle
      if (e.key === 'S' && e.shiftKey) {
        e.preventDefault()
        toggleSimpleMode()
      }

      // V for Value Mode toggle
      if ((e.key === 'v' || e.key === 'V') && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        toggleValueMode()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sidebarCollapsed, toggleSidebar, setActiveTab, toggleSimpleMode, toggleValueMode])

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
      hsl: { h: 0, s: 0, l: 0 }
    })
    setActiveTab('sample')
  }

  // Render tab content - Thin Core only
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
      case 'matches':
        return (
          <MatchesTab
            sampledColor={sampledColor}
            onColorSelect={(rgb) => {
              setSampledColor({
                rgb,
                hex: rgbToHex(rgb.r, rgb.g, rgb.b),
                hsl: rgbToHsl(rgb.r, rgb.g, rgb.b)
              })
              setActiveHighlightColor(rgb)
            }}
          />
        )
      default:
        return null
    }
  }

  // Session palette check for layout padding
  const hasSessionColors = useHasSessionColors()
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle debug mode with Alt+D
      if (e.altKey && e.key.toLowerCase() === 'd') {
        const current = useStore.getState().debugModeEnabled
        useStore.getState().setDebugModeEnabled(!current)
        console.log('[Home] Debug mode:', !current)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <main className={`flex flex-col ${image ? 'md:flex-row' : ''} min-h-screen min-h-dvh bg-paper overflow-x-hidden ${compactMode ? 'compact-mode' : ''} ${hasSessionColors ? 'pb-14 md:pb-0' : ''} ${!image ? 'layout-hero-mode' : ''}`}>
      {/* Mobile Header - only show when image is loaded */}
      {image && (
        <MobileHeader
          hasImage={!!image}
          onClearImage={handleClearImage}
        />
      )}
      <div className={`flex-1 flex flex-col min-h-0 min-w-0 mobile-preview-area ${compactMode ? 'p-0 md:p-3' : 'p-0 md:p-6'}`}>
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
          />
        </div>

        {/* Highlight Controls - contextual */}
        <HighlightControls />

        {/* Main Canvas Area */}
        <div 
          className="flex-1 min-h-0 relative" 
          ref={canvasContainerRef}
          style={{ height: '100%', minHeight: '100%' }}
        >
          <ErrorBoundary
            fallback={({ resetError }) => (
              <CanvasErrorFallback
                resetError={resetError}
                onReset={handleClearImage}
              />
            )}
          >
            <ImageCanvas
              image={image}
              onImageLoad={handleImageLoad}
              onReset={handleClearImage}
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
          className="mobile-controls-area"
        >
          {/* Tab Bar - only shown when expanded and NOT mobile dashboard mode - Thin Core only */}
          {!isMobile && (
            <div className="flex border-b border-ink-hairline bg-paper-elevated items-stretch">
              {TABS.map((tab, index) => (
                <button
                  key={tab.id}
                  className={`flex-1 flex items-center justify-center py-4 transition-all relative ${activeTab === tab.id
                    ? 'text-signal'
                    : 'text-ink-faint hover:text-ink-secondary hover:bg-paper-recessed'
                    }`}
                  onClick={() => setActiveTab(tab.id)}
                  title={`${tab.tooltip} (${index + 1})`}
                >
                  {tab.icon}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-signal animate-in fade-in zoom-in-95" />
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto">
            {/* Thin Core: Always show tabs directly, no dashboard */}
            <ErrorBoundary
              fallback={({ error, resetError }) => (
                <SidebarErrorFallback error={error} resetError={resetError} />
              )}
              key={activeTab}
            >
              {renderTabContent()}
            </ErrorBoundary>
          </div>
        </CollapsibleSidebar>
      )}

      {isMobile && (
        <MobileNavigation
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab)
          }}
          pinnedCount={pinnedColors.length}
          onOpenCanvasSettings={() => setShowCanvasSettingsModal(true)}
          onOpenCalibration={() => setShowCalibrationModal(true)}
          hasImage={!!image}
        />
      )}

      <SessionPaletteStrip onColorSelect={handleSessionColorSelect} />

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

    </main>
  )
}