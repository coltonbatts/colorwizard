'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CanvasSettings, DEFAULT_CANVAS_SETTINGS } from '../types/canvas'
import { TransformState } from '../calibration'
import { ValueScaleResult } from '../valueScale'
import { ValueScaleSettings, DEFAULT_VALUE_SCALE_SETTINGS } from '../types/valueScale'
import { canvasPersistStorage, reportReferencePersistence } from './storage'
import { isDesktopApp, sanitizeDesktopProjectImageSrc } from '../tauri'

/** Mid step index for the current N-step value scale (0..steps-1). */
function defaultActiveValueBandIndex(steps: number): number {
    const s = Math.max(1, Math.floor(steps))
    return Math.max(0, Math.floor((s - 1) / 2))
}

interface CanvasState {
    image: HTMLImageElement | null
    demoReferenceHex: string | null
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
    /** 0..valueScaleSettings.steps-1 — which discrete value band is the painting target (see computeValueScale thresholds). */
    activeValueBandIndex: number
    histogramBins: number[]
    valueScaleResult: ValueScaleResult | null
    breakdownValue: number
    transformState: TransformState
    canvasSettings: CanvasSettings

    /**
     * `persistSrc` is the bounded copy to keep in storage. The live `image` stays at full
     * sampling fidelity; only the restored-session copy is compressed to fit the quota.
     */
    setImage: (image: HTMLImageElement | null, persistSrc?: string | null) => void
    setDemoReferenceHex: (hex: string | null) => void
    setSurfaceImage: (image: string | null) => void
    setSurfaceBounds: (bounds: CanvasState['surfaceBounds']) => void
    setReferenceImage: (image: string | null) => void
    setReferenceOpacity: (opacity: number) => void
    setReferenceLocked: (locked: boolean) => void
    setReferenceTransform: (transform: CanvasState['referenceTransform']) => void
    resetReferenceTransform: () => void
    setValueScaleSettings: (settings: ValueScaleSettings) => void
    setActiveValueBandIndex: (index: number) => void
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
            demoReferenceHex: null,
            surfaceImage: null,
            surfaceBounds: null,
            referenceImage: null,
            referenceOpacity: 1,
            referenceLocked: false,
            referenceTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
            valueScaleSettings: DEFAULT_VALUE_SCALE_SETTINGS,
            activeValueBandIndex: defaultActiveValueBandIndex(DEFAULT_VALUE_SCALE_SETTINGS.steps),
            histogramBins: [],
            valueScaleResult: null,
            breakdownValue: 0,
            transformState: DEFAULT_TRANSFORM_STATE,
            canvasSettings: DEFAULT_CANVAS_SETTINGS,

            setImage: (image, persistSrc) => {
                const currentImage = get().image
                if (image === currentImage) return

                const prevRef = get().referenceImage
                // Prefer an explicitly supplied bounded copy; `image.src` may be a
                // full-fidelity data URL far too large for localStorage.
                let nextRef = sanitizeDesktopProjectImageSrc(
                    persistSrc !== undefined && image ? persistSrc : image?.src ?? null,
                )

                // Desktop: <img>.src after load is convertFileSrc → http(s), which sanitize strips
                // (we must not persist those ephemeral URLs). Keep the path or data URL we already have.
                if (isDesktopApp() && image && !nextRef && prevRef) {
                    nextRef = sanitizeDesktopProjectImageSrc(prevRef) ?? prevRef
                }

                // Desktop persists images through SQLite, so a null web reference is expected there.
                if (image && !isDesktopApp()) {
                    reportReferencePersistence(nextRef !== null)
                }

                const steps = get().valueScaleSettings.steps
                const nextBand = image
                    ? defaultActiveValueBandIndex(steps)
                    : defaultActiveValueBandIndex(DEFAULT_VALUE_SCALE_SETTINGS.steps)

                set({
                    image,
                    referenceImage: nextRef,
                    activeValueBandIndex: nextBand,
                })
            },
            setDemoReferenceHex: (demoReferenceHex) => set({ demoReferenceHex }),
            setSurfaceImage: (surfaceImage) => set({ surfaceImage: sanitizeDesktopProjectImageSrc(surfaceImage) }),
            setSurfaceBounds: (surfaceBounds) => set({ surfaceBounds }),
            setReferenceImage: (referenceImage) => set({ referenceImage: sanitizeDesktopProjectImageSrc(referenceImage) }),
            setReferenceOpacity: (referenceOpacity) => set({ referenceOpacity }),
            setReferenceLocked: (referenceLocked) => set({ referenceLocked }),
            setReferenceTransform: (referenceTransform) => set({ referenceTransform }),
            resetReferenceTransform: () => set({ referenceTransform: { x: 0, y: 0, scale: 1, rotation: 0 } }),
            setValueScaleSettings: (valueScaleSettings) =>
                set((state) => {
                    const maxIdx = Math.max(0, valueScaleSettings.steps - 1)
                    const nextIdx = Math.min(Math.max(0, state.activeValueBandIndex), maxIdx)
                    return { valueScaleSettings, activeValueBandIndex: nextIdx }
                }),
            setActiveValueBandIndex: (activeValueBandIndex) =>
                set((state) => {
                    const maxIdx = Math.max(0, state.valueScaleSettings.steps - 1)
                    const clamped = Math.min(Math.max(0, Math.floor(activeValueBandIndex)), maxIdx)
                    return { activeValueBandIndex: clamped }
                }),
            setHistogramBins: (histogramBins) => set({ histogramBins }),
            setValueScaleResult: (valueScaleResult) => set({ valueScaleResult }),
            setBreakdownValue: (breakdownValue) => set({ breakdownValue }),
            setTransformState: (transformState) => set({ transformState }),
            setCanvasSettings: (canvasSettings) => set({ canvasSettings }),
        }),
        {
            name: 'colorwizard-canvas',
            storage: canvasPersistStorage,
            // v1: value steps are spaced perceptually rather than by luminance, so a stored
            // band index points at a different tonal range than it did when it was saved.
            // The old index cannot be mapped faithfully (thresholds were image-dependent),
            // so reset the painting target to the middle band.
            version: 1,
            migrate: (persisted, fromVersion) => {
                const state = persisted as Partial<CanvasState> | undefined
                if (!state || fromVersion >= 1) return state
                const steps = state.valueScaleSettings?.steps ?? DEFAULT_VALUE_SCALE_SETTINGS.steps
                return { ...state, activeValueBandIndex: defaultActiveValueBandIndex(steps) }
            },
            partialize: (state) => ({
                surfaceImage: state.surfaceImage,
                surfaceBounds: state.surfaceBounds,
                referenceImage: state.referenceImage,
                referenceOpacity: state.referenceOpacity,
                referenceLocked: state.referenceLocked,
                referenceTransform: state.referenceTransform,
                valueScaleSettings: state.valueScaleSettings,
                activeValueBandIndex: state.activeValueBandIndex,
                canvasSettings: state.canvasSettings,
            }),
        }
    )
)
