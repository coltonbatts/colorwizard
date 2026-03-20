'use client'

import { useCanvasStore } from './useCanvasStore'
import { useCalibrationStore } from './useCalibrationStore'
import { useDebugStore } from './useDebugStore'
import { useLayoutStore } from './useLayoutStore'
import { usePaletteStore } from './usePaletteStore'
import { useSessionStore } from './useSessionStore'

type LegacyStoreState = ReturnType<typeof getMergedStoreState>
type StoreSelector<T> = (state: LegacyStoreState) => T
type LegacyStoreHook = {
    <T = LegacyStoreState>(selector?: StoreSelector<T>): T
    getState: () => LegacyStoreState
}

const getMergedStoreState = () => ({
    ...useCanvasStore.getState(),
    ...useCalibrationStore.getState(),
    ...useDebugStore.getState(),
    ...useLayoutStore.getState(),
    ...usePaletteStore.getState(),
    ...useSessionStore.getState(),
})

const useStoreImpl = <T = LegacyStoreState>(selector?: StoreSelector<T>): T => {
    const canvasState = useCanvasStore()
    const calibrationState = useCalibrationStore()
    const debugState = useDebugStore()
    const layoutState = useLayoutStore()
    const paletteState = usePaletteStore()
    const sessionState = useSessionStore()

    const mergedState = {
        ...canvasState,
        ...calibrationState,
        ...debugState,
        ...layoutState,
        ...paletteState,
        ...sessionState,
    } as LegacyStoreState

    return (selector ? selector(mergedState) : mergedState) as T
}

export const useStore = Object.assign(useStoreImpl, {
    getState: getMergedStoreState,
}) as LegacyStoreHook
