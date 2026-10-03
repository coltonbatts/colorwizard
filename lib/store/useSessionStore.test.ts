import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from './useSessionStore'
import type { PinnedColor } from '../types/pinnedColor'

const sample: PinnedColor = {
  id: 'saved-one', hex: '#397DA8', rgb: { r: 57, g: 125, b: 168 }, hsl: { h: 203, s: 49, l: 44 },
  label: 'Blue', timestamp: 123, spectralRecipe: null,
  fallbackRecipe: { description: 'Traditional guide', colors: [{ name: 'Phthalo Blue', amount: 'mostly' }], steps: ['Adjust by eye.'] },
  dmcMatches: [],
}

afterEach(() => { vi.unstubAllGlobals(); useSessionStore.setState({ pinnedColors: [] }) })

describe('explicit workbench Save', () => {
  it('persists a recoverable snapshot before acknowledging a web save', () => {
    const setItem = vi.fn()
    vi.stubGlobal('window', { localStorage: { setItem } })
    useSessionStore.getState().pinColor(sample)
    const [key, raw] = setItem.mock.calls[0]
    expect(key).toBe('colorwizard-session')
    expect(JSON.parse(raw).state.pinnedColors).toEqual([sample])
    expect(useSessionStore.getState().pinnedColors).toEqual([sample])
  })
  it('leaves the previous samples intact when persistence fails, allowing retry', () => {
    vi.stubGlobal('window', { localStorage: { setItem: () => { throw new Error('blocked') } } })
    expect(() => useSessionStore.getState().pinColor(sample)).toThrow('blocked')
    expect(useSessionStore.getState().pinnedColors).toEqual([])
  })
})
