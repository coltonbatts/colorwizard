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

/** Artist-facing value band within the current image (OKLab L, image-normalized). */
export type ImageValueBand =
  | 'highlight'
  | 'light'
  | 'mid'
  | 'dark'
  | 'deepest-dark'

export interface ImageOklabLRange {
  min: number
  max: number
}

/** Image-wide anchors for relative value (from analyzed pixels). */
export interface ImageValueContext {
  oklabLRange: ImageOklabLRange
  clipPercent?: number
}

/** Sample color value relative to the loaded image. */
export interface SampleValueContext {
  oklabL: number
  /** 0 = darkest meaningful anchor, 100 = lightest. */
  normalizedPosition: number
  band: ImageValueBand
  bandLabel: string
  /** Rendering role for this sample in the image (V1: mirrors band). */
  renderingRole: ImageValueBand
}

export type ValueWarningCode =
  | 'hue-match-too-light'
  | 'hue-match-too-dark'
  | 'ladder-too-compressed'

export interface ValueWarning {
  code: ValueWarningCode
  message: string
  severity: 'info' | 'caution'
}

export type RenderingSetRole = 'highlight' | 'base' | 'shadow' | 'anchor-dark'

export interface RenderingThreadSuggestion {
  role: RenderingSetRole
  thread: ScoredDMCThread
  note?: string
}

export interface SuggestedRenderingSet {
  suggestions: RenderingThreadSuggestion[]
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
  /** Image-relative value of the sampled color. */
  sampleValue: SampleValueContext
  /** Ranked matches for alternates UI (single pipeline; avoids duplicate ranking). */
  topMatches: ScoredDMCThread[]
  valueWarnings: ValueWarning[]
  suggestedSet: SuggestedRenderingSet
}
