/**
 * Value-aware thread warnings and rendering-set suggestions.
 */
import type {
  ImageValueBand,
  SampleValueContext,
  ScoredDMCThread,
  SuggestedRenderingSet,
  ThreadLadderPosition,
  ValueWarning,
} from './types'

const VALUE_L_MISMATCH = 0.07
const LADDER_SPREAD_MIN = 0.06

function isShadowBand(band: ImageValueBand): boolean {
  return band === 'dark' || band === 'deepest-dark'
}

function isHighlightBand(band: ImageValueBand): boolean {
  return band === 'highlight' || band === 'light'
}

export function buildValueWarnings(
  sampleValue: SampleValueContext,
  primary: ScoredDMCThread,
  ladderPosition?: ThreadLadderPosition,
): ValueWarning[] {
  const warnings: ValueWarning[] = []
  const threadL = primary.oklab.L
  const sampleL = sampleValue.oklabL

  if (isShadowBand(sampleValue.band) && threadL > sampleL + VALUE_L_MISMATCH) {
    warnings.push({
      code: 'hue-match-too-light',
      severity: 'caution',
      message:
        'Hue is close, but this thread reads lighter than your shadow sample — form may flatten.',
    })
  }

  if (isHighlightBand(sampleValue.band) && threadL < sampleL - VALUE_L_MISMATCH) {
    warnings.push({
      code: 'hue-match-too-dark',
      severity: 'caution',
      message:
        'Hue is close, but this thread reads darker than your highlight sample — highlights may look muddy.',
    })
  }

  const lighter = ladderPosition?.lighter
  const darker = ladderPosition?.darker
  if (lighter && darker) {
    const spread = lighter.oklab.L - darker.oklab.L
    if (spread < LADDER_SPREAD_MIN) {
      warnings.push({
        code: 'ladder-too-compressed',
        severity: 'info',
        message:
          'Neighboring family shades are very close in value — you may need another family for clear light/dark separation.',
      })
    }
  }

  return warnings
}

function pickByTargetL(
  candidates: ScoredDMCThread[],
  targetL: number,
  excludeId?: string,
): ScoredDMCThread | undefined {
  let best: ScoredDMCThread | undefined
  let bestDist = Infinity

  for (const thread of candidates) {
    if (thread.id === excludeId) continue
    const dist = Math.abs(thread.oklab.L - targetL)
    if (dist < bestDist) {
      bestDist = dist
      best = thread
    }
  }

  return best
}

export function buildSuggestedRenderingSet(
  sampleValue: SampleValueContext,
  primary: ScoredDMCThread,
  familyLadder: ScoredDMCThread[],
  alternatives: ScoredDMCThread[],
  ladderPosition?: ThreadLadderPosition,
): SuggestedRenderingSet {
  const sampleL = sampleValue.oklabL
  const familyPool = familyLadder.length > 0 ? familyLadder : [primary]
  const crossPool = [...alternatives, ...familyPool]

  const highlight =
    ladderPosition?.lighter ??
    pickByTargetL(familyPool, sampleL + 0.12, primary.id) ??
    pickByTargetL(crossPool, sampleL + 0.15, primary.id)

  const shadow =
    ladderPosition?.darker ??
    pickByTargetL(familyPool, sampleL - 0.12, primary.id) ??
    pickByTargetL(crossPool, sampleL - 0.15, primary.id)

  const anchorDark =
    familyPool[familyPool.length - 1] ??
    pickByTargetL(crossPool, sampleL - 0.22, primary.id)

  const suggestions: SuggestedRenderingSet['suggestions'] = [
    { role: 'base', thread: primary, note: 'Closest in catalog' },
  ]

  if (highlight && highlight.id !== primary.id) {
    suggestions.push({ role: 'highlight', thread: highlight })
  }
  if (shadow && shadow.id !== primary.id) {
    suggestions.push({ role: 'shadow', thread: shadow })
  }
  if (anchorDark && anchorDark.id !== primary.id && anchorDark.id !== shadow?.id) {
    suggestions.push({ role: 'anchor-dark', thread: anchorDark })
  }

  return { suggestions }
}

export function getNeighboringThreadRoles(
  ladderPosition?: ThreadLadderPosition,
): { lighter?: ScoredDMCThread; darker?: ScoredDMCThread } {
  return {
    lighter: ladderPosition?.lighter,
    darker: ladderPosition?.darker,
  }
}
