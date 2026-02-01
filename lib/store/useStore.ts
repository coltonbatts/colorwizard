import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PinnedColor } from '../types/pinnedColor'
import { ValueScaleSettings, DEFAULT_VALUE_SCALE_SETTINGS } from '../types/valueScale'
import { Palette, DEFAULT_PALETTE } from '../types/palette'
import { ValueScaleResult } from '../valueScale'
import { CanvasSettings, DEFAULT_CANVAS_SETTINGS } from '../types/canvas'
import { MeasurementLayer } from '../types/measurement'
import {
    CalibrationData,
    TransformState,
    loadCalibration,
    saveCalibration as persistCalibration,
    clearCalibration as removeCalibration,
    isCalibrationStale
} from '../calibration'

// Point type for measurement
interface Point {
    x: number
    y: number
}

interface ColorState {
    sampledColor: {
        hex: string
        rgb: { r: number; g: number; b: number }
        hsl: { h: number; s: number; l: number }
        valueMetadata?: {
            y: number
            step: number
            range: [number, number]
            percentile: number
        }
    } | null
    activeHighlightColor: { r: number; g: number; b: number } | null
    highlightTolerance: number
    highlightMode: 'solid' | 'heatmap'
    image: HTMLImageElement | null
    activeTab: 'surface' | 'structure' | 'reference' | 'sample' | 'oilmix' | 'palette' | 'matches' | 'advanced' | 'pinned' | 'cards' | 'library'
    pinnedColors: PinnedColor[]
    valueScaleSettings: ValueScaleSettings
    histogramBins: number[]
    valueScaleResult: ValueScaleResult | null
    palettes: Palette[]
    showPaletteManager: boolean
    canvasSettings: CanvasSettings

    // Surface State
    surfaceImage: string | null
    surfaceBounds: { x: number; y: number; width: number; height: number } | null

    // Grid (Structure) state
    gridOpacity: number

    // Reference State
    referenceImage: string | null
    referenceOpacity: number
    referenceLocked: boolean
    referenceTransform: {
        x: number
        y: number
        scale: number
        rotation: number
    }

    // Layout preferences
    sidebarCollapsed: boolean
    compactMode: boolean
    sidebarWidth: number

    // Simple/Advanced mode - controls UI complexity
    simpleMode: boolean

    // Breakdown state
    breakdownValue: number

    // Value Mode (value-first workflow)
    valueModeEnabled: boolean
    valueModeSteps: 5 | 7 | 9 | 11

    // Calibration State
    calibration: CalibrationData | null
    calibrationStale: boolean
    showCalibrationModal: boolean

    // Measurement State
    measureMode: boolean
    measurePointA: Point | null
    measurePointB: Point | null
    measurementLayer: MeasurementLayer

    // Grid/Ruler State
    rulerGridEnabled: boolean
    rulerGridSpacing: 0.25 | 0.5 | 1 | 2

    // Transform State (zoom/pan)
    transformState: TransformState
    lastSampleTime: number

    // Modal State
    showCanvasSettingsModal: boolean

    // Actions
    setSampledColor: (color: ColorState['sampledColor']) => void
    setLastSampleTime: (time: number) => void
    setActiveHighlightColor: (color: ColorState['activeHighlightColor']) => void
    setHighlightTolerance: (tolerance: number) => void
    setHighlightMode: (mode: ColorState['highlightMode']) => void
    setImage: (image: HTMLImageElement | null) => void
    setActiveTab: (tab: ColorState['activeTab']) => void
    setPinnedColors: (colors: PinnedColor[]) => void
    setValueScaleSettings: (settings: ValueScaleSettings) => void
    setHistogramBins: (bins: number[]) => void
    setValueScaleResult: (result: ValueScaleResult | null) => void
    setPalettes: (palettes: Palette[]) => void
    setShowPaletteManager: (show: boolean) => void
    setCanvasSettings: (settings: CanvasSettings) => void
    setSurfaceImage: (image: string | null) => void
    setSurfaceBounds: (bounds: ColorState['surfaceBounds']) => void
    setGridOpacity: (opacity: number) => void
    setReferenceImage: (image: string | null) => void
    setReferenceOpacity: (opacity: number) => void
    setReferenceLocked: (locked: boolean) => void
    setReferenceTransform: (transform: ColorState['referenceTransform']) => void
    resetReferenceTransform: () => void

    // Layout actions
    setSidebarCollapsed: (collapsed: boolean) => void
    setCompactMode: (compact: boolean) => void
    setSidebarWidth: (width: number) => void
    setBreakdownValue: (value: number) => void

    // Value Mode actions
    setValueModeEnabled: (enabled: boolean) => void
    toggleValueMode: () => void
    setValueModeSteps: (steps: 5 | 7 | 9 | 11) => void

    toggleSidebar: () => void
    toggleCompactMode: () => void
    setSimpleMode: (simple: boolean) => void
    toggleSimpleMode: () => void

    // Calibration actions
    setCalibration: (data: CalibrationData | null) => void
    setCalibrationStale: (stale: boolean) => void
    setShowCalibrationModal: (show: boolean) => void
    saveCalibration: (data: CalibrationData) => void
    resetCalibration: () => void
    loadCalibrationFromStorage: () => void

    // Measurement actions
    setMeasureMode: (enabled: boolean) => void
    setMeasurePoints: (a: Point | null, b: Point | null) => void
    setMeasurementLayer: (layer: MeasurementLayer) => void
    toggleMeasureMode: () => void
    clearMeasurePoints: () => void
    toggleMeasurementLayer: () => void

    // Grid/Ruler actions
    setRulerGridEnabled: (enabled: boolean) => void
    setRulerGridSpacing: (spacing: 0.25 | 0.5 | 1 | 2) => void
    toggleRulerGrid: () => void

    // Transform actions
    setTransformState: (state: TransformState) => void

    // Modal actions
    setShowCanvasSettingsModal: (show: boolean) => void

    // Derived / Complex Actions
    pinColor: (newPin: PinnedColor) => void
    unpinColor: (id: string) => void
    clearPinned: () => void
    createPalette: (palette: Palette) => void
    updatePalette: (palette: Palette) => void
    deletePalette: (id: string) => void
    setActivePalette: (id: string) => void
}

const DEFAULT_TRANSFORM_STATE: TransformState = {
    zoomLevel: 1,
    panOffset: { x: 0, y: 0 }
}

export const useStore = create<ColorState>()(
    persist(
        (set, get) => ({
            sampledColor: null,
            activeHighlightColor: null,
            highlightTolerance: 20,
            highlightMode: 'solid',
            image: null,
            activeTab: 'sample',
            pinnedColors: [],
            valueScaleSettings: DEFAULT_VALUE_SCALE_SETTINGS,
            histogramBins: [],
            valueScaleResult: null,
            palettes: [DEFAULT_PALETTE],
            showPaletteManager: false,
            canvasSettings: DEFAULT_CANVAS_SETTINGS,
            surfaceImage: null,
            surfaceBounds: null,
            gridOpacity: 0.3,
            referenceImage: null,
            referenceOpacity: 1.0,
            referenceLocked: false,
            referenceTransform: { x: 0, y: 0, scale: 1, rotation: 0 },

            // Layout preferences
            sidebarCollapsed: false,
            compactMode: false,
            sidebarWidth: 400,
            simpleMode: true, // Default to simple mode for new users

            // Breakdown state
            breakdownValue: 0,

            // Value Mode (value-first workflow)
            valueModeEnabled: false,
            valueModeSteps: 9,

            // Calibration State
            calibration: null,
            calibrationStale: false,
            showCalibrationModal: false,

            // Measurement State
            measureMode: false,
            measurePointA: null,
            measurePointB: null,
            measurementLayer: 'reference',

            // Grid/Ruler State
            rulerGridEnabled: false,
            rulerGridSpacing: 1,

            // Transform State
            transformState: DEFAULT_TRANSFORM_STATE,
            lastSampleTime: 0,

            // Modal State
            showCanvasSettingsModal: false,

            setSampledColor: (sampledColor) => {
                const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
                if (isMobile && sampledColor) {
                    set({ sampledColor, sidebarCollapsed: false, lastSampleTime: Date.now() })
                } else if (sampledColor) {
                    set({ sampledColor, lastSampleTime: Date.now() })
                } else {
                    set({ sampledColor })
                }
            },
            setLastSampleTime: (lastSampleTime) => set({ lastSampleTime }),
            setActiveHighlightColor: (activeHighlightColor) => set({ activeHighlightColor }),
            setHighlightTolerance: (highlightTolerance) => set({ highlightTolerance }),
            setHighlightMode: (highlightMode) => set({ highlightMode }),
            setImage: (image) => {
                console.log('[useStore] setImage called with:', image ? `${image.width}x${image.height}` : 'null');
                set({ image, referenceImage: image ? image.src : null });
            },
            setActiveTab: (activeTab) => set({ activeTab }),
            setPinnedColors: (pinnedColors) => set({ pinnedColors }),
            setValueScaleSettings: (valueScaleSettings) => set({ valueScaleSettings }),
            setHistogramBins: (histogramBins) => set({ histogramBins }),
            setValueScaleResult: (valueScaleResult) => set({ valueScaleResult }),
            setPalettes: (palettes) => set({ palettes }),
            setShowPaletteManager: (showPaletteManager) => set({ showPaletteManager }),
            setCanvasSettings: (canvasSettings) => set({ canvasSettings }),
            setSurfaceImage: (surfaceImage) => set({ surfaceImage }),
            setSurfaceBounds: (surfaceBounds) => set({ surfaceBounds }),
            setGridOpacity: (gridOpacity) => set({ gridOpacity }),
            setReferenceImage: (referenceImage) => set({ referenceImage }),
            setReferenceOpacity: (referenceOpacity) => set({ referenceOpacity }),
            setReferenceLocked: (referenceLocked) => set({ referenceLocked }),
            setReferenceTransform: (referenceTransform) => set({ referenceTransform }),
            resetReferenceTransform: () => set({ referenceTransform: { x: 0, y: 0, scale: 1, rotation: 0 } }),

            // Layout actions
            setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
            setCompactMode: (compactMode) => set({ compactMode }),
            setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
            setBreakdownValue: (breakdownValue) => set({ breakdownValue }),

            // Value Mode actions
            setValueModeEnabled: (valueModeEnabled) => set({ valueModeEnabled }),
            toggleValueMode: () => set((state) => ({ valueModeEnabled: !state.valueModeEnabled })),
            setValueModeSteps: (valueModeSteps) => set({ valueModeSteps }),

            toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
            toggleCompactMode: () => set((state) => ({ compactMode: !state.compactMode })),
            setSimpleMode: (simpleMode) => set({ simpleMode }),
            toggleSimpleMode: () => set((state) => ({ simpleMode: !state.simpleMode })),

            // Calibration actions
            setCalibration: (calibration) => set({ calibration }),
            setCalibrationStale: (calibrationStale) => set({ calibrationStale }),
            setShowCalibrationModal: (showCalibrationModal) => set({ showCalibrationModal }),

            saveCalibration: (data) => {
                persistCalibration(data)
                set({ calibration: data, calibrationStale: false })
            },

            resetCalibration: () => {
                removeCalibration()
                set({
                    calibration: null,
                    calibrationStale: false,
                    rulerGridEnabled: false,
                    measureMode: false,
                    measurePointA: null,
                    measurePointB: null
                })
            },

            loadCalibrationFromStorage: () => {
                const saved = loadCalibration()
                if (saved) {
                    set({
                        calibration: saved,
                        calibrationStale: isCalibrationStale(saved)
                    })
                }
            },

            // Measurement actions
            setMeasureMode: (measureMode) => set({ measureMode }),
            setMeasurePoints: (measurePointA, measurePointB) => set({ measurePointA, measurePointB }),
            setMeasurementLayer: (measurementLayer) => set({ measurementLayer }),

            toggleMeasureMode: () => {
                const state = get()
                if (state.calibration) {
                    if (!state.measureMode) {
                        // Reset points when entering measure mode
                        set({ measureMode: true, measurePointA: null, measurePointB: null })
                    } else {
                        set({ measureMode: false })
                    }
                }
            },

            clearMeasurePoints: () => set({ measurePointA: null, measurePointB: null }),

            toggleMeasurementLayer: () => set((state) => ({
                measurementLayer: state.measurementLayer === 'reference' ? 'painting' : 'reference'
            })),

            // Grid/Ruler actions
            setRulerGridEnabled: (rulerGridEnabled) => set({ rulerGridEnabled }),
            setRulerGridSpacing: (rulerGridSpacing) => set({ rulerGridSpacing }),
            toggleRulerGrid: () => {
                const state = get()
                if (state.calibration) {
                    set({ rulerGridEnabled: !state.rulerGridEnabled })
                }
            },

            // Transform actions
            setTransformState: (transformState) => set({ transformState }),

            // Modal actions
            setShowCanvasSettingsModal: (showCanvasSettingsModal) => set({ showCanvasSettingsModal }),

            pinColor: (newPin) => set((state) => {
                const filtered = state.pinnedColors.filter(p => p.hex !== newPin.hex)
                const next = [newPin, ...filtered].slice(0, 30)
                return { pinnedColors: next }
            }),

            unpinColor: (id) => set((state) => ({
                pinnedColors: state.pinnedColors.filter(p => p.id !== id)
            })),

            clearPinned: () => set({ pinnedColors: [] }),

            createPalette: (newPalette) => set((state) => ({
                palettes: [...state.palettes, newPalette]
            })),

            updatePalette: (updated) => set((state) => ({
                palettes: state.palettes.map(p => p.id === updated.id ? updated : p)
            })),

            deletePalette: (id) => set((state) => {
                const filtered = state.palettes.filter(p => p.id !== id)
                if (state.palettes.find(p => p.id === id)?.isActive && filtered.length > 0) {
                    filtered[0].isActive = true
                }
                return { palettes: filtered }
            }),

            setActivePalette: (id) => set((state) => ({
                palettes: state.palettes.map(p => ({
                    ...p,
                    isActive: p.id === id
                }))
            })),
        }),
        {
            name: 'colorwizard-storage',
            partialize: (state) => ({
                pinnedColors: state.pinnedColors,
                palettes: state.palettes,
                valueScaleSettings: state.valueScaleSettings,
                // Persist layout preferences
                sidebarCollapsed: state.sidebarCollapsed,
                compactMode: state.compactMode,
                sidebarWidth: state.sidebarWidth,
                simpleMode: state.simpleMode,
                canvasSettings: state.canvasSettings,
                // Persist grid settings
                rulerGridEnabled: state.rulerGridEnabled,
                rulerGridSpacing: state.rulerGridSpacing,
                // Persist breakdown value
                breakdownValue: state.breakdownValue,
                valueModeEnabled: state.valueModeEnabled,
                valueModeSteps: state.valueModeSteps,
                // Persist surface state
                surfaceImage: state.surfaceImage,
                surfaceBounds: state.surfaceBounds,
                gridOpacity: state.gridOpacity,
            }),
        }
    )
)
