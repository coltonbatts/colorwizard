import { describe, it, expect } from 'vitest'
import { emptyLibrary } from '@/lib/colorLibrary'
import type { ThreadSavePayload } from './ThreadStudio'
import {
  buildThreadMapPullLibrary,
  findUpdatedSavedColor,
  saveThreadsIntoLibrary,
} from './useSimpleLibrary'

const sampleThreads: ThreadSavePayload[] = [
  {
    number: '310',
    name: 'Black',
    hex: '#000000',
    deltaE00: 0,
    colorConfidence: 'measured',
  },
  {
    number: '3823',
    name: 'Ultra Pale Yellow',
    hex: '#dac49f',
    deltaE00: 1.2,
    colorConfidence: 'measured',
  },
]

function makeIdGenerator() {
  let next = 1
  return () => `id-${next++}`
}

describe('useSimpleLibrary helpers', () => {
  it('saves a batch of threads with uppercase hexes and optional collection membership', () => {
    const base = {
      ...emptyLibrary(),
      collections: [{ id: 'col-1', name: 'Sky', createdAt: 100 }],
    }
    const { library, count } = saveThreadsIntoLibrary(base, sampleThreads, {
      now: 500,
      createId: makeIdGenerator(),
      collectionId: 'col-1',
      pictureName: 'Study.png',
    })

    expect(count).toBe(2)
    expect(library.colors).toHaveLength(2)
    expect(library.colors.map((c) => c.hex)).toEqual(['#000000', '#DAC49F'])
    expect(library.colors.every((c) => c.collectionIds.includes('col-1'))).toBe(true)
    expect(library.colors.every((c) => c.source?.pictureName === 'Study.png')).toBe(true)
  })

  it('builds a thread map pull collection and attaches every thread', () => {
    const result = buildThreadMapPullLibrary(emptyLibrary(), sampleThreads, 'Umezawa Pull', {
      now: 1000,
      createId: makeIdGenerator(),
      pictureName: 'Hokusai',
    })

    expect(result).not.toBeNull()
    expect(result!.collectionName).toBe('Umezawa Pull')
    expect(result!.collectionId).toBeTruthy()
    expect(result!.library.collections).toHaveLength(1)
    expect(result!.library.colors).toHaveLength(2)
    expect(
      result!.library.colors.every((c) => c.collectionIds.includes(result!.collectionId!)),
    ).toBe(true)
  })

  it('returns null when asked to build a pull from an empty thread list', () => {
    const result = buildThreadMapPullLibrary(emptyLibrary(), [], 'Empty Pull', {
      now: 1000,
      createId: makeIdGenerator(),
    })
    expect(result).toBeNull()
  })

  it('falls back to "All" when a duplicate collection name prevents creating a new pull', () => {
    const existing = {
      ...emptyLibrary(),
      collections: [{ id: 'existing', name: 'Umezawa Pull', createdAt: 100 }],
    }
    const result = buildThreadMapPullLibrary(existing, sampleThreads, 'Umezawa Pull', {
      now: 2000,
      createId: makeIdGenerator(),
    })

    expect(result).not.toBeNull()
    expect(result!.collectionId).toBeNull()
    expect(result!.collectionName).toBe('All')
    expect(result!.library.colors).toHaveLength(2)
  })

  it('finds the refreshed saved color by id or clears it when removed', () => {
    const { library } = saveThreadsIntoLibrary(emptyLibrary(), sampleThreads, {
      now: 500,
      createId: makeIdGenerator(),
    })
    const target = library.colors[0]
    const updatedLibrary = {
      ...library,
      colors: library.colors.map((c) => (c.id === target.id ? { ...c, note: 'Warm' } : c)),
    }

    expect(findUpdatedSavedColor(target, updatedLibrary)?.note).toBe('Warm')
    expect(findUpdatedSavedColor(target, emptyLibrary())).toBeNull()
    expect(findUpdatedSavedColor(null, updatedLibrary)).toBeNull()
  })
})
