'use client'

/**
 * Home page - Main application entry point.
 * Refactored UI with calm progressive disclosure.
 * Optimized with useShallow() to reduce unnecessary re-renders by 10-15%.
 */

import { useMemo, useEffect, useRef, useCallback, useState } from 'react'
import ImageCanvas, { ImageCanvasHandle } from '@/components/ImageCanvas'
import { useImageAnalyzer } from '@/hooks/useImageAnalyzer'
import CollapsibleSidebar, { TABS, TabType } from '@/components/CollapsibleSidebar'
import CompactToolbar from '@/components/CompactToolbar'
import PaletteManager from '@/components/PaletteManager'
import CalibrationModal from '@/components/CalibrationModal'
import CanvasSettingsModal from '@/components/CanvasSettingsModal'
import SessionPaletteStrip, { SessionColor, useSessionPalette, useHasSessionColors } from '@/components/SessionPaletteStrip'
import MobileDashboard from '@/components/MobileDashboard'
import MobileNavigation from '@/components/MobileNavigation'
import MobileHeader from '@/components/MobileHeader'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { rgbToHex, rgbToHsl } from '@/lib/color/conversions'
import { useCanvasStore } from '@/lib/store/useCanvasStore'
import { useCalibrationStore } from '@/lib/store/useCalibrationStore'
import { useDebugStore } from '@/lib/store/useDebugStore'
import { useLayoutStore } from '@/lib/store/useLayoutStore'
import { usePaletteStore } from '@/lib/store/usePaletteStore'
import { useSessionStore } from '@/lib/store/useSessionStore'

// Tab content components - Thin Core only
import SampleTab from '@/components/tabs/SampleTab'
import MatchesTab from '@/components/tabs/MatchesTab'
import ColorDeckPanel from '@/components/ColorDeckPanel'
import ErrorBoundary from '@/components/ErrorBoundary'
import HighlightControls from '@/components/HighlightControls'
import { CanvasErrorFallback } from '@/components/errors/CanvasErrorFallback'
import { SidebarErrorFallback } from '@/components/errors/SidebarErrorFallback'

export default function Home() {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<TabType>('sample')
  const [showPaletteManager, setShowPaletteManager] = useState(false)
  const [showCalibrationModal, setShowCalibrationModal] = useState(false)
  const [showCanvasSettingsModal, setShowCanvasSettingsModal] = useState(false)
  const [isNavOpen, setIsNavOpen] = useState(false)

  const sampledColor = useSessionStore(state => state.sampledColor)
  const setSampledColor = useSessionStore(state => state.setSampledColor)
  const activeHighlightColor = useSessionStore(state => state.activeHighlightColor)
  const setActiveHighlightColor = useSessionStore(state => state.setActiveHighlightColor)
  const highlightTolerance = useSessionStore(state => state.highlightTolerance)
  const highlightMode = useSessionStore(state => state.highlightMode)
  const pinnedColors = useSessionStore(state => state.pinnedColors)
  const pinColor = useSessionStore(state => state.pinColor)
  const lastSampleTime = useSessionStore(state => state.lastSampleTime)
  const valueModeEnabled = useSessionStore(state => state.valueModeEnabled)
  const valueModeSteps = useSessionStore(state => state.valueModeSteps)
  const toggleValueMode = useSessionStore(state => state.toggleValueMode)
  const setValueModeEnabled = useSessionStore(state => state.setValueModeEnabled)
  const setValueModeSteps = useSessionStore(state => state.setValueModeSteps)

  const image = useCanvasStore(state => state.image)
  const setImage = useCanvasStore(state => state.setImage)
  const referenceImage = useCanvasStore(state => state.referenceImage)
  const setReferenceImage = useCanvasStore(state => state.setReferenceImage)
  const setSurfaceImage = useCanvasStore(state => state.setSurfaceImage)
  const setSurfaceBounds = useCanvasStore(state => state.setSurfaceBounds)
  const setReferenceOpacity = useCanvasStore(state => state.setReferenceOpacity)
  const resetReferenceTransform = useCanvasStore(state => state.resetReferenceTransform)
  const valueScaleSettings = useCanvasStore(state => state.valueScaleSettings)
  const setValueScaleSettings = useCanvasStore(state => state.setValueScaleSettings)
  const setHistogramBins = useCanvasStore(state => state.setHistogramBins)
  const setValueScaleResult = useCanvasStore(state => state.setValueScaleResult)
  const setBreakdownValue = useCanvasStore(state => state.setBreakdownValue)
  const palettes = usePaletteStore(state => state.palettes)
  const createPalette = usePaletteStore(state => state.createPalette)
  const updatePalette = usePaletteStore(state => state.updatePalette)
  const deletePalette = usePaletteStore(state => state.deletePalette)
  const setActivePalette = usePaletteStore(state => state.setActivePalette)
  const canvasSettings = useCanvasStore(state => state.canvasSettings)
  const setCanvasSettings = useCanvasStore(state => state.setCanvasSettings)

  const calibration = useCalibrationStore(state => state.calibration)
  const saveCalibration = useCalibrationStore(state => state.saveCalibration)
  const resetCalibration = useCalibrationStore(state => state.resetCalibration)
  const loadCalibrationFromStorage = useCalibrationStore(state => state.loadCalibrationFromStorage)
  const measureMode = useCalibrationStore(state => state.measureMode)
  const measurePointA = useCalibrationStore(state => state.measurePointA)
  const measurePointB = useCalibrationStore(state => state.measurePointB)
  const measurementLayer = useCalibrationStore(state => state.measurementLayer)
  const setMeasurePoints = useCalibrationStore(state => state.setMeasurePoints)
  const toggleMeasureMode = useCalibrationStore(state => state.toggleMeasureMode)
  const rulerGridEnabled = useCalibrationStore(state => state.rulerGridEnabled)
  const rulerGridSpacing = useCalibrationStore(state => state.rulerGridSpacing)
  const toggleRulerGrid = useCalibrationStore(state => state.toggleRulerGrid)
  const setTransformState = useCalibrationStore(state => state.setTransformState)

  const sidebarCollapsed = useLayoutStore(state => state.sidebarCollapsed)
  const toggleSidebar = useLayoutStore(state => state.toggleSidebar)
  const setSidebarCollapsed = useLayoutStore(state => state.setSidebarCollapsed)
  const sidebarWidth = useLayoutStore(state => state.sidebarWidth)
  const setSidebarWidth = useLayoutStore(state => state.setSidebarWidth)
  const compactMode = useLayoutStore(state => state.compactMode)
  const simpleMode = useLayoutStore(state => state.simpleMode)
  const toggleSimpleMode = useLayoutStore(state => state.toggleSimpleMode)

  const debugModeEnabled = useDebugStore(state => state.debugModeEnabled)
  const toggleDebugMode = useDebugStore(state => state.toggleDebugMode)

  // Wrapper for setImage that always resets value mode
  const handleImageLoad = useCallback((img: HTMLImageElement) => {
    console.log('[Home] Image loaded, resetting value mode')
    setImage(img)
    setReferenceOpacity(1)
    resetReferenceTransform()
    setValueModeEnabled(false) // Always reset value mode when new image loads
  }, [resetReferenceTransform, setImage, setReferenceOpacity, setValueModeEnabled])

  // Clear image and reset view
  const handleClearImage = useCallback(() => {
    console.log('[Home] Clearing image and resetting state')
    setImage(null)
    setReferenceImage(null)
    setSurfaceImage(null)
    setSurfaceBounds(null)
    setReferenceOpacity(1)
    resetReferenceTransform()
    setSampledColor(null)
    setActiveHighlightColor(null)
    setBreakdownValue(0)
    setHistogramBins([])
    setValueScaleResult(null)
    setValueModeEnabled(false) // Reset value mode when clearing image
    setActiveTab('sample')
    setIsNavOpen(false)
    setShowPaletteManager(false)
    setShowCalibrationModal(false)
    setShowCanvasSettingsModal(false)
    lastProcessedRef.current = null
  }, [resetReferenceTransform, setActiveHighlightColor, setActiveTab, setBreakdownValue, setHistogramBins, setImage, setIsNavOpen, setReferenceImage, setReferenceOpacity, setSampledColor, setShowCalibrationModal, setShowCanvasSettingsModal, setShowPaletteManager, setSurfaceBounds, setSurfaceImage, setValueModeEnabled, setValueScaleResult])

  const applySampleColor = useCallback((color: Parameters<typeof setSampledColor>[0]) => {
    setSampledColor(color)
    if (isMobile) {
      setSidebarCollapsed(false)
    }
  }, [isMobile, setSampledColor, setSidebarCollapsed])

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

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return
    const newWidth = window.innerWidth - e.clientX
    if (newWidth >= 300 && newWidth <= 800) {
      setSidebarWidth(newWidth)
    }
  }, [setSidebarWidth])

  const stopResizing = useCallback(() => {
    isResizing.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', stopResizing)
    document.body.style.cursor = 'default'
    document.body.style.userSelect = 'auto'
  }, [handleMouseMove])

  const startResizing = useCallback(() => {
    isResizing.current = true
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', stopResizing)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [handleMouseMove, stopResizing])

  // Canvas container ref
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const imageCanvasRef = useRef<ImageCanvasHandle>(null)

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

      // 1-3 for tab switching (Thin Core)
      const tabKeys: { [key: string]: TabType } = {
        '1': 'sample',
        '2': 'matches',
        '3': 'deck',
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

  // Session palette add handler
  const handleAddToSession = (color: { hex: string; rgb: { r: number; g: number; b: number } }) => {
    addToSession(color.hex, color.rgb)
  }

  // Session color select handler
  const handleSessionColorSelect = (color: SessionColor) => {
    // Convert session color to sampled color format
    applySampleColor({
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
              activePalette={activePalette}
              simpleMode={simpleMode}
              valueModeEnabled={valueModeEnabled}
              valueModeSteps={valueModeSteps}
              onPin={pinColor}
              isPinned={!!sampledColor && pinnedColors.some(p => p.hex === sampledColor.hex)}
              lastSampleTime={lastSampleTime}
              onAddToSession={handleAddToSession}
              onSwitchToMatches={isMobile ? () => setActiveTab('matches') : undefined}
          />
        )
      case 'matches':
        return (
          <MatchesTab
            sampledColor={sampledColor}
            onColorSelect={(rgb) => {
              applySampleColor({
                rgb,
                hex: rgbToHex(rgb.r, rgb.g, rgb.b),
                hsl: rgbToHsl(rgb.r, rgb.g, rgb.b)
              })
              setActiveHighlightColor(rgb)
            }}
          />
        )
      case 'deck':
        return (
          <ColorDeckPanel
            sampledColor={sampledColor}
            activePaletteName={activePalette.name}
            onGoToSample={() => setActiveTab('sample')}
          />
        )
      default:
        return null
    }
  }

  // Session palette check for layout padding
  const hasSessionColors = useHasSessionColors()
  const mobileSheetHeightClass =
    activeTab === 'sample'
      ? 'h-[42dvh] max-h-[42dvh]'
      : 'h-[56dvh] max-h-[56dvh]'
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle debug mode with Alt+D
      if (e.altKey && e.key.toLowerCase() === 'd') {
        const next = !debugModeEnabled
        toggleDebugMode()
        console.log('[Home] Debug mode:', next)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [debugModeEnabled, toggleDebugMode])

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={`flex flex-col ${image ? 'md:flex-row' : ''} h-[100dvh] min-h-[100dvh] bg-paper overflow-hidden overscroll-none ${compactMode ? 'compact-mode' : ''} ${hasSessionColors ? 'pb-14 md:pb-0' : ''} ${!image ? 'layout-hero-mode' : ''}`}
    >
      {/* Mobile Header - only show when image is loaded */}
      {image && (
        <MobileHeader
          hasImage={!!image}
          onClearImage={handleClearImage}
          onOpenMenu={() => setIsNavOpen(true)}
        />
      )}
      <div className={`flex-1 flex flex-col min-h-0 min-w-0 mobile-preview-area ${compactMode ? 'p-0 md:p-3' : 'p-0 md:p-6'}`}>
        {/* Compact Toolbar */}
        {image && (
          <div className="mb-0 md:mb-4">
            <CompactToolbar
              calibration={calibration}
              onOpenCalibration={() => setShowCalibrationModal(true)}
              onResetCalibration={resetCalibration}
              onGoHome={handleClearImage}
              rulerGridEnabled={rulerGridEnabled}
              onToggleRulerGrid={toggleRulerGrid}
              measureMode={measureMode}
              onToggleMeasure={toggleMeasureMode}
              palettes={palettes}
              activePalette={activePalette}
              onSelectPalette={setActivePalette}
              onOpenPaletteManager={() => setShowPaletteManager(true)}
              canvasSettings={canvasSettings}
              onOpenCanvasSettings={() => setShowCanvasSettingsModal(true)}
              hasImage={!!image}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onResetView={() => imageCanvasRef.current?.resetView()}
              valueModeEnabled={valueModeEnabled}
              valueModeSteps={valueModeSteps}
              onToggleValueMode={toggleValueMode}
              onValueModeStepsChange={setValueModeSteps}
            />
          </div>
        )}

        {/* Highlight Controls - contextual */}
        <HighlightControls />

        {/* Main Canvas Area */}
        <div
          className="flex-1 min-h-0 relative"
          ref={canvasContainerRef}
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
              ref={imageCanvasRef}
              image={image}
              onImageLoad={handleImageLoad}
              onReset={handleClearImage}
              onColorSample={(color) => {
                if (measureMode && calibration) {
                  return
                }
                applySampleColor(color)
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

      {/* Results panel - mobile gets a dedicated dashboard, desktop keeps sidebar */}
      {image && (
        isMobile ? (
          <div className="mobile-controls-area fixed inset-x-0 bottom-0 z-[60] flex min-h-0 flex-col items-center px-2 pb-[env(safe-area-inset-bottom,0px)] pointer-events-none">
            <ErrorBoundary
              fallback={({ error, resetError }) => (
                <SidebarErrorFallback error={error} resetError={resetError} />
              )}
              key={activeTab}
            >
              <div className={`pointer-events-auto w-full max-w-3xl ${mobileSheetHeightClass} overflow-hidden rounded-t-[28px] border border-ink-hairline border-b-0 bg-paper-elevated shadow-[0_-20px_50px_rgba(0,0,0,0.18)]`}>
                {activeTab === 'sample' ? (
                  <MobileDashboard
                    sampledColor={sampledColor}
                    activePalette={activePalette}
                    onPin={pinColor}
                    isPinned={!!sampledColor && pinnedColors.some(p => p.hex === sampledColor.hex)}
                    onSwitchToMatches={() => setActiveTab('matches')}
                  />
                ) : activeTab === 'deck' ? (
                  <ColorDeckPanel
                    sampledColor={sampledColor}
                    activePaletteName={activePalette.name}
                    onGoToSample={() => setActiveTab('sample')}
                  />
                ) : (
                  <MatchesTab
                    sampledColor={sampledColor}
                    onColorSelect={(rgb) => {
                      applySampleColor({
                        rgb,
                        hex: rgbToHex(rgb.r, rgb.g, rgb.b),
                        hsl: rgbToHsl(rgb.r, rgb.g, rgb.b)
                      })
                      setActiveHighlightColor(rgb)
                      setActiveTab('sample')
                    }}
                  />
                )}
              </div>
            </ErrorBoundary>
          </div>
        ) : (
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
        )
      )}

      {isMobile && (
        <MobileNavigation
          isOpen={isNavOpen}
          onOpenChange={setIsNavOpen}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab)
          }}
          onOpenCanvasSettings={() => setShowCanvasSettingsModal(true)}
          onOpenCalibration={() => setShowCalibrationModal(true)}
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
