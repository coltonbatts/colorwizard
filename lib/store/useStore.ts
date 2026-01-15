import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PinnedColor } from '../types/pinnedColor'
import { ValueScaleSettings, DEFAULT_VALUE_SCALE_SETTINGS } from '../types/valueScale'
import { Palette, DEFAULT_PALETTE } from '../types/palette'
import { ValueScaleResult } from '../valueScale'
import { CanvasSettings, DEFAULT_CANVAS_SETTINGS } from '../types/canvas'

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

    // Derived / Complex Actions
    pinColor: (newPin: PinnedColor) => void
    unpinColor: (id: string) => void
    clearPinned: () => void
    createPalette: (palette: Palette) => void
    updatePalette: (palette: Palette) => void
    deletePalette: (id: string) => void
    setActivePalette: (id: string) => void
}

export const useStore = create<ColorState>()(
    persist(
        (set) => ({
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
                canvasSettings: state.canvasSettings
            }),
        }
    )
)
