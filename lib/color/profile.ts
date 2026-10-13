/**
 * What a color is, and which colors sit around it. Pure, React-free, derived from the hex alone.
 * Everything here is calculated on screen in OKLCH; none of it is a paint or thread match.
 */
import { clampChroma, converter, formatHex } from 'culori'
import { getColorTemperature } from '../colorTheory'
import { getPainterChroma } from '../paintingMath'
import { getPerceptualValue } from '../valueScale'
import { hexToRgb } from './conversions'

const toOklch = converter('oklch')

export interface Oklch {
  l: number
  c: number
  h: number
}

export type RelationshipGroup = 'nearby' | 'contrasting'

export interface Relationship {
  id: string
  group: RelationshipGroup
  label: string
  /** One plain sentence on what changes. */
  change: string
  hex: string
  /** Differences from the starting color, in OKLCH units (hue in degrees, shortest way round). */
  delta: { l: number; c: number; h: number }
}

export interface ColorProfile {
  hex: string
  oklch: Oklch
  /** The same 0–10 scale shown elsewhere as "Value". */
  value: number
  /** 0 (gray) to 1 (as strong as a screen color gets). */
  strength: number
  valueWord: string
  strengthLabel: string
  hueName: string
  temperature: 'warm' | 'cool' | 'neutral'
  /** "A warm, mid-value, moderately strong red-orange." */
  description: string
  neutral: boolean
  technical: { label: string; value: string }[]
  relationships: Relationship[]
}

const NEUTRAL_CHROMA = 0.02
const STRONGEST_CHROMA = 0.32
const MIN_VISIBLE_STEP = 0.015
const WARM_HUE = 55
const COOL_HUE = 250

const HUE_NAMES: [number, string][] = [
  [20, 'red'], [45, 'red-orange'], [80, 'orange'], [115, 'yellow'], [140, 'yellow-green'],
  [170, 'green'], [215, 'teal'], [285, 'blue'], [325, 'violet'], [350, 'magenta'], [360, 'red'],
]

export function hueName(h: number): string {
  const hue = ((h % 360) + 360) % 360
  return HUE_NAMES.find(([limit]) => hue < limit)![1]
}

export function valueWord(l: number): string {
  if (l < 0.25) return 'very dark'
  if (l < 0.45) return 'dark'
  if (l < 0.62) return 'mid-value'
  if (l < 0.8) return 'light'
  return 'very light'
}

const wrap = (degrees: number) => ((degrees % 360) + 360) % 360
const shortestAngle = (from: number, to: number) => ((to - from + 540) % 360) - 180
const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places

function oklchOf(hex: string): Oklch | null {
  const color = toOklch(hex)
  if (!color) return null
  return { l: color.l, c: color.c ?? 0, h: Number.isFinite(color.h) ? (color.h as number) : 0 }
}

/** The nearest displayable color to this OKLCH, giving up chroma (never lightness or hue) to fit. */
function displayable({ l, c, h }: Oklch): { hex: string; oklch: Oklch } {
  const clamped = clampChroma({ mode: 'oklch', l: Math.min(1, Math.max(0, l)), c, h }, 'oklch')
  const hex = formatHex(clamped).toUpperCase()
  return { hex, oklch: oklchOf(hex) ?? { l, c, h } }
}

function strengthLabel(c: number): string {
  const label = getPainterChroma(`oklch(0.6 ${c} 0)`).label
  return { Neutral: 'neutral', Muted: 'muted', Moderate: 'moderately strong', Vivid: 'vivid' }[label] ?? 'neutral'
}

function describe(base: Oklch, temperature: ColorProfile['temperature']): string {
  const value = valueWord(base.l)
  if (base.c < NEUTRAL_CHROMA) {
    return value === 'very light' ? 'A near-white neutral.' : value === 'very dark' ? 'A near-black neutral.' : `A neutral ${value} gray.`
  }
  const parts = [temperature === 'neutral' ? null : temperature, value, `${strengthLabel(base.c)} ${hueName(base.h)}`]
  const phrase = parts.filter(Boolean).join(', ')
  return `${/^[aeiou]/i.test(phrase) ? 'An' : 'A'} ${phrase}.`
}

function relationshipsOf(hex: string, base: Oklch): Relationship[] {
  const made: Relationship[] = []
  const seen = new Set([hex])
  const add = (id: string, group: RelationshipGroup, label: string, change: string, target: Oklch, minStep = 0) => {
    const { hex: next, oklch } = displayable(target)
    const delta = { l: oklch.l - base.l, c: oklch.c - base.c, h: shortestAngle(base.h, oklch.h) }
    if (seen.has(next) || Math.hypot(delta.l, delta.c) < minStep) return
    seen.add(next)
    made.push({ id, group, label, change, hex: next, delta: { l: round(delta.l, 3), c: round(delta.c, 3), h: round(delta.h, 1) } })
  }

  const colored = base.c >= NEUTRAL_CHROMA
  add('lighter', 'nearby', 'Lighter', 'Same hue and strength, lighter.', { ...base, l: base.l + 0.12 }, 0.03)
  add('darker', 'nearby', 'Darker', 'Same hue and strength, darker.', { ...base, l: base.l - 0.12 }, 0.03)
  if (colored) {
    add('softer', 'nearby', 'Softer', 'Same hue and lightness, less strong.', { ...base, c: base.c * 0.55 }, MIN_VISIBLE_STEP)
    add('stronger', 'nearby', 'Stronger', 'Same hue and lightness, as strong as the screen allows.', { ...base, c: Math.min(STRONGEST_CHROMA, base.c * 1.5) }, MIN_VISIBLE_STEP)
    for (const [id, label, pole, change] of [
      ['warmer', 'Leans warmer', WARM_HUE, 'The hue turns toward orange.'],
      ['cooler', 'Leans cooler', COOL_HUE, 'The hue turns toward blue.'],
    ] as const) {
      const toward = shortestAngle(base.h, pole)
      if (Math.abs(toward) < 5) continue
      add(id, 'nearby', label, change, { ...base, h: wrap(base.h + Math.sign(toward) * Math.min(20, Math.abs(toward))) })
    }
    add('opposite', 'contrasting', 'Opposite', 'Across the screen color wheel; the strongest contrast.', { ...base, h: wrap(base.h + 180) })
    add('split-a', 'contrasting', 'Split', 'Next to the opposite; contrast with less tension.', { ...base, h: wrap(base.h + 150) })
    add('split-b', 'contrasting', 'Split', 'Next to the opposite; contrast with less tension.', { ...base, h: wrap(base.h + 210) })
  }
  return made
}

export function describeColor(hex: string): ColorProfile | null {
  const rgb = hexToRgb(hex)
  const base = rgb && oklchOf(hex)
  if (!rgb || !base) return null
  const normalized = hex.toUpperCase()
  const temperature = getColorTemperature(rgb)
  const neutral = base.c < NEUTRAL_CHROMA
  const lstar = Math.round(getPerceptualValue(rgb.r, rgb.g, rgb.b) * 100)
  return {
    hex: normalized,
    oklch: base,
    value: Math.round(getPerceptualValue(rgb.r, rgb.g, rgb.b) * 100) / 10,
    strength: Math.min(1, base.c / STRONGEST_CHROMA),
    valueWord: valueWord(base.l),
    strengthLabel: strengthLabel(base.c),
    hueName: neutral ? 'neutral' : hueName(base.h),
    temperature,
    description: describe(base, temperature),
    neutral,
    technical: [
      { label: 'RGB', value: `${rgb.r}, ${rgb.g}, ${rgb.b}` },
      { label: 'OKLCH', value: `${round(base.l, 3)}, ${round(base.c, 3)}, ${neutral ? '—' : `${Math.round(base.h)}°`}` },
      { label: 'Lightness (L*)', value: String(lstar) },
    ],
    relationships: relationshipsOf(normalized, base),
  }
}
