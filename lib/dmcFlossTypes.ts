import type { Lab } from './colorUtils'
import type { DMCThread } from './dmc/types'

/**
 * DMC floss color loaded from the enriched catalog.
 * `lab` is computed at runtime for ΔE matching and is not persisted in JSON.
 */
export type DMCColor = DMCThread & {
  lab?: Lab
}
