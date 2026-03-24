import type { DMCColor } from './dmcFlossTypes'

type ColorNameEntry = { name: string; hex: string }

const valueCache = new Map<string, unknown>()
const promiseCache = new Map<string, Promise<unknown>>()

async function readJsonFromPublicData(fileName: string): Promise<unknown> {
  const response = await fetch(`/data/${fileName}`)
  if (!response.ok) {
    throw new Error(`Failed to load /data/${fileName}: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<unknown>
}

async function loadCachedJson<T>(cacheKey: string, fileName: string): Promise<T> {
  const cached = valueCache.get(cacheKey)
  if (cached) {
    return cached as T
  }

  const inFlight = promiseCache.get(cacheKey)
  if (inFlight) {
    return inFlight as Promise<T>
  }

  const request = (async () => {
    const data = await readJsonFromPublicData(fileName)
    valueCache.set(cacheKey, data)
    return data as T
  })()

  promiseCache.set(cacheKey, request)

  try {
    return await request
  } finally {
    promiseCache.delete(cacheKey)
  }
}

export async function getColorNames(): Promise<Record<string, string>> {
  try {
    const entries = await loadCachedJson<ColorNameEntry[]>('color-names', 'colornames.json')
    const colors: Record<string, string> = {}

    for (const entry of entries) {
      if (!entry?.hex || !entry?.name) continue
      colors[entry.hex.toLowerCase()] = entry.name
    }

    return colors
  } catch (error) {
    console.error('Failed to load color names dataset:', error)
    return {}
  }
}

export async function getDmcFloss(): Promise<DMCColor[]> {
  try {
    return await loadCachedJson<DMCColor[]>('dmc-floss', 'dmc-floss.json')
  } catch (error) {
    console.error('Failed to load DMC floss dataset:', error)
    return []
  }
}
