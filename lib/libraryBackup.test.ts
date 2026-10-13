import { describe, expect, it } from 'vitest'
import { backupFileName, buildBackup, describeMerge, MAX_BACKUP_BYTES, mergeLibraries, nothingToImport, parseBackup } from './libraryBackup'
import { createCollection, emptyLibrary, MAX_COLLECTIONS, parseLibrary, saveColor, setMembership, setNote, type ColorLibrary } from './colorLibrary'
import type { SpectralRecipe } from './spectral/types'

const recipe = (hex: string): SpectralRecipe => ({
  ingredients: [{ pigment: { id: 'p', name: 'Pigment', hex, tintingStrength: 1 }, weight: 1, percentage: '100%', parts: 1 }],
  totalParts: 1, paintable: true, predictedHex: hex, error: 0, error00: 0, matchQuality: 'Excellent', steps: ['Start.'],
})
const thread = { number: '921', name: 'Copper', hex: '#C45C3E', deltaE00: 1.4, colorConfidence: 'measured' as const }

function library(spec: { hex: string; id: string; at: number; note?: string; inCollections?: string[] }[], collections: [string, string][] = []): ColorLibrary {
  let lib = emptyLibrary()
  collections.forEach(([id, name], i) => { lib = createCollection(lib, { id, name, now: i }).library })
  for (const c of spec) {
    lib = saveColor(lib, { id: c.id, hex: c.hex, name: c.hex, now: c.at, paint: { paletteName: 'Core six', recipe: recipe(c.hex) }, thread }).library
    if (c.note) lib = setNote(lib, c.id, c.note, c.at)
    for (const k of c.inCollections ?? []) lib = setMembership(lib, c.id, k, true, c.at)
  }
  return lib
}
let n = 0
const makeId = () => `new-${++n}`

describe('backup file', () => {
  const lib = library([{ hex: '#C45C3E', id: 'a', at: 5, note: 'roof', inCollections: ['k1'] }], [['k1', 'Roof']])

  it('round-trips every color, recipe, thread, note and collection', () => {
    const parsed = parseBackup(buildBackup(lib, Date.UTC(2026, 9, 13)))
    expect(parsed).toEqual({ ok: true, library: lib, exportedAt: '2026-10-13T00:00:00.000Z' })
  })

  it('names the file by local date', () => {
    expect(backupFileName(new Date(2026, 9, 3, 12).getTime())).toBe('colorwizard-colors-2026-10-03.json')
  })

  it.each([
    ['not json', '{nope', 'not-json'],
    ['an empty file', '', 'not-json'],
    ['json that is not ours', JSON.stringify({ colors: [] }), 'not-colorwizard'],
    ['a list', '[]', 'not-colorwizard'],
    ['null', 'null', 'not-colorwizard'],
    ['a raw library without the wrapper', JSON.stringify(emptyLibrary()), 'not-colorwizard'],
    ['a newer format', JSON.stringify({ format: 'colorwizard-library', formatVersion: 2, library: emptyLibrary() }), 'newer-version'],
    ['no format version', JSON.stringify({ format: 'colorwizard-library', library: emptyLibrary() }), 'damaged'],
    ['format version 0', JSON.stringify({ format: 'colorwizard-library', formatVersion: 0, library: emptyLibrary() }), 'damaged'],
    ['a missing library', JSON.stringify({ format: 'colorwizard-library', formatVersion: 1 }), 'damaged'],
    ['a damaged library', JSON.stringify({ format: 'colorwizard-library', formatVersion: 1, library: { version: 2, colors: [{ id: 'x', hex: 'red' }] } }), 'damaged'],
    ['a color in an unknown collection', JSON.stringify({ format: 'colorwizard-library', formatVersion: 1, library: { ...lib, collections: [] } }), 'damaged'],
  ])('refuses %s whole', (_name, text, problem) => {
    expect(parseBackup(text)).toEqual({ ok: false, problem })
  })

  it('refuses a file that is too large before parsing it', () => {
    expect(parseBackup('x'.repeat(MAX_BACKUP_BYTES + 1))).toEqual({ ok: false, problem: 'too-large' })
  })
})

describe('mergeLibraries', () => {
  it('restores into an empty library exactly, collections included', () => {
    const file = library([{ hex: '#C45C3E', id: 'a', at: 5, note: 'roof', inCollections: ['k1'] }, { hex: '#397DA8', id: 'b', at: 6 }], [['k1', 'Roof']])
    const { library: merged, report } = mergeLibraries(emptyLibrary(), file, makeId)
    expect(merged).toEqual(file)
    expect(report).toEqual({ added: 2, updated: 0, kept: 0, collectionsAdded: 1, collectionsSkipped: 0 })
  })

  it('imports the same file twice with no change', () => {
    const file = library([{ hex: '#C45C3E', id: 'a', at: 5, inCollections: ['k1'] }], [['k1', 'Roof']])
    const once = mergeLibraries(emptyLibrary(), file, makeId).library
    const twice = mergeLibraries(once, file, makeId)
    expect(twice.library).toEqual(once)
    expect(nothingToImport(twice.report)).toBe(true)
    expect(twice.report.kept).toBe(1)
  })

  it('adds what is new and never removes what is only here', () => {
    const here = library([{ hex: '#111111', id: 'h', at: 1 }])
    const file = library([{ hex: '#222222', id: 'f', at: 2 }])
    const { library: merged, report } = mergeLibraries(here, file, makeId)
    expect(merged.colors.map(c => c.hex)).toEqual(['#111111', '#222222'])
    expect(report).toMatchObject({ added: 1, updated: 0, kept: 0 })
  })

  it('lets the newer version of a color win whole, keeping your id and the union of collections', () => {
    const here = library([{ hex: '#C45C3E', id: 'mine', at: 5, note: 'old note', inCollections: ['k1'] }], [['k1', 'Roof']])
    const file = library([{ hex: '#C45C3E', id: 'theirs', at: 9, note: 'new note', inCollections: ['k9'] }], [['k9', 'Walls']])
    const { library: merged, report } = mergeLibraries(here, file, makeId)
    expect(report).toMatchObject({ added: 0, updated: 1, kept: 0, collectionsAdded: 1 })
    expect(merged.colors).toHaveLength(1)
    expect(merged.colors[0]).toMatchObject({ id: 'mine', note: 'new note', updatedAt: 9 })
    const names = merged.colors[0].collectionIds.map(id => merged.collections.find(c => c.id === id)!.name).sort()
    expect(names).toEqual(['Roof', 'Walls'])
  })

  it('keeps your version when it is newer, or equally recent', () => {
    const here = library([{ hex: '#C45C3E', id: 'mine', at: 9, note: 'mine' }, { hex: '#397DA8', id: 'tie', at: 4, note: 'mine too' }])
    const file = library([{ hex: '#C45C3E', id: 'theirs', at: 5, note: 'theirs' }, { hex: '#397DA8', id: 'tie2', at: 4, note: 'theirs too' }])
    const { library: merged, report } = mergeLibraries(here, file, makeId)
    expect(merged).toEqual(here)
    expect(report).toMatchObject({ added: 0, updated: 0, kept: 2 })
  })

  it('matches collections by name ignoring case, and does not duplicate them', () => {
    const here = library([{ hex: '#111111', id: 'h', at: 1 }], [['k1', 'Roof']])
    const file = library([{ hex: '#222222', id: 'f', at: 2, inCollections: ['z'] }], [['z', 'ROOF']])
    const { library: merged, report } = mergeLibraries(here, file, makeId)
    expect(merged.collections.map(c => c.name)).toEqual(['Roof'])
    expect(merged.colors.find(c => c.hex === '#222222')!.collectionIds).toEqual(['k1'])
    expect(report.collectionsAdded).toBe(0)
  })

  it('gives an imported color a new id when its id is already used here for something else', () => {
    const here = library([{ hex: '#111111', id: 'same', at: 1 }])
    const file = library([{ hex: '#222222', id: 'same', at: 2 }])
    const { library: merged } = mergeLibraries(here, file, makeId)
    expect(new Set(merged.colors.map(c => c.id)).size).toBe(2)
    expect(merged.colors[0].id).toBe('same')
  })

  it('does the same for a collection id that is already taken', () => {
    const here = library([{ hex: '#111111', id: 'h', at: 1 }], [['k1', 'Roof']])
    const file = library([{ hex: '#222222', id: 'f', at: 2, inCollections: ['k1'] }], [['k1', 'Walls']])
    const { library: merged } = mergeLibraries(here, file, makeId)
    expect(merged.collections.map(c => c.name)).toEqual(['Roof', 'Walls'])
    expect(new Set(merged.collections.map(c => c.id)).size).toBe(2)
    const walls = merged.collections.find(c => c.name === 'Walls')!
    expect(merged.colors.find(c => c.hex === '#222222')!.collectionIds).toEqual([walls.id])
  })

  it('stops at the collection limit but still imports the colors', () => {
    let here = emptyLibrary()
    for (let i = 0; i < MAX_COLLECTIONS; i++) here = createCollection(here, { id: `k${i}`, name: `Group ${i}`, now: i }).library
    const file = library([{ hex: '#222222', id: 'f', at: 2, inCollections: ['x'] }], [['x', 'One too many']])
    const { library: merged, report } = mergeLibraries(here, file, makeId)
    expect(merged.collections).toHaveLength(MAX_COLLECTIONS)
    expect(report).toMatchObject({ added: 1, collectionsAdded: 0, collectionsSkipped: 1 })
    expect(merged.colors[0].collectionIds).toEqual([])
  })

  it('always produces a library the app can read back, and never changes its inputs', () => {
    const here = library([{ hex: '#C45C3E', id: 'a', at: 5, inCollections: ['k1'] }, { hex: '#111111', id: 'h', at: 1 }], [['k1', 'Roof']])
    const file = library([{ hex: '#C45C3E', id: 'b', at: 9, inCollections: ['k2'] }, { hex: '#222222', id: 'c', at: 3 }], [['k2', 'Walls'], ['k3', 'Roof']])
    const hereBefore = JSON.stringify(here)
    const fileBefore = JSON.stringify(file)
    const { library: merged } = mergeLibraries(here, file, makeId)
    expect(parseLibrary(JSON.stringify(merged))).toEqual(merged)
    expect(JSON.stringify(here)).toBe(hereBefore)
    expect(JSON.stringify(file)).toBe(fileBefore)
  })
})

describe('describeMerge', () => {
  const file = { colors: 3, collections: 1 }
  it('says what will be added, replaced and left alone, and that nothing is deleted', () => {
    const text = describeMerge({ added: 2, updated: 1, kept: 1, collectionsAdded: 1, collectionsSkipped: 0 }, file)
    expect(text).toBe('This file has 3 colors and 1 collection. Importing will add 2 new colors, replace 1 color with the file’s newer version and add 1 collection. 1 color you already have stays as it is. Nothing is deleted.')
  })
  it('uses singular and plural forms', () => {
    expect(describeMerge({ added: 1, updated: 0, kept: 2, collectionsAdded: 0, collectionsSkipped: 0 }, { colors: 3, collections: 0 }))
      .toBe('This file has 3 colors and 0 collections. Importing will add 1 new color. 2 colors you already have stay as they are. Nothing is deleted.')
  })
  it('explains skipped collections', () => {
    expect(describeMerge({ added: 1, updated: 0, kept: 0, collectionsAdded: 0, collectionsSkipped: 2 }, file)).toContain('2 collections can’t be added')
  })
})
