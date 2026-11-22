/**
 * Plain-English scoring, facts, honest caveats, and swap-picker helpers for Thread Maps.
 * Pure, deterministic, React-free.
 *
 * Wording aligns with BASES.thread (lib/color/basis.ts): never claims "exact" or "verified",
 * and flags catalog colors marked `approximate`.
 */

import { NOT_VERIFIED } from '@/lib/color/basis'
import { findClosestOwnedThread, findSubstituteThreads, formatThreadTone, threadTone } from '../studio'
import type { DMCThread, ScoredDMCThread } from '../types'
import { MONOCHROME_TONES, type MonochromeTone, type ThreadMapResult } from './types'

export const THREAD_MAP_CAVEAT_CATALOG =
  `DMC does not publish color values; colors here are measured from DMC’s product photos. ${NOT_VERIFIED}`

export const THREAD_MAP_CAVEAT_REAL =
  'Real thread shifts with dye lot, sheen, stitch direction, strand count, fabric color, and lighting.'

export const THREAD_MAP_CAVEAT_COPY =
  'Measured in this browser on a scaled copy of your photo (up to 1024 px in Crisp). Nothing is uploaded.'

export const THREAD_MAP_PRINT_CAVEAT =
  'Colors on paper and screens are approximate. Check real skeins in your stitching light before starting.'

export const THREAD_MAP_PRINT_NOTE =
  'One page, Letter or A4, grayscale safe. In the print dialog, Save as PDF keeps a copy.'

export type ThreadMapVerdict = 'close' | 'fair' | 'rough' | 'poor'

export interface ThreadMapFact {
  label: string
  value: string
}

export interface ThreadMapSummary {
  verdict: ThreadMapVerdict
  headline: string
  notes: string[]
  facts: ThreadMapFact[]
}

export function formatThreadShare(share: number): string {
  if (!Number.isFinite(share) || share <= 0) return '—'
  if (share < 0.005) return '<1%'
  return `${Math.round(share * 100)}%`
}

export function formatThreadDeltaE(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return value < 10 ? value.toFixed(1) : Math.round(value).toString()
}

export function formatValueStep(deltaL: number): string {
  if (!Number.isFinite(deltaL)) return '—'
  return `${(deltaL * 100).toFixed(1)}% L`
}

export function tonePresetLabel(tone: MonochromeTone | null): string {
  return MONOCHROME_TONES.find((preset) => preset.id === tone)?.label ?? 'Warm grays'
}

export function formatThreadMapModeLabel(map: Pick<ThreadMapResult, 'mode' | 'monochromeTone' | 'slots' | 'budget'>): string {
  const count = map.slots.length
  const countText = count < map.budget ? `${count} of ${map.budget} threads` : `${count} ${count === 1 ? 'thread' : 'threads'}`
  if (map.mode === 'monochrome') {
    return `${tonePresetLabel(map.monochromeTone)} · ${countText}`
  }
  return `Full color · ${countText}`
}

/** Suggests a clean Skein Tray pull name (capped to ColorLibrary's 40-char collection limit). */
export function buildPullName(
  pictureName: string | undefined,
  map: Pick<ThreadMapResult, 'mode' | 'monochromeTone' | 'slots'>,
  existingNames: readonly string[] = [],
): string {
  const base = (pictureName ?? '')
    .replace(/\.[^.]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
  const suffix = map.mode === 'monochrome'
    ? tonePresetLabel(map.monochromeTone)
    : 'Thread map'
  const raw = base ? `${base} · ${suffix}` : `DMC ${suffix}`
  const existing = new Set(existingNames.map((n) => n.trim().toLowerCase()))

  const fit = (text: string, tail = ''): string => {
    const maxMain = 40 - tail.length
    const clipped = text.length > maxMain ? `${text.slice(0, Math.max(1, maxMain - 1)).trimEnd()}…` : text
    return `${clipped}${tail}`
  }

  const first = fit(raw)
  if (!existing.has(first.toLowerCase())) return first

  for (let n = 2; n <= 99; n++) {
    const candidate = fit(raw, ` ${n}`)
    if (!existing.has(candidate.toLowerCase())) return candidate
  }
  return fit(raw)
}

export function describeThreadMap(map: ThreadMapResult): ThreadMapSummary {
  const { score, slots, budget, mode } = map
  const used = slots.length
  const notes: string[] = []

  if (mode === 'monochrome') {
    const toneLabel = tonePresetLabel(map.monochromeTone)
    const verdict: ThreadMapVerdict =
      score.meanDeltaL < 0.045 ? 'close' : score.meanDeltaL < 0.075 ? 'fair' : 'rough'
    const headline =
      verdict === 'close'
        ? 'Smooth tonal ramp'
        : verdict === 'fair'
          ? 'Clear value planes'
          : 'Bold tonal study'

    notes.push(
      `Mapped by lightness into ${used} ${toneLabel.toLowerCase()} skeins, ordered lightest to darkest. Average value step error is ${formatValueStep(score.meanDeltaL)}.`,
    )
    if (score.approximateThreads > 0) {
      notes.push(
        `${score.approximateThreads} ${score.approximateThreads === 1 ? 'thread has' : 'threads have'} an approximate catalog color and may shift more in person.`,
      )
    }

    const lowL = Math.round(map.imageOklabLRange.min * 100)
    const highL = Math.round(map.imageOklabLRange.max * 100)

    return {
      verdict,
      headline,
      notes,
      facts: [
        { label: 'Ramp', value: toneLabel },
        { label: 'Skeins', value: `${used} steps` },
        { label: 'Avg value diff', value: formatValueStep(score.meanDeltaL) },
        { label: 'Photo values', value: `${lowL}–${highL}% L` },
      ],
    }
  }

  const verdict: ThreadMapVerdict =
    score.visiblyOffArea < 0.1
      ? 'close'
      : score.visiblyOffArea < 0.3
        ? 'fair'
        : score.visiblyOffArea < 0.6
          ? 'rough'
          : 'poor'

  const headline =
    verdict === 'close'
      ? 'A close thread map'
      : verdict === 'fair'
        ? 'A fair thread map'
        : verdict === 'rough'
          ? 'A broad thread map'
          : 'A simplified thread map'

  notes.push(
    `${formatThreadShare(score.visiblyOffArea)} of the photo is more than ΔE 5 from its assigned skein, a visible difference. The average difference is ΔE ${formatThreadDeltaE(score.meanDeltaE00)}.`,
  )
  if (score.approximateThreads > 0) {
    notes.push(
      `${score.approximateThreads} ${score.approximateThreads === 1 ? 'thread has' : 'threads have'} an approximate catalog color, so ${score.approximateThreads === 1 ? 'it' : 'they'} may look further off in person.`,
    )
  }
  if (used < budget) {
    notes.push(`More skeins wouldn’t improve this photo much, so it uses ${used} of ${budget} threads.`)
  }

  return {
    verdict,
    headline,
    notes,
    facts: [
      { label: 'Skeins', value: used < budget ? `${used} of ${budget}` : `${used}` },
      { label: 'Average diff', value: `ΔE ${formatThreadDeltaE(score.meanDeltaE00)}` },
      { label: 'Visibly off', value: formatThreadShare(score.visiblyOffArea) },
      { label: 'Avg value diff', value: formatValueStep(score.meanDeltaL) },
    ],
  }
}

export interface SwapOptions {
  lighter: DMCThread[]
  darker: DMCThread[]
  closestOwned: ScoredDMCThread | null
  substitutes: ScoredDMCThread[]
}

/**
 * Computes compact swap options for a thread slot:
 * lighter/darker steps in its DMC family ladder, closest owned thread, and closest DMC substitutes.
 */
export function getSwapOptions(
  current: DMCThread,
  allThreads: readonly DMCThread[],
  ownedNumbers: readonly string[],
  otherSlotNumbers: readonly string[] = [],
): SwapOptions {
  const usedElsewhere = new Set(otherSlotNumbers.map((n) => n.toLowerCase()))
  const family = allThreads
    .filter((t) => t.familyId === current.familyId)
    .sort((a, b) => b.oklab.L - a.oklab.L)
  const pos = family.findIndex((t) => t.id === current.id)

  const lighter = pos > 0
    ? family.slice(Math.max(0, pos - 2), pos).filter((t) => !usedElsewhere.has(t.number.toLowerCase())).reverse()
    : []
  const darker = pos >= 0 && pos < family.length - 1
    ? family.slice(pos + 1, pos + 3).filter((t) => !usedElsewhere.has(t.number.toLowerCase()))
    : []

  const closestOwnedRaw = findClosestOwnedThread(current.rgb, allThreads, ownedNumbers, current.number)
  const closestOwned = closestOwnedRaw && !usedElsewhere.has(closestOwnedRaw.number.toLowerCase())
    ? closestOwnedRaw
    : null

  const seen = new Set<string>([
    current.number.toLowerCase(),
    ...usedElsewhere,
    ...lighter.map((t) => t.number.toLowerCase()),
    ...darker.map((t) => t.number.toLowerCase()),
  ])
  if (closestOwned) seen.add(closestOwned.number.toLowerCase())

  const substitutes = findSubstituteThreads(current, allThreads, 16)
    .filter((t) => !seen.has(t.number.toLowerCase()))
    .slice(0, 6)

  return { lighter, darker, closestOwned, substitutes }
}

/** Concise one-line tone + fit summary for a slot row or printed cell. */
export function describeSlotMeta(
  slot: ThreadMapResult['slots'][number],
  mode: ThreadMapResult['mode'],
): string {
  const tone = formatThreadTone(threadTone(slot.thread))
  const metric = mode === 'monochrome'
    ? `L ${Math.round(slot.thread.oklab.L * 100)}%`
    : Number.isFinite(slot.meanDeltaE00)
      ? `ΔE ${formatThreadDeltaE(slot.meanDeltaE00)}`
      : 'Unused'
  const parts = [tone, metric]
  if (slot.thread.colorConfidence === 'approximate') parts.push('Approximate')
  return parts.join(' · ')
}
