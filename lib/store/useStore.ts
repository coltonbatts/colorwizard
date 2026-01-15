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
    activeTab: 'inspect' | 'shopping' | 'pinned'
    pinnedColors: PinnedColor[]
    valueScaleSettings: ValueScaleSettings
    histogramBins: number[]
    valueScaleResult: ValueScaleResult | null
    palettes: Palette[]
    showPaletteManager: boolean
    canvasSettings: CanvasSettings

    // Layout preferences
    sidebarCollapsed: boolean
    compactMode: boolean

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

    // Modal State
    showCanvasSettingsModal: boolean

    // Actions
    setSampledColor: (color: ColorState['sampledColor']) => void
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

    // Layout actions
    setSidebarCollapsed: (collapsed: boolean) => void
    setCompactMode: (compact: boolean) => void
    toggleSidebar: () => void
    toggleCompactMode: () => void

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
            activeTab: 'inspect',
            pinnedColors: [],
            valueScaleSettings: DEFAULT_VALUE_SCALE_SETTINGS,
            histogramBins: [],
            valueScaleResult: null,
            palettes: [DEFAULT_PALETTE],
            showPaletteManager: false,
            canvasSettings: DEFAULT_CANVAS_SETTINGS,

            // Layout preferences
            sidebarCollapsed: false,
            compactMode: false,

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

            // Modal State
            showCanvasSettingsModal: false,

            setSampledColor: (sampledColor) => set({ sampledColor }),
            setActiveHighlightColor: (activeHighlightColor) => set({ activeHighlightColor }),
            setHighlightTolerance: (highlightTolerance) => set({ highlightTolerance }),
            setHighlightMode: (highlightMode) => set({ highlightMode }),
            setImage: (image) => set({ image }),
            setActiveTab: (activeTab) => set({ activeTab }),
            setPinnedColors: (pinnedColors) => set({ pinnedColors }),
            setValueScaleSettings: (valueScaleSettings) => set({ valueScaleSettings }),
            setHistogramBins: (histogramBins) => set({ histogramBins }),
            setValueScaleResult: (valueScaleResult) => set({ valueScaleResult }),
            setPalettes: (palettes) => set({ palettes }),
            setShowPaletteManager: (showPaletteManager) => set({ showPaletteManager }),
            setCanvasSettings: (canvasSettings) => set({ canvasSettings }),

            // Layout actions
            setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
            setCompactMode: (compactMode) => set({ compactMode }),
            toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
            toggleCompactMode: () => set((state) => ({ compactMode: !state.compactMode })),

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
                canvasSettings: state.canvasSettings,
                // Persist grid settings
                rulerGridEnabled: state.rulerGridEnabled,
                rulerGridSpacing: state.rulerGridSpacing,
            }),
        }
    )
)
