import { describe, it, expect, beforeEach } from 'vitest'
import { useStitchStore } from './useStitchStore'

describe('useStitchStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useStitchStore.getState().resetStitchSettings()
  })

  it('should initialize with default settings', () => {
    const state = useStitchStore.getState()
    expect(state.fidelity).toBe(50)
    expect(state.maxColors).toBe(12)
    expect(state.symbolsEnabled).toBe(true)
    expect(state.gridlinesEnabled).toBe(true)
    expect(state.stitchOpacity).toBe(1.0)
    expect(state.highlightedDmcCode).toBeNull()
  })

  it('should update fidelity within clamping limits (16-120)', () => {
    const store = useStitchStore.getState()
    
    store.setFidelity(80)
    expect(useStitchStore.getState().fidelity).toBe(80)

    store.setFidelity(10) // below min
    expect(useStitchStore.getState().fidelity).toBe(16)

    store.setFidelity(150) // above max
    expect(useStitchStore.getState().fidelity).toBe(120)
  })

  it('should update maxColors within clamping limits (2-40)', () => {
    const store = useStitchStore.getState()

    store.setMaxColors(20)
    expect(useStitchStore.getState().maxColors).toBe(20)

    store.setMaxColors(1) // below min
    expect(useStitchStore.getState().maxColors).toBe(2)

    store.setMaxColors(50) // above max
    expect(useStitchStore.getState().maxColors).toBe(40)
  })

  it('should update toggles and highlighted thread code', () => {
    const store = useStitchStore.getState()

    store.setSymbolsEnabled(false)
    expect(useStitchStore.getState().symbolsEnabled).toBe(false)

    store.setGridlinesEnabled(false)
    expect(useStitchStore.getState().gridlinesEnabled).toBe(false)

    store.setHighlightedDmcCode('310')
    expect(useStitchStore.getState().highlightedDmcCode).toBe('310')
  })

  it('should update stitchOpacity within clamping limits (0.1-1.0)', () => {
    const store = useStitchStore.getState()

    store.setStitchOpacity(0.5)
    expect(useStitchStore.getState().stitchOpacity).toBe(0.5)

    store.setStitchOpacity(0.0) // below min
    expect(useStitchStore.getState().stitchOpacity).toBe(0.1)

    store.setStitchOpacity(1.5) // above max
    expect(useStitchStore.getState().stitchOpacity).toBe(1.0)
  })
})
