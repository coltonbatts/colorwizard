/**
 * Types for the Painterly Thread Map & Monochrome Value Ramp engine.
 * Pure, React-free.
 */

import type { DMCThread, ImageOklabLRange } from '../types'

/** `slot` value for a transparent pixel belonging to no thread. */
export const NO_THREAD = 255

/** ΔE00 threshold above which a pixel is flagged as visibly off (matches Paint Plan & threadFit). */
export const VISIBLE_THREAD_MISS = 5

export type ThreadMapMode = 'full-color' | 'monochrome'

export const FULL_COLOR_MIN = 2
export const FULL_COLOR_MAX = 30
export const FULL_COLOR_BUDGETS = [6, 10, 14, 18] as const
export type FullColorBudget = number
export const DEFAULT_FULL_COLOR_BUDGET = 12

export const MONOCHROME_MIN = 2
export const MONOCHROME_MAX = 12
export const MONOCHROME_BUDGETS = [5, 7, 9] as const
export type MonochromeBudget = number
export const DEFAULT_MONOCHROME_BUDGET = 7

export type MonochromeTone = 'warm-grays' | 'neutral-grays' | 'cool-grays' | 'sepia-browns'

export interface MonochromeTonePreset {
  id: MonochromeTone
  label: string
  shortLabel: string
  description: string
}

export const MONOCHROME_TONES: readonly MonochromeTonePreset[] = [
  {
    id: 'warm-grays',
    label: 'Warm grays',
    shortLabel: 'Warm',
    description: 'Beaver, Beige & Shell Grays with warm white and deep dark anchors.',
  },
  {
    id: 'neutral-grays',
    label: 'Neutral grays',
    shortLabel: 'Neutral',
    description: 'Tin, neutral Pearl, White and Black for balanced graphite-like shading.',
  },
  {
    id: 'cool-grays',
    label: 'Cool grays',
    shortLabel: 'Cool',
    description: 'Steel, Pewter, cool Pearl, Snow White and Black for crisp silver tones.',
  },
  {
    id: 'sepia-browns',
    label: 'Sepia & browns',
    shortLabel: 'Sepia',
    description: 'Ecru, Mocha, Driftwood and Coffee Browns for warm portrait studies.',
  },
] as const

export type ThreadMapDetail = 'crisp' | 'painterly' | 'broad'

export interface ThreadMapDetailPreset {
  id: ThreadMapDetail
  label: string
  description: string
}

export const DEFAULT_THREAD_MAP_DETAIL: ThreadMapDetail = 'painterly'

export const THREAD_MAP_DETAILS: readonly ThreadMapDetailPreset[] = [
  {
    id: 'crisp',
    label: 'Crisp',
    description: 'High-resolution 1024 px detail that preserves fine contours, highlights, and delicate shapes.',
  },
  {
    id: 'painterly',
    label: 'Painterly',
    description: 'Merges isolated confetti into smooth stitch shapes while keeping crisp edges.',
  },
  {
    id: 'broad',
    label: 'Broad',
    description: 'Simplifies busy textures into bold, sweeping color planes.',
  },
] as const

/** Working-copy resolution (long side, px) per detail preset. */
export const THREAD_MAP_MAX_SIDE: Record<ThreadMapDetail, number> = {
  crisp: 1024,
  painterly: 640,
  broad: 512,
}

/** Canonical long-side resolution used for deterministic palette fitting across all detail presets. */
export const THREAD_MAP_FIT_MAX_SIDE = 512

export type ThreadMapFidelity = 'faithful' | 'balanced'

export interface ThreadMapFidelityPreset {
  id: ThreadMapFidelity
  label: string
  description: string
}

export const DEFAULT_THREAD_MAP_FIDELITY: ThreadMapFidelity = 'faithful'

export const THREAD_MAP_FIDELITIES: readonly ThreadMapFidelityPreset[] = [
  {
    id: 'faithful',
    label: 'True to photo',
    description: 'Prioritizes accurate midtones, skin, and natural color balance close to the original.',
  },
  {
    id: 'balanced',
    label: 'Vibrant accents',
    description: 'Gives extra palette weight to small, vivid highlights and colorful details.',
  },
] as const

export interface ThreadMapOptions {
  mode: ThreadMapMode
  budget: number
  monochromeTone?: MonochromeTone
  /** Spatial region cleanup level (defaults to 'painterly'). */
  detail?: ThreadMapDetail
  /** Color fitting balance in Full Color mode (defaults to 'faithful'). */
  fidelity?: ThreadMapFidelity
  /** Apply a gentle CIEDE2000 preference for owned DMC numbers so stash threads win close ties. */
  preferBox?: boolean
  ownedNumbers?: readonly string[]
  /** DMC thread numbers locked/pinned by the stitcher (preserved as fixed medoids in Full Color mode). */
  lockedNumbers?: readonly string[]
  /** Optional explicit palette of DMC numbers (used for monotonic slider steps & detail switches). */
  paletteNumbers?: readonly string[]
  /** DMC numbers that were manually swapped in by the stitcher (sets `slot.swapped = true`). */
  swappedNumbers?: readonly string[]
  /**
   * Optional in-place display thread substitutions (`baseLowerNumber -> replacement DMC number`)
   * in Full Color mode. Region assignment and spatial smoothing run on the base palette first,
   * then substituted slots repaint in place and are honestly scored against the original photo pixels.
   */
  swapOverrides?: Readonly<Record<string, string>>
  /** Global k-medoids anchor count for the monotonic progressive ladder (defaults to 12). */
  anchorBudget?: number
}

export interface ThreadMapSlot {
  /** 0-based index in `slots` (displayed as 1..N, lightest → darkest). */
  index: number
  thread: DMCThread
  /** Share of opaque pixels assigned to this thread (0..1). */
  area: number
  /** Area-weighted mean CIEDE2000 of assigned pixels to this thread's catalog color (NaN if area 0). */
  meanDeltaE00: number
  /** Area-weighted mean |ΔL| in OKLab (0..1) of assigned pixels to this thread (NaN if area 0). */
  meanDeltaL: number
  /** Average sRGB hex of the pixels assigned to this thread (or thread.hex when area 0). */
  targetHex: string
  /** True when the stitcher manually swapped this slot from the computed selection. */
  swapped: boolean
  /** Original base DMC thread assigned to this region before substitution (present when substituted in place). */
  originalThread?: DMCThread
}

export interface ThreadMapScore {
  threadCount: number
  /** Area-weighted mean CIEDE2000 across opaque pixels. */
  meanDeltaE00: number
  /** 95th-percentile CIEDE2000 across opaque pixels. */
  p95DeltaE00: number
  /** Area-weighted mean |ΔL| in OKLab (0..1) across opaque pixels. */
  meanDeltaL: number
  /** Share of opaque pixels with ΔE00 > 5 in Full Color mode (0 in Monochrome mode). */
  visiblyOffArea: number
  /** Number of slots whose DMC catalog color is flagged `approximate`. */
  approximateThreads: number
}

export interface ThreadMapResult {
  mode: ThreadMapMode
  budget: number
  monochromeTone: MonochromeTone | null
  detail: ThreadMapDetail
  fidelity: ThreadMapFidelity
  preferBox: boolean
  width: number
  height: number
  /** Ordered lightest → darkest by OKLab L, numbered 1..N. */
  slots: ThreadMapSlot[]
  /** Slot index (into `slots`) for every pixel row by row; NO_THREAD (255) for transparent pixels. */
  slot: Uint8Array
  /** 1 where pixel is > 5 ΔE00 from its thread in Full Color mode, 0 otherwise. */
  visiblyOff: Uint8Array
  score: ThreadMapScore
  /** 2% clipped OKLab L range of the photo. */
  imageOklabLRange: ImageOklabLRange
  /** Optional progressive ordered DMC numbers (`2..30`) for flicker-free slider refinement. */
  ladder?: string[]
  /** Computation time in ms. */
  ms: number
}
