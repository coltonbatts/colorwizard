/**
 * DMC thread catalog types (build-enriched, offline-first).
 */

export type DMCBrand = 'dmc'

export type DMCProductLine = 'mouline-solid'

export type ShadeStep =
  | 'very-light'
  | 'light'
  | 'medium'
  | 'dark'
  | 'very-dark'
  | 'unspecified'

export type HueBucket =
  | 'red'
  | 'red-orange'
  | 'orange'
  | 'yellow'
  | 'yellow-green'
  | 'green'
  | 'cyan'
  | 'blue'
  | 'violet'
  | 'magenta'
  | 'neutral'

export type ThreadWarmth = 'warm' | 'cool' | 'neutral'

export interface OklabCoords {
  L: number
  a: number
  b: number
}

/** Canonical catalog record emitted by `scripts/dmc-enrich.mjs`. */
export interface DMCThread {
  id: string
  brand: DMCBrand
  number: string
  name: string
  rgb: { r: number; g: number; b: number }
  hex: string
  productLine: DMCProductLine
  familyId: string
  familyLabel: string
  shadeStep: ShadeStep
  /** 0 = lightest in family (by OKLab L). */
  shadeRank: number
  familySize: number
  oklab: OklabCoords
  hueBucket: HueBucket
  warmth: ThreadWarmth
}

export interface DMCFamily {
  id: string
  label: string
  threadIds: string[]
  threadNumbers: string[]
  hueBucket: HueBucket
}

export interface DMCCatalog {
  threads: DMCThread[]
  families: DMCFamily[]
}

/** DMC thread with CIEDE2000 distance to a sampled color. */
export interface ScoredDMCThread extends DMCThread {
  deltaE00: number
  confidenceLabel: string
  confidenceColor: string
  confidenceBgColor: string
}

export interface ThreadLadderPosition {
  rank: number
  total: number
  lighter?: ScoredDMCThread
  darker?: ScoredDMCThread
}

/** Family-aware match context for embroidery substitution workflows. */
export interface ThreadMatchResult {
  primary: ScoredDMCThread
  /** All threads in the primary family, best perceptual match first. */
  sameFamily: ScoredDMCThread[]
  /** Same family ordered lightest → darkest (shade ladder). */
  familyLadder: ScoredDMCThread[]
  /** Strongest matches outside the primary family. */
  alternatives: ScoredDMCThread[]
  ladderPosition?: ThreadLadderPosition
}
