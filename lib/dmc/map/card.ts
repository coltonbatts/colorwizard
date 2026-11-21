/**
 * Pure printable 1-page Studio Thread Map data model.
 * Reuses Paint Plan's page geometry (718 × 980 CSS px inside 10 mm margins, fitting Letter and A4)
 * and purity-based badge placement (`placeLabels`). Pure, deterministic, React-free.
 */

import { CARD } from '@/lib/paint/plan/card'
import { placeLabels } from '@/lib/paint/plan/labels'
import { formatThreadTone, threadTone } from '../studio'
import {
  describeSlotMeta,
  describeThreadMap,
  formatThreadMapModeLabel,
  formatThreadShare,
  THREAD_MAP_CAVEAT_CATALOG,
  THREAD_MAP_CAVEAT_COPY,
  THREAD_MAP_CAVEAT_REAL,
  THREAD_MAP_PRINT_CAVEAT,
  type ThreadMapFact,
} from './mapFit'
import type { ThreadMapResult } from './types'

export { CARD as THREAD_MAP_CARD }

export interface ThreadMapBadge {
  /** 1-based badge number (Light → Dark). */
  number: number
  /** Center in pixels of the thread map (viewBox 0 0 map.width map.height). */
  x: number
  y: number
}

export interface ThreadMapCardCell {
  /** 1-based badge number (Light → Dark). */
  number: number
  dmcNumber: string
  name: string
  swatchHex: string
  tone: string
  share: string
  detail: string
  owned: boolean
  approximate: boolean
}

export interface ThreadMapCardModel {
  title: string
  metaLine: string
  headline: string
  notes: string[]
  facts: ThreadMapFact[]
  image: { width: number; height: number }
  map: { width: number; height: number }
  badges: ThreadMapBadge[]
  badgeRadius: number
  badgeFont: number
  unlabeled: number[]
  unlabeledNote: string | null
  orderNote: string
  columns: [ThreadMapCardCell[], ThreadMapCardCell[]]
  caveats: string[]
}

export interface BuildThreadMapCardOptions {
  pictureName?: string
  modeLabel?: string
  dateText: string
  ownedNumbers?: readonly string[]
}

function cleanTitle(pictureName: string | undefined): string {
  const cleaned = (pictureName ?? '')
    .replace(/\.[^.]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || 'DMC Thread Map'
}

export function buildThreadMapCard(
  map: ThreadMapResult,
  options: BuildThreadMapCardOptions,
): ThreadMapCardModel {
  const aspect = map.width / map.height
  const width = Math.min(CARD.imageMaxWidth, CARD.imageMaxHeight * aspect)
  const image = {
    width: Math.round(width * 100) / 100,
    height: Math.round((width / aspect) * 100) / 100,
  }
  const scale = map.width / image.width

  const placed = placeLabels(map.slot, map.width, map.height, map.slots.length, {
    radius: CARD.badgeRadius * scale,
    minPurity: 0.6,
    surround: 1.4,
  })
  const badges: ThreadMapBadge[] = placed.labels.map((label) => ({
    number: label.pile + 1,
    x: label.x + 0.5,
    y: label.y + 0.5,
  }))
  const unlabeled = placed.unlabeled.map((slotIndex) => slotIndex + 1)

  const summary = describeThreadMap(map)
  const ownedSet = new Set((options.ownedNumbers ?? []).map((n) => n.trim().toLowerCase()))

  const cells: ThreadMapCardCell[] = map.slots.map((slot) => ({
    number: slot.index + 1,
    dmcNumber: slot.thread.number,
    name: slot.thread.name,
    swatchHex: slot.thread.hex,
    tone: formatThreadTone(threadTone(slot.thread)),
    share: formatThreadShare(slot.area),
    detail: describeSlotMeta(slot, map.mode),
    owned: ownedSet.has(slot.thread.number.toLowerCase()),
    approximate: slot.thread.colorConfidence === 'approximate',
  }))

  const split = Math.ceil(cells.length / 2)
  const modeLabel = options.modeLabel ?? formatThreadMapModeLabel(map)

  return {
    title: cleanTitle(options.pictureName),
    metaLine: ['DMC Mouliné Spécial', modeLabel, options.dateText].join(' · '),
    headline: summary.headline,
    notes: summary.notes,
    facts: summary.facts,
    image,
    map: { width: map.width, height: map.height },
    badges,
    badgeRadius: CARD.badgeRadius * scale,
    badgeFont: CARD.badgeFont * scale,
    unlabeled,
    unlabeledNote: unlabeled.length > 0
      ? `Thread ${unlabeled.join(', ')} ${unlabeled.length === 1 ? 'has' : 'have'} no room for a number on the picture.`
      : null,
    orderNote: 'Ordered lightest to darkest · [x] in your floss box · [ ] needed',
    columns: [cells.slice(0, split), cells.slice(split)],
    caveats: [
      THREAD_MAP_CAVEAT_CATALOG,
      THREAD_MAP_CAVEAT_REAL,
      THREAD_MAP_PRINT_CAVEAT,
      THREAD_MAP_CAVEAT_COPY,
    ],
  }
}
