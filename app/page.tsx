'use client'

/**
 * Home page - Main application entry point.
 * Redesigned with simplified visual hierarchy: Upload → Sample → Results
 * 3-tab structure: Oil Paint, DMC Floss, Color Wheel
 */

import { useMemo, useEffect, useRef, useCallback, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import ImageCanvas from '@/components/ImageCanvas'
import UploadHero from '@/components/UploadHero'
import CurrentColorBadge from '@/components/CurrentColorBadge'
import CalibrationModal from '@/components/CalibrationModal'
import CanvasSettingsModal from '@/components/CanvasSettingsModal'
import PaletteManager from '@/components/PaletteManager'
import MobileNavigation from '@/components/MobileNavigation'
import ErrorBoundary from '@/components/ErrorBoundary'
import { CanvasErrorFallback } from '@/components/errors/CanvasErrorFallback'
import { useIsMobile } from '@/hooks/useMediaQuery'

// Simplified tab components
import OilPaintTab from '@/components/tabs/OilPaintTab'
import DMCFlossTab from '@/components/tabs/DMCFlossTab'
import ColorWheelTab from '@/components/tabs/ColorWheelTab'

import { useStore } from '@/lib/store/useStore'
import { solveRecipe } from '@/lib/paint/solveRecipe'
import { generatePaintRecipe } from '@/lib/colorMixer'
import { findClosestDMCColors } from '@/lib/dmcFloss'

// Simplified 3-tab type
type PrimaryTab = 'oilpaint' | 'dmcfloss' | 'colorwheel'

// Tab configuration
const PRIMARY_TABS: { id: PrimaryTab; label: string; icon: JSX.Element }[] = [
  {
    id: 'oilpaint',
    label: 'Oil Paint',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20" />
        <path d="m4.93 4.93 14.14 14.14" />
        <path d="m4.93 19.07 14.14-14.14" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    )
  },
  {
    id: 'dmcfloss',
    label: 'DMC Floss',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19.5 4.5 L6.5 17.5" strokeWidth="2" />
        <circle cx="20.5" cy="3.5" r="1.5" />
        <path d="M20.5 3.5 C22 2 23 4 21 6 C18 9 15 8 13 11 C11 14 12 17 9 19 C7 21 4 20 3 18" />
      </svg>
    )
  },
  {
    id: 'colorwheel',
    label: 'Color Wheel',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
        <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
        <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
        <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.7 1.7-1.7h2c3 0 5.5-2.5 5.5-5.5C22 6 17.5 2 12 2z" />
      </svg>
    )
  },
]

export default function Home() {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<PrimaryTab>('oilpaint')
  const [isPinning, setIsPinning] = useState(false)

  const {
    // Core color state
    sampledColor, setSampledColor,
    activeHighlightColor, setActiveHighlightColor,
    highlightTolerance, setHighlightTolerance,
    highlightMode, setHighlightMode,
    image, setImage,
    pinnedColors, pinColor,
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

  // Canvas container ref
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  // Load calibration on mount
  useEffect(() => {
    loadCalibrationFromStorage()
  }, [loadCalibrationFromStorage])

  // Derived active palette
  const activePalette = useMemo(() => {
    return palettes.find(p => p.isActive) || palettes[0] || { id: 'default', name: 'Default', colors: [], isActive: true, isDefault: true }
  }, [palettes])

  // Pin color handler
  const handlePinColor = useCallback(async () => {
    if (!sampledColor || isPinning) return

    setIsPinning(true)
    try {
      const spectral = await solveRecipe(sampledColor.hex)
      const fallback = generatePaintRecipe(sampledColor.hsl)
      const dmc = findClosestDMCColors(sampledColor.rgb, 5)

      pinColor({
        id: crypto.randomUUID(),
        hex: sampledColor.hex,
        rgb: sampledColor.rgb,
        hsl: sampledColor.hsl,
        label: `Color ${sampledColor.hex}`,
        timestamp: Date.now(),
        spectralRecipe: spectral,
        fallbackRecipe: fallback,
        dmcMatches: dmc
      })
    } catch (e) {
      console.error('Failed to pin color', e)
    } finally {
      setIsPinning(false)
    }
  }, [sampledColor, isPinning, pinColor])

  // Check if current color is pinned
  const isCurrentColorPinned = useMemo(() => {
    return !!sampledColor && pinnedColors.some(p => p.hex === sampledColor.hex)
  }, [sampledColor, pinnedColors])

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'oilpaint':
        return (
          <OilPaintTab
            sampledColor={sampledColor}
            activePalette={activePalette}
          />
        )
      case 'dmcfloss':
        return (
          <DMCFlossTab
            sampledColor={sampledColor}
            onColorSelect={(rgb) => setActiveHighlightColor(rgb)}
          />
        )
      case 'colorwheel':
        return (
          <ColorWheelTab
            sampledColor={sampledColor}
            onColorSelect={(rgb) => setActiveHighlightColor(rgb)}
          />
        )
      default:
        return null
    }
  }

  // If no image, show upload hero
  if (!image) {
    return (
      <main className="layout-hero-mode">
        <AnimatePresence mode="wait">
          <UploadHero onImageLoad={setImage} />
        </AnimatePresence>

        {/* Modals still accessible */}
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

  // Main app layout with image loaded
  return (
    <main className={`flex flex-col h-screen bg-white overflow-hidden ${isMobile ? '' : 'lg:layout-desktop-row'}`}>
      {/* Canvas Area - Primary Focus */}
      <div className="canvas-primary" ref={canvasContainerRef}>
        {/* Highlight Controls - contextual, minimal */}
        {activeHighlightColor && (
          <div className="absolute top-2 left-2 right-2 z-20 p-3 bg-white/95 backdrop-blur-sm rounded-xl flex items-center gap-4 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-top-2">
            <span className="text-[10px] font-bold text-studio-dim uppercase tracking-widest">Highlight</span>
            <div className="flex bg-gray-50 rounded-lg p-0.5">
              <button
                onClick={() => setHighlightMode('solid')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${highlightMode === 'solid' ? 'bg-white text-blue-600 shadow-sm' : 'text-studio-dim'}`}
              >
                Solid
              </button>
              <button
                onClick={() => setHighlightMode('heatmap')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${highlightMode === 'heatmap' ? 'bg-white text-blue-600 shadow-sm' : 'text-studio-dim'}`}
              >
                Heatmap
              </button>
            </div>
            <input
              type="range"
              min="1"
              max="60"
              value={highlightTolerance}
              onChange={(e) => setHighlightTolerance(Number(e.target.value))}
              className="flex-1 h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <button
              onClick={() => setActiveHighlightColor(null)}
              className="px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              ✕
            </button>
          </div>
        )}

        {/* Image Canvas */}
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
      </div>

      {/* Result Panel - Tab Content */}
      <div className="result-panel">
        {/* Current Color Badge */}
        <div className="p-3 border-b border-gray-100">
          <CurrentColorBadge
            sampledColor={sampledColor}
            onPin={handlePinColor}
            isPinned={isCurrentColorPinned}
            isPinning={isPinning}
          />
        </div>

        {/* Tab Navigation */}
        <div className="tab-nav-simple">
          {PRIMARY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-nav-simple-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span className="tab-nav-simple-icon">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {renderTabContent()}
        </div>
      </div>

      {/* Mobile Navigation - Secondary Menu */}
      {isMobile && (
        <MobileNavigation
          activeTab="oilmix" // Map to old system for compatibility
          onTabChange={() => { }} // No-op since we handle tabs differently now
          pinnedCount={pinnedColors.length}
          onOpenCanvasSettings={() => setShowCanvasSettingsModal(true)}
          onOpenCalibration={() => setShowCalibrationModal(true)}
          hasImage={!!image}
        />
      )}

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
    </main>
  )
}
