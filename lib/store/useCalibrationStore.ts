'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
    CalibrationData,
    TransformState,
    loadCalibration,
    saveCalibration as persistCalibration,
    clearCalibration as removeCalibration,
    isCalibrationStale
} from '../calibration'
import { MeasurementLayer, Point } from '../types/measurement'
import { safeStorage } from './storage'

const DEFAULT_TRANSFORM_STATE: TransformState = {
    zoomLevel: 1,
    panOffset: { x: 0, y: 0 }
}

interface CalibrationState {
    calibration: CalibrationData | null
    calibrationStale: boolean
    measureMode: boolean
    measurePointA: Point | null
    measurePointB: Point | null
    measurementLayer: MeasurementLayer
    rulerGridEnabled: boolean
    rulerGridSpacing: 0.25 | 0.5 | 1 | 2
    gridOpacity: number
    transformState: TransformState

    setCalibration: (data: CalibrationData | null) => void
    setCalibrationStale: (stale: boolean) => void
    saveCalibration: (data: CalibrationData) => void
    resetCalibration: () => void
    loadCalibrationFromStorage: () => void
    setMeasureMode: (enabled: boolean) => void
    setMeasurePoints: (a: Point | null, b: Point | null) => void
    setMeasurementLayer: (layer: MeasurementLayer) => void
    toggleMeasureMode: () => void
    clearMeasurePoints: () => void
    toggleMeasurementLayer: () => void
    setRulerGridEnabled: (enabled: boolean) => void
    setRulerGridSpacing: (spacing: 0.25 | 0.5 | 1 | 2) => void
    toggleRulerGrid: () => void
    setGridOpacity: (opacity: number) => void
    setTransformState: (state: TransformState) => void
}

export const useCalibrationStore = create<CalibrationState>()(
    persist(
        (set, get) => ({
            calibration: null,
            calibrationStale: false,
            measureMode: false,
            measurePointA: null,
            measurePointB: null,
            measurementLayer: 'reference',
            rulerGridEnabled: false,
            rulerGridSpacing: 1,
            gridOpacity: 0.3,
            transformState: DEFAULT_TRANSFORM_STATE,

            setCalibration: (calibration) => set({ calibration }),
            setCalibrationStale: (calibrationStale) => set({ calibrationStale }),

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
                    measurePointB: null,
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

            setMeasureMode: (measureMode) => set({ measureMode }),
            setMeasurePoints: (measurePointA, measurePointB) => set({ measurePointA, measurePointB }),
            setMeasurementLayer: (measurementLayer) => set({ measurementLayer }),
            toggleMeasureMode: () => {
                const state = get()
                if (state.calibration) {
                    if (!state.measureMode) {
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

            setRulerGridEnabled: (rulerGridEnabled) => set({ rulerGridEnabled }),
            setRulerGridSpacing: (rulerGridSpacing) => set({ rulerGridSpacing }),
            toggleRulerGrid: () => {
                const state = get()
                if (state.calibration) {
                    set({ rulerGridEnabled: !state.rulerGridEnabled })
                }
            },

            setGridOpacity: (gridOpacity) => set({ gridOpacity }),
            setTransformState: (transformState) => set({ transformState }),
        }),
        {
            name: 'colorwizard-calibration-ui',
            storage: safeStorage,
            partialize: (state) => ({
                rulerGridEnabled: state.rulerGridEnabled,
                rulerGridSpacing: state.rulerGridSpacing,
                gridOpacity: state.gridOpacity,
            }),
        }
    )
)

