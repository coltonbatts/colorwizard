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

export type ThreadMapCardVariant = 'color-map' | 'transfer-outline'

export interface ThreadMapCardModel {
  variant: ThreadMapCardVariant
  mirror: boolean
  showNumbers: boolean
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
  /** 2 columns for Color Map, 3 compact columns for B&W Transfer Outline. */
  keyColumns: ThreadMapCardCell[][]
  caveats: string[]
}

export interface BuildThreadMapCardOptions {
  variant?: ThreadMapCardVariant
  mirror?: boolean
  showNumbers?: boolean
  pictureName?: string
  modeLabel?: string
  dateText: string
  ownedNumbers?: readonly string[]
}

const OUTLINE_MAX_WIDTH = CARD.pageWidth - 2 // 716px inside 1px border
const OUTLINE_MAX_HEIGHT = 560
const OUTLINE_MIN_HEIGHT = 380

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
  const variant: ThreadMapCardVariant = options.variant ?? 'color-map'
  const mirror = variant === 'transfer-outline' && Boolean(options.mirror)
  const showNumbers = variant === 'transfer-outline' ? (options.showNumbers ?? true) : true

  const aspect = map.width / map.height
  let image: { width: number; height: number }
  if (variant === 'transfer-outline') {
    const keyRows = Math.ceil(map.slots.length / 3)
    const maxHeight = Math.max(OUTLINE_MIN_HEIGHT, Math.min(OUTLINE_MAX_HEIGHT, 760 - keyRows * 20))
    const width = Math.min(OUTLINE_MAX_WIDTH, maxHeight * aspect)
    image = {
      width: Math.round(width * 100) / 100,
      height: Math.round((width / aspect) * 100) / 100,
    }
  } else {
    const width = Math.min(CARD.imageMaxWidth, CARD.imageMaxHeight * aspect)
    image = {
      width: Math.round(width * 100) / 100,
      height: Math.round((width / aspect) * 100) / 100,
    }
  }

  const scale = map.width / image.width
  const badgeRadiusCss = variant === 'transfer-outline' ? 7 : CARD.badgeRadius
  const badgeFontCss = variant === 'transfer-outline' ? 8.5 : CARD.badgeFont

  let badges: ThreadMapBadge[] = []
  let unlabeled: number[] = []
  if (showNumbers) {
    const placed = placeLabels(map.slot, map.width, map.height, map.slots.length, {
      radius: badgeRadiusCss * scale,
      minPurity: 0.6,
      surround: 1.4,
    })
    badges = placed.labels.map((label) => ({
      number: label.pile + 1,
      x: mirror ? map.width - (label.x + 0.5) : label.x + 0.5,
      y: label.y + 0.5,
    }))
    unlabeled = placed.unlabeled.map((slotIndex) => slotIndex + 1)
  }

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
  const columns: [ThreadMapCardCell[], ThreadMapCardCell[]] = [cells.slice(0, split), cells.slice(split)]
  let keyColumns: ThreadMapCardCell[][]
  if (variant === 'transfer-outline') {
    const colCount = cells.length > 8 ? 3 : 2
    const perCol = Math.ceil(cells.length / colCount)
    keyColumns = Array.from({ length: colCount }, (_, idx) =>
      cells.slice(idx * perCol, (idx + 1) * perCol),
    ).filter((col) => col.length > 0)
  } else {
    keyColumns = columns
  }

  const modeLabel = options.modeLabel ?? formatThreadMapModeLabel(map)
  const metaParts = variant === 'transfer-outline'
    ? ['DMC Mouliné Spécial', mirror ? 'Transfer outline (mirrored)' : 'Transfer outline', modeLabel, options.dateText]
    : ['DMC Mouliné Spécial', modeLabel, options.dateText]

  return {
    variant,
    mirror,
    showNumbers,
    title: cleanTitle(options.pictureName),
    metaLine: metaParts.join(' · '),
    headline: summary.headline,
    notes: summary.notes,
    facts: summary.facts,
    image,
    map: { width: map.width, height: map.height },
    badges,
    badgeRadius: badgeRadiusCss * scale,
    badgeFont: badgeFontCss * scale,
    unlabeled,
    unlabeledNote: unlabeled.length > 0
      ? `Thread ${unlabeled.join(', ')} ${unlabeled.length === 1 ? 'has' : 'have'} no room for a number on the picture.`
      : null,
    orderNote: variant === 'transfer-outline'
      ? (mirror
        ? 'Mirrored horizontally for back-of-fabric or iron-on transfer · Ordered lightest to darkest · [x] have · [ ] need'
        : 'Ordered lightest to darkest · Numbers match the outline above · [x] in your floss box · [ ] needed')
      : 'Ordered lightest to darkest · [x] in your floss box · [ ] needed',
    columns,
    keyColumns,
    caveats: [
      THREAD_MAP_CAVEAT_CATALOG,
      THREAD_MAP_CAVEAT_REAL,
      THREAD_MAP_PRINT_CAVEAT,
      THREAD_MAP_CAVEAT_COPY,
    ],
  }
}
