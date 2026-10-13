import { describe, expect, it, vi } from 'vitest'
import {
  collectionNameProblem, colorsIn, createCollection, deleteCollection, emptyLibrary, setMembership, MAX_COLLECTIONS, findByHex, LIBRARY_KEY, loadLibrary, migrateV1, parseLibrary, removeColor, saveColor, setNote, storeLibrary,
  type ColorLibrary,
} from './colorLibrary'
import { SIMPLE_SAVED_KEY, type SavedPaintColor } from './simpleSavedColors'
import type { SpectralRecipe } from './spectral/types'

const recipe = (hex = '#397DA8'): SpectralRecipe => ({
  ingredients: [{ pigment: { id: 'my-blue', name: 'My blue', hex, tintingStrength: 2 }, weight: 1, percentage: '100%', parts: 1 }],
  totalParts: 1, paintable: true, predictedHex: hex, error: 0, error00: 0, matchQuality: 'Excellent', steps: ['Start with My blue.'],
})
const thread = { number: '921', name: 'Copper', hex: '#C45C3E', deltaE00: 1.4, colorConfidence: 'measured' as const }
const v1: SavedPaintColor = { id: 'a', hex: '#397DA8', name: 'Blue', savedAt: 100, pictureName: 'ref.png', paletteName: 'My paints', recipe: recipe() }

const storageOf = (items: Record<string, string>) => ({ getItem: (key: string) => items[key] ?? null })

describe('saveColor', () => {
  it('keeps a color with the paint and thread shown when it was saved', () => {
    const { library, color, updated } = saveColor(emptyLibrary(), {
      id: 'n1', hex: '#c45c3e', name: 'Tartare', pictureName: 'wall.png', now: 5,
      paint: { paletteName: 'Core six', recipe: recipe('#C45C3E') }, thread,
    })
    expect(updated).toBe(false)
    expect(library.colors).toEqual([color])
    expect(color).toMatchObject({ id: 'n1', hex: '#C45C3E', nameSnapshot: 'Tartare', createdAt: 5, updatedAt: 5, collectionIds: [], source: { pictureName: 'wall.png' } })
    expect(color.attachments.paint).toMatchObject({ kind: 'spectral', paletteName: 'Core six', savedAt: 5 })
    expect(color.attachments.thread).toMatchObject({ brand: 'dmc', number: '921', savedAt: 5 })
  })

  it('saves a color alone when no recipe or thread was found', () => {
    const { color } = saveColor(emptyLibrary(), { id: 'n1', hex: '#123456', name: '', now: 1 })
    expect(color.attachments).toEqual({})
  })

  it('updates the existing reference instead of adding a twin, keeping its note, id and first save date', () => {
    const first = saveColor(emptyLibrary(), { id: 'n1', hex: '#C45C3E', name: 'Tartare', now: 1, thread })
    const noted = setNote(first.library, 'n1', ' keep for the roof ', 2)
    const again = saveColor(noted, { id: 'n2', hex: '#c45c3e', name: 'Tartare', now: 9, paint: { paletteName: 'Core six', recipe: recipe('#C45C3E') } })
    expect(again.updated).toBe(true)
    expect(again.library.colors).toHaveLength(1)
    expect(again.color).toMatchObject({ id: 'n1', note: 'keep for the roof', createdAt: 1, updatedAt: 9 })
    expect(again.color.attachments.thread?.savedAt).toBe(1) // not offered this time, so kept as it was
    expect(again.color.attachments.paint?.savedAt).toBe(9)
  })

  it('does not mutate the library it was given', () => {
    const library = emptyLibrary()
    saveColor(library, { id: 'n1', hex: '#C45C3E', name: '', now: 1 })
    expect(library.colors).toEqual([])
  })
})

describe('notes and removal', () => {
  it('sets, trims, caps and clears a note', () => {
    let lib: ColorLibrary = saveColor(emptyLibrary(), { id: 'n1', hex: '#C45C3E', name: '', now: 1 }).library
    lib = setNote(lib, 'n1', 'x'.repeat(2000), 2)
    expect(lib.colors[0].note).toHaveLength(1000)
    lib = setNote(lib, 'n1', '   ', 3)
    expect(lib.colors[0]).not.toHaveProperty('note')
    expect(lib.colors[0].updatedAt).toBe(3)
  })

  it('leaves other colors alone and removes by id', () => {
    let lib = saveColor(emptyLibrary(), { id: 'n1', hex: '#C45C3E', name: '', now: 1 }).library
    lib = saveColor(lib, { id: 'n2', hex: '#397DA8', name: '', now: 2 }).library
    const noted = setNote(lib, 'n2', 'hi', 3)
    expect(noted.colors[0]).toEqual(lib.colors[0])
    expect(removeColor(noted, 'n1').colors.map(c => c.id)).toEqual(['n2'])
  })
})

describe('storage', () => {
  it('round-trips exactly, including recipe amounts and the thread match', () => {
    const { library } = saveColor(emptyLibrary(), { id: 'n1', hex: '#C45C3E', name: 'Tartare', now: 1, paint: { paletteName: 'Core six', recipe: recipe('#C45C3E') }, thread })
    const setItem = vi.fn()
    storeLibrary({ setItem }, library)
    expect(setItem.mock.calls[0][0]).toBe(LIBRARY_KEY)
    expect(parseLibrary(setItem.mock.calls[0][1])).toEqual(library)
  })

  it('does not swallow quota or blocked-storage failures', () => {
    expect(() => storeLibrary({ setItem: () => { throw new Error('quota exceeded') } }, emptyLibrary())).toThrow('quota exceeded')
  })

  it('normalizes hex case on read', () => {
    const { library } = saveColor(emptyLibrary(), { id: 'n1', hex: '#C45C3E', name: '', now: 1 })
    const lower = JSON.stringify({ ...library, colors: [{ ...library.colors[0], hex: '#c45c3e' }] })
    expect(parseLibrary(lower).colors[0].hex).toBe('#C45C3E')
  })

  const good = saveColor(emptyLibrary(), { id: 'n1', hex: '#C45C3E', name: '', now: 1, paint: { paletteName: 'Core six', recipe: recipe('#C45C3E') }, thread }).library
  const colorOf = () => structuredClone(good.colors[0]) as unknown as Record<string, unknown>
  it.each([
    ['broken json', '{broken'],
    ['wrong version', JSON.stringify({ version: 1, colors: [] })],
    ['bad hex', JSON.stringify({ version: 2, colors: [{ ...colorOf(), hex: 'red' }] })],
    ['duplicate id', JSON.stringify({ version: 2, colors: [colorOf(), { ...colorOf(), hex: '#112233' }] })],
    ['duplicate hex', JSON.stringify({ version: 2, colors: [colorOf(), { ...colorOf(), id: 'other', hex: '#c45c3e' }] })],
    ['oversized note', JSON.stringify({ version: 2, colors: [{ ...colorOf(), note: 'x'.repeat(1001) }] })],
    ['empty recipe', JSON.stringify({ version: 2, colors: [{ ...colorOf(), attachments: { paint: { ...good.colors[0].attachments.paint, recipe: { ...recipe(), ingredients: [] } } } }] })],
    ['fallback recipe', JSON.stringify({ version: 2, colors: [{ ...colorOf(), attachments: { paint: { ...good.colors[0].attachments.paint, recipe: { ...recipe(), isFallback: true } } } }] })],
    ['non-spectral kind', JSON.stringify({ version: 2, colors: [{ ...colorOf(), attachments: { paint: { ...good.colors[0].attachments.paint, kind: 'qualitative' } } }] })],
    ['bad thread', JSON.stringify({ version: 2, colors: [{ ...colorOf(), attachments: { thread: { ...thread, brand: 'dmc', savedAt: 1, deltaE00: -1 } } }] })],
    ['missing attachments', JSON.stringify({ version: 2, colors: [{ ...colorOf(), attachments: undefined }] })],
  ])('rejects %s so callers can preserve the data instead of overwriting it', (_name, raw) => {
    expect(() => parseLibrary(raw)).toThrow()
  })
})

describe('v1 migration', () => {
  it('carries a v1 save over with its recipe, source and date', () => {
    const lib = migrateV1([v1])
    expect(lib.colors).toEqual([{
      id: 'a', hex: '#397DA8', nameSnapshot: 'Blue', collectionIds: [], createdAt: 100, updatedAt: 100,
      source: { pictureName: 'ref.png' },
      attachments: { paint: { kind: 'spectral', paletteName: 'My paints', recipe: recipe(), savedAt: 100 } },
    }])
  })

  it('keeps legacy hex-only saves as colors without inventing a recipe', () => {
    const lib = loadLibrary(storageOf({ [SIMPLE_SAVED_KEY]: '["#aabbcc"]' }))
    expect(lib.colors).toHaveLength(1)
    expect(lib.colors[0]).toMatchObject({ hex: '#AABBCC', attachments: {} })
  })

  it('merges v1 twins of one color into the newest', () => {
    const lib = migrateV1([v1, { ...v1, id: 'b', savedAt: 200, name: 'Newer' }, { ...v1, id: 'c', savedAt: 50, name: 'Older' }])
    expect(lib.colors.map(c => [c.id, c.nameSnapshot])).toEqual([['b', 'Newer']])
  })

  it('prefers v2 when both exist, and reads v1 only when v2 is absent', () => {
    const v2 = saveColor(emptyLibrary(), { id: 'n1', hex: '#C45C3E', name: '', now: 1 }).library
    const both = storageOf({ [LIBRARY_KEY]: JSON.stringify(v2), [SIMPLE_SAVED_KEY]: JSON.stringify({ version: 1, colors: [v1] }) })
    expect(loadLibrary(both).colors.map(c => c.hex)).toEqual(['#C45C3E'])
    expect(loadLibrary(storageOf({ [SIMPLE_SAVED_KEY]: JSON.stringify({ version: 1, colors: [v1] }) })).colors.map(c => c.hex)).toEqual(['#397DA8'])
    expect(loadLibrary(storageOf({})).colors).toEqual([])
  })

  it('never writes while loading, so v1 stays exactly as it was', () => {
    const items: Record<string, string> = { [SIMPLE_SAVED_KEY]: JSON.stringify({ version: 1, colors: [v1] }) }
    const setItem = vi.fn()
    const removeItem = vi.fn()
    loadLibrary({ getItem: (key: string) => items[key] ?? null, setItem, removeItem } as unknown as Storage)
    expect(setItem).not.toHaveBeenCalled()
    expect(removeItem).not.toHaveBeenCalled()
  })

  it('throws on unreadable data of either version so nothing is overwritten', () => {
    expect(() => loadLibrary(storageOf({ [SIMPLE_SAVED_KEY]: '{damaged' }))).toThrow()
    expect(() => loadLibrary(storageOf({ [LIBRARY_KEY]: '{damaged' }))).toThrow()
  })

  it('finds a saved color by hex in any case', () => {
    const lib = migrateV1([v1])
    expect(findByHex(lib, '#397da8')?.id).toBe('a')
    expect(findByHex(lib, '#000000')).toBeUndefined()
  })
})


describe('collections', () => {
  const two = () => {
    let lib = saveColor(emptyLibrary(), { id: 'c1', hex: '#C45C3E', name: '', now: 1 }).library
    lib = saveColor(lib, { id: 'c2', hex: '#397DA8', name: '', now: 2 }).library
    return createCollection(lib, { id: 'k1', name: '  Roof   tiles ', now: 3 })
  }

  it('creates a collection with a cleaned name', () => {
    const { library, collection } = two()
    expect(collection).toEqual({ id: 'k1', name: 'Roof tiles', createdAt: 3 })
    expect(library.collections).toEqual([collection])
  })

  it('explains a name that cannot be used, and does not create it', () => {
    const { library } = two()
    expect(collectionNameProblem(library, '   ')).toMatch(/name/)
    expect(collectionNameProblem(library, 'x'.repeat(41))).toMatch(/40/)
    expect(collectionNameProblem(library, 'ROOF TILES')).toMatch(/already/)
    expect(collectionNameProblem(library, 'Walls')).toBeNull()
    const again = createCollection(library, { id: 'k2', name: 'roof tiles', now: 4 })
    expect(again.collection).toBeNull()
    expect(again.library).toBe(library)
  })

  it('caps how many collections there can be', () => {
    let lib = emptyLibrary()
    for (let i = 0; i < MAX_COLLECTIONS; i++) lib = createCollection(lib, { id: `k${i}`, name: `Group ${i}`, now: i }).library
    expect(collectionNameProblem(lib, 'One more')).toMatch(/up to 50/)
  })

  it('puts a color in and takes it out, without duplicating or touching other colors', () => {
    let { library } = two()
    library = setMembership(library, 'c1', 'k1', true, 10)
    library = setMembership(library, 'c1', 'k1', true, 11)
    expect(library.colors[0].collectionIds).toEqual(['k1'])
    expect(library.colors[0].updatedAt).toBe(10) // the second, identical call changed nothing
    expect(library.colors[1].collectionIds).toEqual([])
    expect(colorsIn(library, 'k1').map(c => c.id)).toEqual(['c1'])
    expect(colorsIn(library, null)).toHaveLength(2)
    library = setMembership(library, 'c1', 'k1', false, 12)
    expect(library.colors[0].collectionIds).toEqual([])
  })

  it('ignores a collection that does not exist', () => {
    const { library } = two()
    expect(setMembership(library, 'c1', 'nope', true, 5)).toBe(library)
  })

  it('deleting a collection keeps every color and clears only that grouping', () => {
    let { library } = two()
    library = createCollection(library, { id: 'k2', name: 'Walls', now: 4 }).library
    library = setMembership(setMembership(setMembership(library, 'c1', 'k1', true, 5), 'c1', 'k2', true, 5), 'c2', 'k1', true, 5)
    const after = deleteCollection(library, 'k1')
    expect(after.collections.map(c => c.id)).toEqual(['k2'])
    expect(after.colors.map(c => [c.id, c.collectionIds])).toEqual([['c1', ['k2']], ['c2', []]])
  })

  it('is kept by saving, noting and removing colors', () => {
    let { library } = two()
    library = setMembership(library, 'c1', 'k1', true, 5)
    library = setNote(library, 'c1', 'hi', 6)
    library = saveColor(library, { id: 'x', hex: '#C45C3E', name: '', now: 7 }).library
    expect(library.collections).toHaveLength(1)
    expect(library.colors[0].collectionIds).toEqual(['k1'])
    expect(removeColor(library, 'c2').collections).toHaveLength(1)
  })

  it('round-trips through storage', () => {
    let { library } = two()
    library = setMembership(library, 'c2', 'k1', true, 5)
    const setItem = vi.fn()
    storeLibrary({ setItem }, library)
    expect(parseLibrary(setItem.mock.calls[0][1])).toEqual(library)
  })

  it('reads a library saved before collections existed as having none', () => {
    const { library } = two()
    const old = JSON.stringify({ version: 2, colors: library.colors })
    expect(parseLibrary(old).collections).toEqual([])
  })

  it.each([
    ['unknown collection on a color', (l: ColorLibrary) => ({ ...l, collections: [], colors: [{ ...l.colors[0], collectionIds: ['ghost'] }] })],
    ['the same collection twice on a color', (l: ColorLibrary) => ({ ...l, colors: [{ ...l.colors[0], collectionIds: ['k1', 'k1'] }] })],
    ['duplicate collection id', (l: ColorLibrary) => ({ ...l, collections: [l.collections[0], { ...l.collections[0], name: 'Other' }] })],
    ['duplicate collection name', (l: ColorLibrary) => ({ ...l, collections: [l.collections[0], { ...l.collections[0], id: 'k9', name: 'roof tiles' }] })],
    ['empty collection name', (l: ColorLibrary) => ({ ...l, collections: [{ ...l.collections[0], name: ' ' }] })],
    ['collections that is not a list', (l: ColorLibrary) => ({ ...l, collections: {} })],
  ])('rejects %s so the data is kept, not overwritten', (_name, damage) => {
    const { library } = two()
    const withMember = setMembership(library, 'c1', 'k1', true, 5)
    expect(() => parseLibrary(JSON.stringify(damage(withMember)))).toThrow()
  })
})
