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
  /** Reserved for collections; always empty until they exist. */
  collectionIds: string[]
  createdAt: number
  updatedAt: number
  source?: { pictureName?: string }
  attachments: { paint?: PaintAttachment; thread?: ThreadAttachment }
}

export interface ColorLibrary {
  version: 2
  colors: SavedColor[]
}

export const emptyLibrary = (): ColorLibrary => ({ version: 2, colors: [] })

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

/** Strict: unreadable data throws so the caller can keep it instead of overwriting it. */
export function parseLibrary(raw: string): ColorLibrary {
  const parsed: unknown = JSON.parse(raw)
  if (!record(parsed) || parsed.version !== 2 || !Array.isArray(parsed.colors)) throw new Error('Unrecognized color library')
  const ids = new Set<string>()
  const hexes = new Set<string>()
  const colors = parsed.colors.map(entry => {
    if (!validColor(entry)) throw new Error('Invalid saved color')
    const hex = entry.hex.toUpperCase()
    if (ids.has(entry.id) || hexes.has(hex)) throw new Error('Duplicate saved color')
    ids.add(entry.id)
    hexes.add(hex)
    return { ...entry, hex }
  })
  return { version: 2, colors }
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
  return { version: 2, colors }
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
    library: { version: 2, colors: existing ? library.colors.map(entry => entry.id === color.id ? color : entry) : [...library.colors, color] },
    color,
    updated: !!existing,
  }
}

/** An empty note removes the note. */
export function setNote(library: ColorLibrary, id: string, note: string, now: number): ColorLibrary {
  const text = note.trim().slice(0, MAX_NOTE_LENGTH)
  return {
    version: 2,
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
  return { version: 2, colors: library.colors.filter(color => color.id !== id) }
}
