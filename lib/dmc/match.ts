/**
 * DMC thread matching with family-aware context.
 */

import { deltaE, getMatchConfidence, rgbToLab, type Lab } from '../colorUtils'
import { loadDmcCatalog, getDmcFamilyThreads } from './catalog'
import { analyzeSampleImageValue } from './imageValue'
import {
  buildSuggestedRenderingSet,
  buildValueWarnings,
} from './valueAnalysis'
import type {
  DMCThread,
  ImageValueContext,
  ScoredDMCThread,
  ThreadMatchResult,
} from './types'

export type {
  ImageValueBand,
  ImageValueContext,
  SampleValueContext,
  ScoredDMCThread,
  SuggestedRenderingSet,
  ThreadLadderPosition,
  ThreadMatchResult,
  ValueWarning,
} from './types'

export { buildImageValueContext, computeImageOklabLRange } from './imageValue'

export interface ThreadMatchOptions {
  /** Max cross-family alternatives (default 3). */
  alternativeCount?: number
  /** Image-relative OKLab L anchors (from analyzed image). */
  imageValue?: ImageValueContext | null
  /** How many ranked matches to retain for alternates UI (default 5). */
  topMatchCount?: number
}

function scoreThread(targetLab: Lab, thread: DMCThread): ScoredDMCThread {
  const threadLab = rgbToLab(thread.rgb.r, thread.rgb.g, thread.rgb.b)
  const deltaE00 = deltaE(targetLab, threadLab)
  const { label, color, bgColor } = getMatchConfidence(deltaE00)

  return {
    ...thread,
    deltaE00,
    confidenceLabel: label,
    confidenceColor: color,
    confidenceBgColor: bgColor,
  }
}

/** Ranks catalog threads by CIEDE2000 distance to an sRGB sample (ascending). */
export function rankDmcThreadsByDeltaE(
  rgb: { r: number; g: number; b: number },
  threads: DMCThread[],
): ScoredDMCThread[] {
  const targetLab = rgbToLab(rgb.r, rgb.g, rgb.b)
  return threads
    .map((thread) => scoreThread(targetLab, thread))
    .sort((a, b) => a.deltaE00 - b.deltaE00)
}

function buildLadderPosition(
  primary: ScoredDMCThread,
  familyLadder: ScoredDMCThread[],
): ThreadMatchResult['ladderPosition'] {
  if (primary.familySize <= 1) {
    return undefined
  }

  const index = familyLadder.findIndex((thread) => thread.id === primary.id)
  if (index === -1) {
    return undefined
  }

  return {
    rank: primary.shadeRank,
    total: primary.familySize,
    lighter: index > 0 ? familyLadder[index - 1] : undefined,
    darker: index < familyLadder.length - 1 ? familyLadder[index + 1] : undefined,
  }
}

/**
 * Returns the best global DMC match plus family ladder and cross-family alternatives.
 */
export async function getThreadMatchContext(
  rgb: { r: number; g: number; b: number },
  options: ThreadMatchOptions = {},
): Promise<ThreadMatchResult | null> {
  const { threads } = await loadDmcCatalog()
  if (threads.length === 0) {
    return null
  }

  const alternativeCount = options.alternativeCount ?? 3
  const topMatchCount = options.topMatchCount ?? 5
  const ranked = rankDmcThreadsByDeltaE(rgb, threads)
  const primary = ranked[0]
  const sampleValue = analyzeSampleImageValue(rgb, options.imageValue)

  const sameFamily = ranked
    .filter((thread) => thread.familyId === primary.familyId)
    .sort((a, b) => a.deltaE00 - b.deltaE00)

  const familyThreads = await getDmcFamilyThreads(primary.familyId)
  const targetLab = rgbToLab(rgb.r, rgb.g, rgb.b)
  const familyLadder = familyThreads
    .map((thread) => scoreThread(targetLab, thread))
    .sort((a, b) => a.shadeRank - b.shadeRank)

  const alternatives = ranked
    .filter((thread) => thread.familyId !== primary.familyId)
    .slice(0, Math.max(0, alternativeCount))

  const ladderPosition = buildLadderPosition(primary, familyLadder)
  const valueWarnings = buildValueWarnings(sampleValue, primary, ladderPosition)
  const suggestedSet = buildSuggestedRenderingSet(
    sampleValue,
    primary,
    familyLadder,
    alternatives,
    ladderPosition,
  )

  return {
    primary,
    sameFamily,
    familyLadder,
    alternatives,
    ladderPosition,
    sampleValue,
    topMatches: ranked.slice(0, Math.max(topMatchCount, alternativeCount + 1)),
    valueWarnings,
    suggestedSet,
  }
}
