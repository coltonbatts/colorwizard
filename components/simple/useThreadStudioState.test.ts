import { describe, it, expect } from 'vitest'
import { DEFAULT_THREAD_MAP_PREFS } from '@/lib/dmc/map/prefs'
import {
  PHONE_VIEW_KEY,
  applyFullSwapOverride,
  cycleThreadSlot,
  loadSection,
  prefsFromSnapshot,
  replaceLockedThreadList,
  revertFullSwapOverride,
  snapshotFromPrefs,
  storeSection,
  toggleLockedThreadList,
} from './useThreadStudioState'

describe('useThreadStudioState helpers', () => {
  it('round-trips thread map prefs through control snapshots with empty locks/swaps', () => {
    const snapshot = snapshotFromPrefs(DEFAULT_THREAD_MAP_PREFS)
    expect(snapshot.lockedNumbers).toEqual([])
    expect(snapshot.swapOverrides).toEqual({})
    expect(snapshot.monoSwaps).toEqual({})
    expect(snapshot.anchorBudget).toBe(DEFAULT_THREAD_MAP_PREFS.fullColorBudget)
    expect(prefsFromSnapshot(snapshot)).toEqual(DEFAULT_THREAD_MAP_PREFS)
  })

  it('applies and reverts case-insensitive full-color swap overrides', () => {
    const added = applyFullSwapOverride({}, 'B5200', '3865')
    expect(added).toEqual({ b5200: '3865' })

    // Swapping back to the base thread removes the override.
    const cleared = applyFullSwapOverride(added, 'b5200', 'B5200')
    expect(cleared).toEqual({})

    expect(revertFullSwapOverride(added, 'B5200')).toEqual({})
    expect(revertFullSwapOverride(added, '310')).toBeNull()
  })

  it('toggles and replaces locked thread numbers without creating duplicates', () => {
    const withOne = toggleLockedThreadList([], 'B5200')
    expect(withOne).toEqual(['B5200'])
    expect(toggleLockedThreadList(withOne, 'b5200')).toEqual([])

    const two = ['B5200', '310']
    expect(replaceLockedThreadList(two, 'b5200', '3865')).toEqual(['3865', '310'])
    // Replacing into a thread that is already locked deduplicates case-insensitively.
    expect(replaceLockedThreadList(two, 'b5200', '310')).toEqual(['310'])
    expect(replaceLockedThreadList(two, '999', '310')).toBeNull()
  })

  it('cycles isolated thread slot indices with wraparound', () => {
    expect(cycleThreadSlot(null, 5, 1)).toBe(0)
    expect(cycleThreadSlot(null, 5, -1)).toBe(4)
    expect(cycleThreadSlot(4, 5, 1)).toBe(0)
    expect(cycleThreadSlot(0, 5, -1)).toBe(4)
    expect(cycleThreadSlot(null, 0, 1)).toBeNull()
  })

  it('persists and loads phone/section preference gracefully when storage is blocked', () => {
    const map = new Map<string, string>()
    const storage = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value)
      },
    }

    expect(loadSection(storage)).toBe('color')
    storeSection('thread', storage)
    expect(map.get(PHONE_VIEW_KEY)).toBe('thread')
    expect(loadSection(storage)).toBe('thread')

    storeSection('color', storage)
    expect(map.get(PHONE_VIEW_KEY)).toBe('all')
    expect(loadSection(storage)).toBe('color')

    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(loadSection(broken)).toBe('color')
    expect(() => storeSection('thread', broken)).not.toThrow()
  })
})
