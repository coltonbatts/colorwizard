/**
 * DMC catalog loader and indexes (enriched build output).
 */

import { getDmcFloss } from '../dataCache'
import type { DMCCatalog, DMCFamily, DMCThread } from './types'

export type { DMCCatalog, DMCFamily, DMCThread } from './types'
export type {
  DMCBrand,
  DMCProductLine,
  HueBucket,
  OklabCoords,
  ShadeStep,
  ThreadWarmth,
} from './types'

export interface DMCCatalogIndexes {
  byId: Map<string, DMCThread>
  byNumber: Map<string, DMCThread>
  byFamilyId: Map<string, DMCFamily>
}

let catalogPromise: Promise<DMCCatalog> | null = null
let indexesPromise: Promise<DMCCatalogIndexes> | null = null

function isEnrichedThread(value: unknown): value is DMCThread {
  if (!value || typeof value !== 'object') return false
  const thread = value as Partial<DMCThread>
  return (
    typeof thread.id === 'string'
    && typeof thread.familyId === 'string'
    && typeof thread.shadeRank === 'number'
    && thread.oklab != null
    && typeof thread.oklab.L === 'number'
  )
}

function buildFamiliesFromThreads(threads: DMCThread[]): DMCFamily[] {
  const familyMap = new Map<string, DMCFamily>()

  for (const thread of threads) {
    let family = familyMap.get(thread.familyId)
    if (!family) {
      family = {
        id: thread.familyId,
        label: thread.familyLabel,
        threadIds: [],
        threadNumbers: [],
        hueBucket: thread.hueBucket,
      }
      familyMap.set(thread.familyId, family)
    }

    family.threadIds.push(thread.id)
    family.threadNumbers.push(thread.number)
  }

  return Array.from(familyMap.values())
}

function buildIndexes(catalog: DMCCatalog): DMCCatalogIndexes {
  const byId = new Map<string, DMCThread>()
  const byNumber = new Map<string, DMCThread>()
  const byFamilyId = new Map<string, DMCFamily>()

  for (const thread of catalog.threads) {
    byId.set(thread.id, thread)
    byNumber.set(thread.number, thread)
  }

  for (const family of catalog.families) {
    byFamilyId.set(family.id, family)
  }

  return { byId, byNumber, byFamilyId }
}

/**
 * Loads the enriched DMC catalog from `/data/dmc-floss.json`.
 * Regenerate via `npm run generate:data` after source changes.
 */
export async function loadDmcCatalog(): Promise<DMCCatalog> {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const raw = await getDmcFloss()
      if (raw.length === 0) {
        return { threads: [], families: [] }
      }

      if (!isEnrichedThread(raw[0])) {
        throw new Error(
          'DMC catalog is missing build-time enrichment. Run `npm run generate:data`.',
        )
      }

      const threads = raw as DMCThread[]
      const families = buildFamiliesFromThreads(threads)

      return { threads, families }
    })()
  }

  return catalogPromise
}

/** Indexed lookups for threads and families. */
export async function loadDmcCatalogIndexes(): Promise<DMCCatalogIndexes> {
  if (!indexesPromise) {
    indexesPromise = loadDmcCatalog().then(buildIndexes)
  }

  return indexesPromise
}

export async function getDmcThreadByNumber(number: string): Promise<DMCThread | undefined> {
  const { byNumber } = await loadDmcCatalogIndexes()
  return byNumber.get(number)
}

export async function getDmcThreadById(id: string): Promise<DMCThread | undefined> {
  const { byId } = await loadDmcCatalogIndexes()
  return byId.get(id)
}

export async function getDmcFamily(familyId: string): Promise<DMCFamily | undefined> {
  const { byFamilyId } = await loadDmcCatalogIndexes()
  return byFamilyId.get(familyId)
}

/** Threads in a family, lightest → darkest (shade rank). */
export async function getDmcFamilyThreads(familyId: string): Promise<DMCThread[]> {
  const family = await getDmcFamily(familyId)
  if (!family) return []

  const { byId } = await loadDmcCatalogIndexes()
  const threads: DMCThread[] = []

  for (const id of family.threadIds) {
    const thread = byId.get(id)
    if (thread) threads.push(thread)
  }

  return threads
}

/** Clears in-memory catalog caches (tests). */
export function resetDmcCatalogCache(): void {
  catalogPromise = null
  indexesPromise = null
}
