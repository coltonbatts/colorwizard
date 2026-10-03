import type { SpectralRecipe } from './spectral/types'

export const SIMPLE_SAVED_KEY = 'colorwizard-simple-saved'

/** A frozen spectral result. Legacy entries contain only a color and need a new solve. */
export interface SavedPaintColor {
  id: string
  hex: string
  name: string
  savedAt: number
  pictureName?: string
  paletteName?: string
  recipe?: SpectralRecipe
}

const isHex = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object'

function isRecipe(value: unknown): value is SpectralRecipe {
  if (!record(value) || !isHex(value.predictedHex) || !finite(value.error) || value.error < 0 ||
      !['Excellent', 'Good', 'Fair', 'Poor'].includes(String(value.matchQuality)) || value.isFallback === true ||
      !Array.isArray(value.steps) || !value.steps.every(step => typeof step === 'string') ||
      !Array.isArray(value.ingredients) || !value.ingredients.length) return false
  for (const key of ['error00', 'unroundedError', 'unroundedError00', 'totalParts']) {
    if (value[key] !== undefined && (!finite(value[key]) || value[key] < 0)) return false
  }
  if (value.paintable !== undefined && typeof value.paintable !== 'boolean') return false
  if (!value.ingredients.every(item => record(item) && record(item.pigment) &&
      typeof item.pigment.id === 'string' && typeof item.pigment.name === 'string' &&
      isHex(item.pigment.hex) && finite(item.pigment.tintingStrength) && item.pigment.tintingStrength > 0 &&
      finite(item.weight) && item.weight > 0 && item.weight <= 1 && typeof item.percentage === 'string' &&
      (item.parts === undefined || (finite(item.parts) && Number.isInteger(item.parts) && item.parts > 0)))) return false
  const sum = value.ingredients.reduce((total, item) => total + item.weight, 0)
  return Math.abs(sum - 1) < 0.01
}

export function parseSavedColors(raw: string | null): SavedPaintColor[] {
  if (!raw) return []
  const parsed: unknown = JSON.parse(raw)
  // Keep old hex-only saves readable without inventing a historical recipe.
  if (Array.isArray(parsed)) {
    return [...new Set(parsed.filter(isHex).map(hex => hex.toUpperCase()))].map(hex => ({
      id: `legacy-${hex}`, hex, name: '', savedAt: 0,
    }))
  }
  if (!record(parsed) || parsed.version !== 1 || !Array.isArray(parsed.colors)) {
    throw new Error('Unrecognized saved colors')
  }
  const seen = new Set<string>()
  return parsed.colors.map(entry => {
    if (!record(entry) || typeof entry.id !== 'string' || seen.has(entry.id) || !isHex(entry.hex) ||
        typeof entry.name !== 'string' || !finite(entry.savedAt) ||
        (entry.pictureName !== undefined && typeof entry.pictureName !== 'string') ||
        (entry.paletteName !== undefined && typeof entry.paletteName !== 'string') ||
        (entry.recipe !== undefined && (!isRecipe(entry.recipe) || typeof entry.paletteName !== 'string'))) {
      throw new Error('Invalid saved color')
    }
    seen.add(entry.id)
    return { ...entry, hex: entry.hex.toUpperCase() } as unknown as SavedPaintColor
  })
}

/** Write before acknowledging success. Quota/privacy errors must reach the caller. */
export function storeSavedColors(storage: Pick<Storage, 'setItem'>, colors: SavedPaintColor[]): void {
  storage.setItem(SIMPLE_SAVED_KEY, JSON.stringify({ version: 1, colors }))
}
