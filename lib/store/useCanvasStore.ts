'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CanvasSettings, DEFAULT_CANVAS_SETTINGS } from '../types/canvas'
import { TransformState } from '../calibration'
import { ValueScaleResult } from '../valueScale'
import { ValueScaleSettings, DEFAULT_VALUE_SCALE_SETTINGS } from '../types/valueScale'
import { safeStorage } from './storage'

interface CanvasState {
    image: HTMLImageElement | null
    surfaceImage: string | null
    surfaceBounds: { x: number; y: number; width: number; height: number } | null
    referenceImage: string | null
    referenceOpacity: number
    referenceLocked: boolean
    referenceTransform: {
        x: number
        y: number
        scale: number
        rotation: number
    }
    valueScaleSettings: ValueScaleSettings
    histogramBins: number[]
    valueScaleResult: ValueScaleResult | null
    breakdownValue: number
    transformState: TransformState
    canvasSettings: CanvasSettings

    setImage: (image: HTMLImageElement | null) => void
    setSurfaceImage: (image: string | null) => void
    setSurfaceBounds: (bounds: CanvasState['surfaceBounds']) => void
    setReferenceImage: (image: string | null) => void
    setReferenceOpacity: (opacity: number) => void
    setReferenceLocked: (locked: boolean) => void
    setReferenceTransform: (transform: CanvasState['referenceTransform']) => void
    resetReferenceTransform: () => void
    setValueScaleSettings: (settings: ValueScaleSettings) => void
    setHistogramBins: (bins: number[]) => void
    setValueScaleResult: (result: ValueScaleResult | null) => void
    setBreakdownValue: (value: number) => void
    setTransformState: (state: TransformState) => void
    setCanvasSettings: (settings: CanvasSettings) => void
}

const DEFAULT_TRANSFORM_STATE: TransformState = {
    zoomLevel: 1,
    panOffset: { x: 0, y: 0 }
}

export const useCanvasStore = create<CanvasState>()(
    persist(
        (set, get) => ({
            image: null,
            surfaceImage: null,
            surfaceBounds: null,
            referenceImage: null,
            referenceOpacity: 1,
            referenceLocked: false,
            referenceTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
            valueScaleSettings: DEFAULT_VALUE_SCALE_SETTINGS,
            histogramBins: [],
            valueScaleResult: null,
            breakdownValue: 0,
            transformState: DEFAULT_TRANSFORM_STATE,
            canvasSettings: DEFAULT_CANVAS_SETTINGS,

            setImage: (image) => {
                const currentImage = get().image
                if (image === currentImage) return

                set({ image, referenceImage: image ? image.src : null })
            },
            setSurfaceImage: (surfaceImage) => set({ surfaceImage }),
            setSurfaceBounds: (surfaceBounds) => set({ surfaceBounds }),
            setReferenceImage: (referenceImage) => set({ referenceImage }),
            setReferenceOpacity: (referenceOpacity) => set({ referenceOpacity }),
            setReferenceLocked: (referenceLocked) => set({ referenceLocked }),
            setReferenceTransform: (referenceTransform) => set({ referenceTransform }),
            resetReferenceTransform: () => set({ referenceTransform: { x: 0, y: 0, scale: 1, rotation: 0 } }),
            setValueScaleSettings: (valueScaleSettings) => set({ valueScaleSettings }),
            setHistogramBins: (histogramBins) => set({ histogramBins }),
            setValueScaleResult: (valueScaleResult) => set({ valueScaleResult }),
            setBreakdownValue: (breakdownValue) => set({ breakdownValue }),
            setTransformState: (transformState) => set({ transformState }),
            setCanvasSettings: (canvasSettings) => set({ canvasSettings }),
        }),
        {
            name: 'colorwizard-canvas',
            storage: safeStorage,
            partialize: (state) => ({
                surfaceImage: state.surfaceImage,
                surfaceBounds: state.surfaceBounds,
                referenceImage: state.referenceImage,
                referenceOpacity: state.referenceOpacity,
                referenceLocked: state.referenceLocked,
                referenceTransform: state.referenceTransform,
                valueScaleSettings: state.valueScaleSettings,
                canvasSettings: state.canvasSettings,
            }),
        }
    )
)
