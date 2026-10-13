/**
 * Backing up and restoring the saved-color library. Pure and React-free.
 * A backup is a JSON file wrapping the v2 library; restoring merges it into what is already saved
 * and never deletes anything. Pictures are not part of a backup.
 */
import {
  collectionNameProblem, MAX_COLLECTIONS, parseLibrary,
  type Collection, type ColorLibrary, type SavedColor,
} from './colorLibrary'

export const BACKUP_FORMAT = 'colorwizard-library'
export const BACKUP_VERSION = 1
/** A real library is a few hundred KB at most; this stops a wrong file from being read into memory. */
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024

export function buildBackup(library: ColorLibrary, now: number): string {
  return JSON.stringify({ format: BACKUP_FORMAT, formatVersion: BACKUP_VERSION, exportedAt: new Date(now).toISOString(), library }, null, 2)
}

export function backupFileName(now: number): string {
  const d = new Date(now)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `colorwizard-colors-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`
}

export type BackupProblem = 'not-json' | 'not-colorwizard' | 'newer-version' | 'damaged' | 'too-large'

export const BACKUP_PROBLEM_TEXT: Record<BackupProblem, string> = {
  'not-json': 'That file isn’t a ColorWizard backup. It isn’t readable as JSON.',
  'not-colorwizard': 'That file isn’t a ColorWizard backup.',
  'newer-version': 'That backup was made by a newer version of ColorWizard. Update this page and try again.',
  damaged: 'That backup looks damaged, so nothing was imported.',
  'too-large': 'That file is too large to be a ColorWizard backup.',
}

export type ParsedBackup = { ok: true; library: ColorLibrary; exportedAt?: string } | { ok: false; problem: BackupProblem }

/** Strict. Anything unreadable is refused whole; a backup is never partly imported. */
export function parseBackup(text: string): ParsedBackup {
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, problem: 'too-large' }
  let data: unknown
  try { data = JSON.parse(text) } catch { return { ok: false, problem: 'not-json' } }
  if (!data || typeof data !== 'object' || Array.isArray(data) || (data as Record<string, unknown>).format !== BACKUP_FORMAT) return { ok: false, problem: 'not-colorwizard' }
  const { formatVersion, library, exportedAt } = data as Record<string, unknown>
  if (typeof formatVersion !== 'number' || !Number.isInteger(formatVersion) || formatVersion < 1) return { ok: false, problem: 'damaged' }
  if (formatVersion > BACKUP_VERSION) return { ok: false, problem: 'newer-version' }
  try {
    return { ok: true, library: parseLibrary(JSON.stringify(library)), exportedAt: typeof exportedAt === 'string' ? exportedAt : undefined }
  } catch {
    return { ok: false, problem: 'damaged' }
  }
}

export interface MergeReport {
  /** Colors in the file that were not saved here. */
  added: number
  /** Colors saved here that the file has a newer version of; the file's version replaced them. */
  updated: number
  /** Colors left exactly as they were, because they match the file or are newer than it. */
  kept: number
  collectionsAdded: number
  /** Collections the file has that could not be added because of the limit; their colors are still imported. */
  collectionsSkipped: number
}

/**
 * Merge a backup into the current library. Colors match by hex. When both have a color, the more
 * recently updated one wins whole (ties keep yours); a replaced color keeps your id and is in the
 * union of both sets of collections. Collections match by name, ignoring case. Nothing is deleted.
 */
export function mergeLibraries(local: ColorLibrary, incoming: ColorLibrary, makeId: () => string): { library: ColorLibrary; report: MergeReport } {
  const report: MergeReport = { added: 0, updated: 0, kept: 0, collectionsAdded: 0, collectionsSkipped: 0 }
  const usedIds = new Set([...local.colors.map(c => c.id), ...local.collections.map(c => c.id)])
  const freshId = (preferred: string) => {
    const id = usedIds.has(preferred) ? makeId() : preferred
    usedIds.add(id)
    return id
  }

  const collections: Collection[] = [...local.collections]
  const mapped = new Map<string, string | null>() // incoming collection id -> id here, or null if skipped
  for (const incomingCollection of incoming.collections) {
    const same = collections.find(c => c.name.toLowerCase() === incomingCollection.name.toLowerCase())
    if (same) { mapped.set(incomingCollection.id, same.id); continue }
    const probe: ColorLibrary = { ...local, collections }
    if (collections.length >= MAX_COLLECTIONS || collectionNameProblem(probe, incomingCollection.name)) {
      mapped.set(incomingCollection.id, null)
      report.collectionsSkipped++
      continue
    }
    const id = freshId(incomingCollection.id)
    collections.push({ ...incomingCollection, id })
    mapped.set(incomingCollection.id, id)
    report.collectionsAdded++
  }
  const remap = (ids: string[]) => [...new Set(ids.map(id => mapped.get(id)).filter((id): id is string => !!id))]

  const colors: SavedColor[] = [...local.colors]
  for (const color of incoming.colors) {
    const index = colors.findIndex(c => c.hex === color.hex)
    if (index === -1) {
      colors.push({ ...color, id: freshId(color.id), collectionIds: remap(color.collectionIds) })
      report.added++
    } else if (color.updatedAt > colors[index].updatedAt) {
      const mine = colors[index]
      colors[index] = { ...color, id: mine.id, collectionIds: [...new Set([...mine.collectionIds, ...remap(color.collectionIds)])] }
      report.updated++
    } else {
      report.kept++
    }
  }
  return { library: { version: 2, colors, collections }, report }
}

export const nothingToImport = (report: MergeReport) => report.added === 0 && report.updated === 0 && report.collectionsAdded === 0

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** What importing would do, in plain words, for the preview before anything is written. */
export function describeMerge(report: MergeReport, file: { colors: number; collections: number }): string {
  const does: string[] = []
  if (report.added) does.push(`add ${plural(report.added, 'new color')}`)
  if (report.updated) does.push(`replace ${plural(report.updated, 'color')} with the file’s newer ${report.updated === 1 ? 'version' : 'versions'}`)
  if (report.collectionsAdded) does.push(`add ${plural(report.collectionsAdded, 'collection')}`)
  const joined = does.length > 1 ? `${does.slice(0, -1).join(', ')} and ${does[does.length - 1]}` : does[0] ?? 'change nothing'
  const parts = [`This file has ${plural(file.colors, 'color')} and ${plural(file.collections, 'collection')}. Importing will ${joined}.`]
  if (report.kept) parts.push(`${plural(report.kept, 'color')} you already have ${report.kept === 1 ? 'stays' : 'stay'} as ${report.kept === 1 ? 'it is' : 'they are'}.`)
  if (report.collectionsSkipped) parts.push(`${plural(report.collectionsSkipped, 'collection')} can’t be added because you have the most collections allowed; those colors are still imported.`)
  parts.push('Nothing is deleted.')
  return parts.join(' ')
}
