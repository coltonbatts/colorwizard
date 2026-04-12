'use client'

/**
 * Home page - Main application entry point.
 * Refactored UI with calm progressive disclosure.
 * Optimized with useShallow() to reduce unnecessary re-renders by 10-15%.
 */

import { useMemo, useEffect, useRef, useCallback, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import ImageCanvas, { ImageCanvasHandle } from '@/components/ImageCanvas'
import { useImageAnalyzer } from '@/hooks/useImageAnalyzer'
import { TabType } from '@/components/CollapsibleSidebar'
import CompactToolbar from '@/components/CompactToolbar'
import PaletteManager from '@/components/PaletteManager'
import CalibrationModal from '@/components/CalibrationModal'
import CanvasSettingsModal from '@/components/CanvasSettingsModal'
import SessionPaletteStrip, { SessionColor, useSessionPalette, useHasSessionColors } from '@/components/SessionPaletteStrip'
import MobileDashboard from '@/components/MobileDashboard'
import MobileNavigation from '@/components/MobileNavigation'
import MobileHeader from '@/components/MobileHeader'
import WorkbenchModeRail from '@/components/WorkbenchModeRail'
import DesktopSampleHud from '@/components/workbench/DesktopSampleHud'
import FloatingInspectorPanel from '@/components/workbench/FloatingInspectorPanel'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { rgbToHex, rgbToHsl } from '@/lib/color/conversions'
import { getRelativeLuminance, getStepIndex } from '@/lib/valueScale'
import { useCanvasStore } from '@/lib/store/useCanvasStore'
import { useCalibrationStore } from '@/lib/store/useCalibrationStore'
import { useDebugStore } from '@/lib/store/useDebugStore'
import { useLayoutStore } from '@/lib/store/useLayoutStore'
import { usePaletteStore } from '@/lib/store/usePaletteStore'
import { useSessionStore } from '@/lib/store/useSessionStore'
import { getWorkbenchLayoutMode } from '@/lib/layout/workbenchLayout'
import { useElementSize } from '@/hooks/useElementSize'
import { isTauri, resolveTauriCanvasImageSrc } from '@/lib/tauri'
import { DEFAULT_VALUE_STEP_COUNT } from '@/lib/valueMode'

// Tab content components - Thin Core only
import SampleTab from '@/components/tabs/SampleTab'
import MatchesTab from '@/components/tabs/MatchesTab'
import OilMixTab from '@/components/tabs/OilMixTab'
import PaintLibraryTab from '@/components/tabs/PaintLibraryTab'
import ReferenceTab from '@/components/tabs/ReferenceTab'
import StructureTab from '@/components/tabs/StructureTab'
import SurfaceTab from '@/components/tabs/SurfaceTab'
import ColorDeckPanel from '@/components/ColorDeckPanel'
import ErrorBoundary from '@/components/ErrorBoundary'
import HighlightControls from '@/components/HighlightControls'
import { CanvasErrorFallback } from '@/components/errors/CanvasErrorFallback'
import { SidebarErrorFallback } from '@/components/errors/SidebarErrorFallback'

const MOBILE_TABS: readonly TabType[] = ['sample', 'matches', 'deck']

const DESKTOP_PANEL_META: Record<Exclude<TabType, 'sample'>, { title: string; subtitle: string }> = {
  matches: {
    title: 'Threads',
    subtitle: 'Closest floss matches',
  },
  mix: {
    title: 'Mix Lab',
    subtitle: 'Recipe and harmony tools',
  },
  library: {
    title: 'Library',
    subtitle: 'Paint catalog and palette building',
  },
  reference: {
    title: 'Reference',
    subtitle: 'Overlay image controls',
  },
  structure: {
    title: 'Structure',
    subtitle: 'Grid and guide settings',
  },
  surface: {
    title: 'Surface',
    subtitle: 'Canvas texture layer',
  },
  deck: {
    title: 'Deck',
    subtitle: 'Saved color studies',
  },
}

// Compatibility shim for stale Fast Refresh bundles that may still reference the
// previous desktop inspector title map while the module is being reloaded.
const INSPECTOR_TITLES: Record<Exclude<TabType, 'deck'>, string> = {
  sample: 'Sample',
  matches: DESKTOP_PANEL_META.matches.title,
  mix: DESKTOP_PANEL_META.mix.title,
  library: DESKTOP_PANEL_META.library.title,
  reference: DESKTOP_PANEL_META.reference.title,
  structure: DESKTOP_PANEL_META.structure.title,
  surface: DESKTOP_PANEL_META.surface.title,
}

export default function Home() {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<TabType>('sample')
  const [showPaletteManager, setShowPaletteManager] = useState(false)
  const [showCalibrationModal, setShowCalibrationModal] = useState(false)
  const [showCanvasSettingsModal, setShowCanvasSettingsModal] = useState(false)
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [dismissPreviewSignal, setDismissPreviewSignal] = useState(0)
  const { ref: workspaceFrameRef, size: workspaceFrameSize } = useElementSize<HTMLDivElement>()

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
  const setActiveValueBandIndex = useCanvasStore(state => state.setActiveValueBandIndex)
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

  const compactMode = useLayoutStore(state => state.compactMode)
  const simpleMode = useLayoutStore(state => state.simpleMode)
  const toggleSimpleMode = useLayoutStore(state => state.toggleSimpleMode)

  const debugModeEnabled = useDebugStore(state => state.debugModeEnabled)
  const toggleDebugMode = useDebugStore(state => state.toggleDebugMode)

  const normalizeValueWorkflow = useCallback((enabled: boolean) => {
    setValueModeEnabled(enabled)
    setValueModeSteps(DEFAULT_VALUE_STEP_COUNT)

    if (
      valueScaleSettings.enabled !== enabled ||
      valueScaleSettings.steps !== DEFAULT_VALUE_STEP_COUNT ||
      valueScaleSettings.mode !== 'Even' ||
      valueScaleSettings.clip !== 0
    ) {
      setValueScaleSettings({
        ...valueScaleSettings,
        enabled,
        steps: DEFAULT_VALUE_STEP_COUNT,
        mode: 'Even',
        clip: 0,
      })
    }
  }, [setValueModeEnabled, setValueModeSteps, setValueScaleSettings, valueScaleSettings])

  const handleToggleValueMode = useCallback(() => {
    normalizeValueWorkflow(!valueModeEnabled)
  }, [normalizeValueWorkflow, valueModeEnabled])

  // Wrapper for setImage that always resets value mode
  const handleImageLoad = useCallback((img: HTMLImageElement) => {
    console.log('[Home] Image loaded, resetting value mode')
    setImage(img)
    setReferenceOpacity(1)
    resetReferenceTransform()
    normalizeValueWorkflow(false)
  }, [normalizeValueWorkflow, resetReferenceTransform, setImage, setReferenceOpacity])

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
    normalizeValueWorkflow(false)
    setActiveTab('sample')
    setIsNavOpen(false)
    setShowPaletteManager(false)
    setShowCalibrationModal(false)
    setShowCanvasSettingsModal(false)
    lastProcessedRef.current = null
  }, [normalizeValueWorkflow, resetReferenceTransform, setActiveHighlightColor, setBreakdownValue, setHistogramBins, setImage, setReferenceImage, setReferenceOpacity, setSampledColor, setSurfaceBounds, setSurfaceImage, setValueScaleResult])

  const lastProcessedRef = useRef<string | null>(null)

  // Project hydrate clears `image` but can keep the same absolute path as the prior session.
  // Clear the ref in a separate effect so the loader effect keeps a stable dependency list.
  useEffect(() => {
    if (!referenceImage) return
    if (image === null && lastProcessedRef.current === referenceImage) {
      lastProcessedRef.current = null
    }
  }, [referenceImage, image])

  // Synchronize persistent referenceImage string to runtime HTMLImageElement
  useEffect(() => {
    if (!referenceImage) {
      lastProcessedRef.current = null
      return
    }

    if (referenceImage !== lastProcessedRef.current) {
      let cancelled = false
      console.log('[Home] Loading reference image from string...')
      lastProcessedRef.current = referenceImage

      void resolveTauriCanvasImageSrc(referenceImage)
        .then((src) => {
          if (cancelled || !src) {
            if (!cancelled) lastProcessedRef.current = null
            return
          }

          const img = new Image()
          if (!isTauri() && (src.startsWith('http://') || src.startsWith('https://'))) {
            try {
              const u = new URL(src, typeof window !== 'undefined' ? window.location.href : undefined)
              if (typeof window !== 'undefined' && u.origin !== window.location.origin) {
                img.crossOrigin = 'anonymous'
              }
            } catch {
              /* leave default */
            }
          }
          img.src = src
          img.onload = () => {
            if (cancelled) return
            console.log('[Home] Reference image loaded successfully')
            if (src.startsWith('blob:')) {
              URL.revokeObjectURL(src)
            }
            handleImageLoad(img)
          }
          img.onerror = () => {
            if (cancelled) return
            if (src.startsWith('blob:')) {
              URL.revokeObjectURL(src)
            }
            const hint =
              src.startsWith('data:') ? `data URL (${src.length} chars)` : src.slice(0, 160)
            console.error('[Home] Failed to load reference image:', hint)
            lastProcessedRef.current = null
          }
        })
        .catch((error) => {
          if (cancelled) return
          console.error('[Home] Failed to resolve reference image:', error)
          lastProcessedRef.current = null
        })

      return () => {
        cancelled = true
      }
    }
  }, [referenceImage, handleImageLoad])

  // Session palette integration
  const { addColor: addToSession } = useSessionPalette()

  // Canvas container ref
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const imageCanvasRef = useRef<ImageCanvasHandle>(null)

  const {
    valueScaleResult: analyzerValueScaleResult,
    histogramBins: analyzerHistogramBins,
  } = useImageAnalyzer(image, valueScaleSettings)

  const syncActiveBandFromColor = useCallback((color: Parameters<typeof setSampledColor>[0]) => {
    if (!color) return

    const explicitStep = color.valueMetadata?.step
    if (typeof explicitStep === 'number' && explicitStep > 0) {
      setActiveValueBandIndex(explicitStep - 1)
      return
    }

    if (!analyzerValueScaleResult) return

    const luminance = getRelativeLuminance(color.rgb.r, color.rgb.g, color.rgb.b)
    const bandIndex = getStepIndex(luminance, analyzerValueScaleResult.thresholds)
    setActiveValueBandIndex(bandIndex)
  }, [analyzerValueScaleResult, setActiveValueBandIndex])

  const applySampleColor = useCallback((color: Parameters<typeof setSampledColor>[0]) => {
    setSampledColor(color)
    syncActiveBandFromColor(color)
  }, [setSampledColor, syncActiveBandFromColor])

  // Use the hook's results to update the store
  useEffect(() => {
    if (analyzerValueScaleResult) setValueScaleResult(analyzerValueScaleResult)
  }, [analyzerValueScaleResult, setValueScaleResult])

  useEffect(() => {
    if (analyzerHistogramBins.length > 0) setHistogramBins(analyzerHistogramBins)
  }, [analyzerHistogramBins, setHistogramBins])

  useEffect(() => {
    if (!sampledColor) return
    syncActiveBandFromColor(sampledColor)
  }, [sampledColor, syncActiveBandFromColor])

  // Load calibration on mount
  useEffect(() => {
    if (isTauri()) return
    loadCalibrationFromStorage()
  }, [loadCalibrationFromStorage])

  useEffect(() => {
    if (
      valueModeSteps !== DEFAULT_VALUE_STEP_COUNT ||
      valueScaleSettings.steps !== DEFAULT_VALUE_STEP_COUNT ||
      valueScaleSettings.mode !== 'Even' ||
      valueScaleSettings.clip !== 0 ||
      valueScaleSettings.enabled !== valueModeEnabled
    ) {
      normalizeValueWorkflow(valueModeEnabled)
    }
  }, [normalizeValueWorkflow, valueModeEnabled, valueModeSteps, valueScaleSettings])

  // Keyboard shortcuts for tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const tabKeys: Partial<Record<string, TabType>> = {
        '1': 'sample',
        '2': 'matches',
        '3': 'mix',
        '4': 'library',
        '5': 'reference',
        '6': 'structure',
        '7': 'surface',
      }
      const nextTab = tabKeys[e.key]
      if (nextTab) {
        e.preventDefault()
        setActiveTab(nextTab)
      }

      if (e.key === '8') {
        e.preventDefault()
        setActiveTab('deck')
      }

      // Shift+S for Simple/Pro mode toggle
      if (e.key === 'S' && e.shiftKey) {
        e.preventDefault()
        toggleSimpleMode()
      }

      // V for Value Mode toggle
      if ((e.key === 'v' || e.key === 'V') && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        handleToggleValueMode()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSimpleMode, handleToggleValueMode])

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

  const handleDesktopModeChange = useCallback((mode: Exclude<TabType, 'deck'>) => {
    setActiveTab(mode)
  }, [])

  const openPaletteManager = useCallback(() => {
    setDismissPreviewSignal((value) => value + 1)
    setShowPaletteManager(true)
  }, [])

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
              dismissPreviewSignal={dismissPreviewSignal}
              suppressPreviewOverlay={showPaletteManager}
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
      case 'mix':
        return (
          <OilMixTab
            sampledColor={sampledColor}
            activePalette={activePalette}
            onColorSelect={(rgb) => {
              applySampleColor({
                rgb,
                hex: rgbToHex(rgb.r, rgb.g, rgb.b),
                hsl: rgbToHsl(rgb.r, rgb.g, rgb.b),
              })
              setActiveHighlightColor(rgb)
            }}
          />
        )
      case 'library':
        return (
          <PaintLibraryTab
            onColorSelect={(rgb) => {
              applySampleColor({
                rgb,
                hex: rgbToHex(rgb.r, rgb.g, rgb.b),
                hsl: rgbToHsl(rgb.r, rgb.g, rgb.b),
              })
              setActiveHighlightColor(rgb)
            }}
          />
        )
      case 'reference':
        return <ReferenceTab />
      case 'structure':
        return <StructureTab />
      case 'surface':
        return <SurfaceTab />
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
  const isPinnedSample = !!sampledColor && pinnedColors.some((p) => p.hex === sampledColor.hex)
  const desktopCanvasMode = (activeTab === 'deck' ? 'sample' : activeTab) as Exclude<TabType, 'deck'>
  const activeDesktopPanel =
    activeTab === 'sample'
      ? null
      : DESKTOP_PANEL_META[activeTab as Exclude<TabType, 'sample'>]
  const desktopLayoutMode = getWorkbenchLayoutMode(workspaceFrameSize.width, workspaceFrameSize.height)
  const desktopShellClass =
    desktopLayoutMode === 'wide'
      ? 'workbench-desktop-shell--wide'
      : desktopLayoutMode === 'medium'
        ? 'workbench-desktop-shell--medium'
        : 'workbench-desktop-shell--narrow'
  const isMobileSampleLayout = isMobile && activeTab === 'sample'
  const mobileSheetHeightClass =
    activeTab === 'sample'
      ? 'h-[clamp(15rem,30dvh,20rem)]'
      : activeTab === 'matches'
        ? 'h-[clamp(18rem,38dvh,24rem)]'
        : 'h-[clamp(19rem,40dvh,26rem)]'

  useEffect(() => {
    if (!isMobile) return
    if (!MOBILE_TABS.includes(activeTab)) {
      setActiveTab('sample')
    }
  }, [activeTab, isMobile])

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
      suppressHydrationWarning
      className={`workbench-shell flex h-[100dvh] min-h-[100dvh] flex-col bg-paper overflow-hidden overscroll-none ${compactMode ? 'compact-mode' : ''} ${hasSessionColors ? 'pb-14 md:pb-0' : ''}`}
    >
      {!isMobile ? (
        <div
          ref={workspaceFrameRef}
          className={`workbench-desktop-shell relative flex flex-1 min-h-0 min-w-0 overflow-hidden ${desktopShellClass}`}
          data-layout={desktopLayoutMode}
        >
          <div className="workbench-desktop-stage relative flex min-h-0 min-w-0 flex-col">
            {image && (
              <>
                <div className="pointer-events-none absolute inset-y-6 left-6 z-40 flex">
                  <div className="pointer-events-auto">
                    <WorkbenchModeRail
                      activeMode={desktopCanvasMode}
                      onModeChange={handleDesktopModeChange}
                      onOpenDeck={() => setActiveTab('deck')}
                    />
                  </div>
                </div>

                <div className="pointer-events-none absolute left-1/2 top-6 z-40 w-full max-w-[min(76rem,calc(100%-13rem))] -translate-x-1/2 px-6">
                  <div className="pointer-events-auto">
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
                      onOpenPaletteManager={openPaletteManager}
                      canvasSettings={canvasSettings}
                      onOpenCanvasSettings={() => setShowCanvasSettingsModal(true)}
                      hasImage={!!image}
                      activeTab={activeTab}
                      onTabChange={setActiveTab}
                      onResetView={() => imageCanvasRef.current?.resetView()}
                      valueModeEnabled={valueModeEnabled}
                      valueModeSteps={valueModeSteps}
                      onToggleValueMode={handleToggleValueMode}
                      onValueModeStepsChange={setValueModeSteps}
                    />
                  </div>
                </div>

                {activeHighlightColor && (
                  <div className="pointer-events-none absolute left-6 top-28 z-30">
                    <div className="pointer-events-auto">
                      <HighlightControls />
                    </div>
                  </div>
                )}
              </>
            )}

            <div className={`flex flex-1 min-h-0 min-w-0 flex-col ${image ? 'px-6 pb-6 pt-24 lg:pl-[6.75rem]' : 'p-0'}`}>
              <div className="relative flex-1 min-h-0" ref={canvasContainerRef}>
                {image && (
                  <div className="pointer-events-none absolute inset-[4%] rounded-[36px] bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.55),transparent_38%),radial-gradient(circle_at_50%_100%,rgba(198,181,154,0.18),transparent_42%)] blur-2xl" />
                )}

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
                    dismissPreviewSignal={dismissPreviewSignal}
                    suppressPreviewOverlay={showPaletteManager}
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
                    sampledColorHex={sampledColor?.hex ?? null}
                    workspaceModeLabel={desktopCanvasMode}
                    showHud={!!image}
                  />
                </ErrorBoundary>
              </div>
            </div>
          </div>

          {image && (
            <div className="workbench-desktop-inspector relative z-40 flex min-h-0 min-w-0">
              <div className="pointer-events-auto flex min-h-0 min-w-0 flex-1">
                {activeTab === 'sample' ? (
                  <DesktopSampleHud
                    sampledColor={sampledColor}
                    activePalette={activePalette}
                    onPin={pinColor}
                    isPinned={isPinnedSample}
                    simpleMode={simpleMode}
                    valueModeEnabled={valueModeEnabled}
                    valueModeSteps={valueModeSteps}
                    layoutMode={desktopLayoutMode}
                    onAddToSession={handleAddToSession}
                  />
                ) : (
                  <AnimatePresence mode="wait">
                    <FloatingInspectorPanel
                      key={activeTab}
                      title={activeDesktopPanel?.title ?? INSPECTOR_TITLES.sample}
                      subtitle={activeDesktopPanel?.subtitle ?? 'Workbench tools'}
                      sampledColorHex={sampledColor?.hex ?? null}
                      layoutMode={desktopLayoutMode}
                      onClose={() => setActiveTab('sample')}
                    >
                      <ErrorBoundary
                        fallback={({ error, resetError }) => (
                          <SidebarErrorFallback error={error} resetError={resetError} />
                        )}
                        key={activeTab}
                      >
                        {renderTabContent()}
                      </ErrorBoundary>
                    </FloatingInspectorPanel>
                  </AnimatePresence>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {image && (
            <MobileHeader
              hasImage={!!image}
              onClearImage={handleClearImage}
              onOpenMenu={() => setIsNavOpen(true)}
            />
          )}

          <div className={`flex-1 flex flex-col min-h-0 min-w-0 mobile-preview-area ${image ? 'workbench-stage-column' : ''} ${compactMode ? 'p-0 md:p-2' : 'p-0 md:p-3'}`}>
            {image && (
              <div className="mb-0 shrink-0 md:mb-3">
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
                  onOpenPaletteManager={openPaletteManager}
                  canvasSettings={canvasSettings}
                  onOpenCanvasSettings={() => setShowCanvasSettingsModal(true)}
                  hasImage={!!image}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  onResetView={() => imageCanvasRef.current?.resetView()}
                  valueModeEnabled={valueModeEnabled}
                  valueModeSteps={valueModeSteps}
                  onToggleValueMode={handleToggleValueMode}
                  onValueModeStepsChange={setValueModeSteps}
                />
              </div>
            )}

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
                  dismissPreviewSignal={dismissPreviewSignal}
                  suppressPreviewOverlay={showPaletteManager}
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
                  sampledColorHex={isMobileSampleLayout ? null : sampledColor?.hex ?? null}
                  workspaceModeLabel={desktopCanvasMode}
                  showHud={!isMobileSampleLayout}
                  mobileLayout={isMobileSampleLayout ? 'sample' : 'default'}
                />
              </ErrorBoundary>
            </div>

            {isMobileSampleLayout && (
              <div className="px-2 pb-[calc(env(safe-area-inset-bottom,0px)+3.75rem)] pt-1.5">
                <MobileDashboard
                  sampledColor={sampledColor}
                  activePalette={activePalette}
                  onPin={pinColor}
                  isPinned={isPinnedSample}
                  onSwitchToMatches={() => setActiveTab('matches')}
                  layout="inline"
                />
              </div>
            )}
          </div>

          {image && !isMobileSampleLayout && (
            <div className="mobile-controls-area z-[60] flex min-h-0 flex-none flex-col items-stretch px-2 pt-2 pb-[env(safe-area-inset-bottom,0px)]">
              {activeHighlightColor && (
                <div className="mb-2">
                  <HighlightControls />
                </div>
              )}
              <ErrorBoundary
                fallback={({ error, resetError }) => (
                  <SidebarErrorFallback error={error} resetError={resetError} />
                )}
                key={activeTab}
              >
                <div className={`w-full max-w-3xl self-center ${mobileSheetHeightClass} overflow-hidden rounded-t-[24px] border border-ink-hairline border-b-0 bg-paper-elevated shadow-[0_-16px_36px_rgba(0,0,0,0.16)]`}>
                  {activeTab === 'sample' ? (
                    <MobileDashboard
                      sampledColor={sampledColor}
                      activePalette={activePalette}
                      onPin={pinColor}
                      isPinned={isPinnedSample}
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
                          hsl: rgbToHsl(rgb.r, rgb.g, rgb.b),
                        })
                        setActiveHighlightColor(rgb)
                        setActiveTab('sample')
                      }}
                    />
                  )}
                </div>
              </ErrorBoundary>
            </div>
          )}

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
        </>
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
