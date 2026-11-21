/**
 * Safe localStorage persistence for DMC Thread Map preferences.
 * Pure, deterministic validation — never throws on corrupt, missing, or blocked storage.
 */

import {
  DEFAULT_FULL_COLOR_BUDGET,
  DEFAULT_MONOCHROME_BUDGET,
  DEFAULT_THREAD_MAP_DETAIL,
  FULL_COLOR_MAX,
  FULL_COLOR_MIN,
  MONOCHROME_MAX,
  MONOCHROME_MIN,
  MONOCHROME_TONES,
  THREAD_MAP_DETAILS,
  type FullColorBudget,
  type MonochromeBudget,
  type MonochromeTone,
  type ThreadMapDetail,
  type ThreadMapMode,
} from './types'

export const THREAD_MAP_PREFS_KEY = 'colorwizard-simple-thread-map-prefs'

export interface ThreadMapPrefs {
  mode: ThreadMapMode
  fullColorBudget: FullColorBudget
  monochromeBudget: MonochromeBudget
  monochromeTone: MonochromeTone
  detail: ThreadMapDetail
  preferBox: boolean
}

export const DEFAULT_THREAD_MAP_PREFS: ThreadMapPrefs = {
  mode: 'full-color',
  fullColorBudget: DEFAULT_FULL_COLOR_BUDGET,
  monochromeBudget: DEFAULT_MONOCHROME_BUDGET,
  monochromeTone: 'warm-grays',
  detail: DEFAULT_THREAD_MAP_DETAIL,
  preferBox: false,
}

const VALID_TONES = new Set<string>(MONOCHROME_TONES.map((t) => t.id))
const VALID_DETAILS = new Set<string>(THREAD_MAP_DETAILS.map((d) => d.id))

function parseIntInRange(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const rounded = Math.round(value)
  if (rounded < min || rounded > max) return fallback
  return rounded
}

export function loadThreadMapPrefs(storage?: Pick<Storage, 'getItem'> | null): ThreadMapPrefs {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null)
    const raw = store?.getItem(THREAD_MAP_PREFS_KEY)
    if (!raw) return { ...DEFAULT_THREAD_MAP_PREFS }
    const parsed = JSON.parse(raw) as Record<string, unknown> | null
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_THREAD_MAP_PREFS }

    return {
      mode: parsed.mode === 'monochrome' ? 'monochrome' : 'full-color',
      fullColorBudget: parseIntInRange(
        parsed.fullColorBudget,
        FULL_COLOR_MIN,
        FULL_COLOR_MAX,
        DEFAULT_FULL_COLOR_BUDGET,
      ),
      monochromeBudget: parseIntInRange(
        parsed.monochromeBudget,
        MONOCHROME_MIN,
        MONOCHROME_MAX,
        DEFAULT_MONOCHROME_BUDGET,
      ),
      monochromeTone:
        typeof parsed.monochromeTone === 'string' && VALID_TONES.has(parsed.monochromeTone)
          ? (parsed.monochromeTone as MonochromeTone)
          : DEFAULT_THREAD_MAP_PREFS.monochromeTone,
      detail:
        typeof parsed.detail === 'string' && VALID_DETAILS.has(parsed.detail)
          ? (parsed.detail as ThreadMapDetail)
          : DEFAULT_THREAD_MAP_PREFS.detail,
      preferBox: typeof parsed.preferBox === 'boolean' ? parsed.preferBox : DEFAULT_THREAD_MAP_PREFS.preferBox,
    }
  } catch {
    return { ...DEFAULT_THREAD_MAP_PREFS }
  }
}

export function storeThreadMapPrefs(
  prefs: ThreadMapPrefs,
  storage?: Pick<Storage, 'setItem'> | null,
): void {
  try {
    const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null)
    store?.setItem(THREAD_MAP_PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* preferences are a convenience; a blocked or full store should never break mapping */
  }
}
