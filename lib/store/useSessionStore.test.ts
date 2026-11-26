import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from './useSessionStore'
import type { PinnedColor } from '../types/pinnedColor'

const sample: PinnedColor = {
  id: 'saved-one', hex: '#397DA8', rgb: { r: 57, g: 125, b: 168 }, hsl: { h: 203, s: 49, l: 44 },
  label: 'Blue', timestamp: 123, spectralRecipe: null,
  fallbackRecipe: { description: 'Traditional guide', colors: [{ name: 'Phthalo Blue', amount: 'mostly' }], steps: ['Adjust by eye.'] },
  dmcMatches: [],
}

const sampleTwo: PinnedColor = {
  ...sample,
  id: 'saved-two',
  hex: '#C45A3B',
  rgb: { r: 196, g: 90, b: 59 },
  hsl: { h: 14, s: 55, l: 50 },
  label: 'Terracotta',
  timestamp: 456,
}

afterEach(() => {
  vi.unstubAllGlobals()
  useSessionStore.setState({ pinnedColors: [], valueModeEnabled: false })
})

describe('explicit workbench Save', () => {
  it('persists a recoverable snapshot before acknowledging a web save', () => {
    const setItem = vi.fn()
    vi.stubGlobal('window', { localStorage: { setItem } })
    useSessionStore.getState().pinColor(sample)
    expect(setItem).toHaveBeenCalledTimes(1)
    const [key, raw] = setItem.mock.calls[0]
    expect(key).toBe('colorwizard-session')
    expect(JSON.parse(raw).state.pinnedColors).toEqual([sample])
    expect(useSessionStore.getState().pinnedColors).toEqual([sample])
  })

  it('leaves the previous samples intact when persistence fails, allowing retry', () => {
    const setItem = vi.fn(() => { throw new Error('blocked') })
    vi.stubGlobal('window', { localStorage: { setItem } })
    expect(() => useSessionStore.getState().pinColor(sample)).toThrow('blocked')
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(useSessionStore.getState().pinnedColors).toEqual([])
  })

  it('preserves existing pinned colors when a subsequent save fails', () => {
    const setItem = vi.fn()
    vi.stubGlobal('window', { localStorage: { setItem } })
    useSessionStore.getState().pinColor(sample)
    expect(useSessionStore.getState().pinnedColors).toEqual([sample])

    setItem.mockImplementationOnce(() => { throw new Error('quota') })
    expect(() => useSessionStore.getState().pinColor(sampleTwo)).toThrow('quota')
    expect(useSessionStore.getState().pinnedColors).toEqual([sample])
  })

  it('keeps in-memory fallback for non-pin session preferences when storage throws', () => {
    vi.stubGlobal('window', { localStorage: { setItem: () => { throw new Error('blocked') } } })
    expect(() => useSessionStore.getState().setValueModeEnabled(true)).not.toThrow()
    expect(useSessionStore.getState().valueModeEnabled).toBe(true)
  })

  it('does not throw on desktop runtime when localStorage is unavailable', () => {
    vi.stubGlobal('isTauri', true)
    vi.stubGlobal('window', {
      localStorage: { setItem: () => { throw new Error('blocked') } },
    })
    expect(() => useSessionStore.getState().pinColor(sample)).not.toThrow()
    expect(useSessionStore.getState().pinnedColors).toEqual([sample])
  })
})
