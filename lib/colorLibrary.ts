/**
 * The saved-color library (v2). A saved color is a durable reference: the color's identity is its hex,
 * and paint and thread results are attached snapshots of what was shown when it was saved.
 * Pure and React-free. v1 (`simpleSavedColors`) is read once and never modified.
 */
import { isRecipe, parseSavedColors, SIMPLE_SAVED_KEY, type SavedPaintColor } from './simpleSavedColors'
import type { ColorConfidence } from './dmc/types'
import type { SpectralRecipe } from './spectral/types'

export const LIBRARY_KEY = 'colorwizard-simple-library-v2'
export const MAX_NOTE_LENGTH = 1000
export const MAX_COLLECTION_NAME = 40
export const MAX_COLLECTIONS = 50

/** `kind` is explicit so a qualitative recipe can never be mistaken for a spectral one. */
export interface PaintAttachment {
  kind: 'spectral'
  paletteName: string
  recipe: SpectralRecipe
  savedAt: number
}

export interface ThreadAttachment {
  brand: 'dmc'
  number: string
  name: string
  hex: string
  deltaE00: number
  colorConfidence: ColorConfidence
  savedAt: number
}

export interface SavedColor {
  id: string
  hex: string
  /** The name shown when it was saved. Names come from a list and are a convenience. */
  nameSnapshot: string
  note?: string
  /** Collections this color is in. A color can be in any number, or none. */
  collectionIds: string[]
  createdAt: number
  updatedAt: number
  source?: { pictureName?: string }
  attachments: { paint?: PaintAttachment; thread?: ThreadAttachment }
}

/** A named group of saved colors. Membership lives on each color (`collectionIds`). */
export interface Collection {
  id: string
  name: string
  createdAt: number
}

export interface ColorLibrary {
  version: 2
  colors: SavedColor[]
  collections: Collection[]
}

export const emptyLibrary = (): ColorLibrary => ({ version: 2, colors: [], collections: [] })

const isHex = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)

function isThread(value: unknown): value is ThreadAttachment {
  return record(value) && value.brand === 'dmc' && typeof value.number === 'string' && typeof value.name === 'string' &&
    isHex(value.hex) && finite(value.deltaE00) && value.deltaE00 >= 0 &&
    (value.colorConfidence === 'measured' || value.colorConfidence === 'approximate') && finite(value.savedAt)
}

function isPaint(value: unknown): value is PaintAttachment {
  return record(value) && value.kind === 'spectral' && typeof value.paletteName === 'string' &&
    finite(value.savedAt) && isRecipe(value.recipe)
}

function validColor(entry: unknown): entry is SavedColor {
  if (!record(entry) || typeof entry.id !== 'string' || !isHex(entry.hex) || typeof entry.nameSnapshot !== 'string' ||
      !finite(entry.createdAt) || !finite(entry.updatedAt) ||
      (entry.note !== undefined && (typeof entry.note !== 'string' || entry.note.length > MAX_NOTE_LENGTH)) ||
      !Array.isArray(entry.collectionIds) || !entry.collectionIds.every(id => typeof id === 'string') ||
      (entry.source !== undefined && (!record(entry.source) || (entry.source.pictureName !== undefined && typeof entry.source.pictureName !== 'string'))) ||
      !record(entry.attachments)) return false
  const { paint, thread } = entry.attachments
  return (paint === undefined || isPaint(paint)) && (thread === undefined || isThread(thread))
}

const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ')

/** Why this name can't be used for a new collection, or null if it can. */
export function collectionNameProblem(library: ColorLibrary, name: string): string | null {
  const clean = cleanName(name)
  if (!clean) return 'Give the collection a name.'
  if (clean.length > MAX_COLLECTION_NAME) return `Use ${MAX_COLLECTION_NAME} characters or fewer.`
  if (library.collections.some(collection => collection.name.toLowerCase() === clean.toLowerCase())) return 'You already have a collection with that name.'
  if (library.collections.length >= MAX_COLLECTIONS) return `You can have up to ${MAX_COLLECTIONS} collections.`
  return null
}

function validCollection(entry: unknown): entry is Collection {
  return record(entry) && typeof entry.id === 'string' && typeof entry.name === 'string' &&
    entry.name === cleanName(entry.name) && entry.name.length > 0 && entry.name.length <= MAX_COLLECTION_NAME && finite(entry.createdAt)
}

/** Strict: unreadable data throws so the caller can keep it instead of overwriting it. A library saved before collections existed has none. */
export function parseLibrary(raw: string): ColorLibrary {
  const parsed: unknown = JSON.parse(raw)
  if (!record(parsed) || parsed.version !== 2 || !Array.isArray(parsed.colors) ||
      (parsed.collections !== undefined && !Array.isArray(parsed.collections))) throw new Error('Unrecognized color library')
  const collections = (parsed.collections ?? []).map((entry: unknown) => {
    if (!validCollection(entry)) throw new Error('Invalid collection')
    return entry
  })
  const collectionIds = new Set<string>()
  const collectionNames = new Set<string>()
  for (const collection of collections) {
    const name = collection.name.toLowerCase()
    if (collectionIds.has(collection.id) || collectionNames.has(name)) throw new Error('Duplicate collection')
    collectionIds.add(collection.id)
    collectionNames.add(name)
  }
  const ids = new Set<string>()
  const hexes = new Set<string>()
  const colors = parsed.colors.map(entry => {
    if (!validColor(entry)) throw new Error('Invalid saved color')
    const hex = entry.hex.toUpperCase()
    if (ids.has(entry.id) || hexes.has(hex)) throw new Error('Duplicate saved color')
    if (new Set(entry.collectionIds).size !== entry.collectionIds.length || !entry.collectionIds.every(id => collectionIds.has(id))) {
      throw new Error('Saved color is in an unknown collection')
    }
    ids.add(entry.id)
    hexes.add(hex)
    return { ...entry, hex }
  })
  return { version: 2, colors, collections }
}

/** v1 entries become v2 references. Several v1 saves of one hex merge into one, keeping the newest. */
export function migrateV1(entries: SavedPaintColor[]): ColorLibrary {
  const byHex = new Map<string, SavedPaintColor>()
  for (const entry of entries) {
    const current = byHex.get(entry.hex)
    if (!current || entry.savedAt >= current.savedAt) byHex.set(entry.hex, entry)
  }
  const colors = [...byHex.values()].sort((a, b) => a.savedAt - b.savedAt).map((entry): SavedColor => ({
    id: entry.id,
    hex: entry.hex,
    nameSnapshot: entry.name,
    collectionIds: [],
    createdAt: entry.savedAt,
    updatedAt: entry.savedAt,
    ...(entry.pictureName ? { source: { pictureName: entry.pictureName } } : {}),
    attachments: entry.recipe && entry.paletteName
      ? { paint: { kind: 'spectral', paletteName: entry.paletteName, recipe: entry.recipe, savedAt: entry.savedAt } }
      : {},
  }))
  return { version: 2, colors, collections: [] }
}

/** The v2 library if there is one; otherwise v1 migrated in memory (v1 is left as it is); otherwise empty. */
export function loadLibrary(storage: Pick<Storage, 'getItem'>): ColorLibrary {
  const v2 = storage.getItem(LIBRARY_KEY)
  if (v2 !== null) return parseLibrary(v2)
  return migrateV1(parseSavedColors(storage.getItem(SIMPLE_SAVED_KEY)))
}

/** Write before acknowledging success. Quota and privacy errors must reach the caller. */
export function storeLibrary(storage: Pick<Storage, 'setItem'>, library: ColorLibrary): void {
  storage.setItem(LIBRARY_KEY, JSON.stringify(library))
}

export const findByHex = (library: ColorLibrary, hex: string) =>
  library.colors.find(color => color.hex === hex.toUpperCase())

export interface SaveInput {
  id: string
  hex: string
  name: string
  pictureName?: string
  paint?: { paletteName: string; recipe: SpectralRecipe }
  thread?: Omit<ThreadAttachment, 'brand' | 'savedAt'>
  now: number
}

/**
 * Saving a color that is already saved updates it: new results replace the attached ones,
 * the note and the first save date stay. Results not offered this time are kept.
 */
export function saveColor(library: ColorLibrary, input: SaveInput): { library: ColorLibrary; color: SavedColor; updated: boolean } {
  const hex = input.hex.toUpperCase()
  const existing = findByHex(library, hex)
  const attachments: SavedColor['attachments'] = { ...existing?.attachments }
  if (input.paint) attachments.paint = { kind: 'spectral', ...input.paint, savedAt: input.now }
  if (input.thread) attachments.thread = { brand: 'dmc', ...input.thread, savedAt: input.now }
  const pictureName = input.pictureName ?? existing?.source?.pictureName
  const color: SavedColor = {
    id: existing?.id ?? input.id,
    hex,
    nameSnapshot: input.name || existing?.nameSnapshot || '',
    ...(existing?.note ? { note: existing.note } : {}),
    collectionIds: existing?.collectionIds ?? [],
    createdAt: existing?.createdAt ?? input.now,
    updatedAt: input.now,
    ...(pictureName ? { source: { pictureName } } : {}),
    attachments,
  }
  return {
    library: { ...library, colors: existing ? library.colors.map(entry => entry.id === color.id ? color : entry) : [...library.colors, color] },
    color,
    updated: !!existing,
  }
}

/** An empty note removes the note. */
export function setNote(library: ColorLibrary, id: string, note: string, now: number): ColorLibrary {
  const text = note.trim().slice(0, MAX_NOTE_LENGTH)
  return {
    ...library,
    colors: library.colors.map(color => {
      if (color.id !== id) return color
      const next: SavedColor = { ...color, updatedAt: now }
      if (text) next.note = text
      else delete next.note
      return next
    }),
  }
}

export function removeColor(library: ColorLibrary, id: string): ColorLibrary {
  return { ...library, colors: library.colors.filter(color => color.id !== id) }
}

/** Make a collection. The caller checks `collectionNameProblem` first; a bad name returns the library unchanged. */
export function createCollection(library: ColorLibrary, input: { id: string; name: string; now: number }): { library: ColorLibrary; collection: Collection | null } {
  if (collectionNameProblem(library, input.name)) return { library, collection: null }
  const collection: Collection = { id: input.id, name: cleanName(input.name), createdAt: input.now }
  return { library: { ...library, collections: [...library.collections, collection] }, collection }
}

/** Put a color in a collection, or take it out. Colors are never lost by either. */
export function setMembership(library: ColorLibrary, colorId: string, collectionId: string, member: boolean, now: number): ColorLibrary {
  if (!library.collections.some(collection => collection.id === collectionId)) return library
  return {
    ...library,
    colors: library.colors.map(color => {
      if (color.id !== colorId || color.collectionIds.includes(collectionId) === member) return color
      const collectionIds = member ? [...color.collectionIds, collectionId] : color.collectionIds.filter(id => id !== collectionId)
      return { ...color, collectionIds, updatedAt: now }
    }),
  }
}

/** Deleting a collection removes the grouping only. Every color stays saved. */
export function deleteCollection(library: ColorLibrary, collectionId: string): ColorLibrary {
  return {
    ...library,
    collections: library.collections.filter(collection => collection.id !== collectionId),
    colors: library.colors.map(color => color.collectionIds.includes(collectionId)
      ? { ...color, collectionIds: color.collectionIds.filter(id => id !== collectionId) }
      : color),
  }
}

export const colorsIn = (library: ColorLibrary, collectionId: string | null) =>
  collectionId === null ? library.colors : library.colors.filter(color => color.collectionIds.includes(collectionId))
