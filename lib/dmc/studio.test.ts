import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  analyzeValueGaps,
  BROWSE_GROUPS,
  browseGroupOf,
  findBridgeThreads,
  findClosestOwnedThread,
  findSubstituteThreads,
  formatThreadList,
  getBrowseThreads,
  searchDmcThreads,
  sortThreadsByValue,
  threadTone,
  threadValueHex,
} from './studio'
import type { DMCThread } from './types'

const catalog: DMCThread[] = JSON.parse(
  readFileSync(path.join(process.cwd(), 'public/data/dmc-floss.json'), 'utf8'),
)
const byNumber = new Map(catalog.map((thread) => [thread.number, thread]))
const must = (number: string) => {
  const found = byNumber.get(number)
  if (!found) throw new Error(`Missing DMC ${number} in catalog`)
  return found
}

describe('searchDmcThreads', () => {
  it('ranks exact DMC numbers first and ignores a leading DMC prefix', () => {
    expect(searchDmcThreads(catalog, '310')[0]?.number).toBe('310')
    expect(searchDmcThreads(catalog, 'DMC 3713')[0]?.number).toBe('3713')
    expect(searchDmcThreads(catalog, '02')[0]?.number).toBe('02')
  })

  it('understands Blanc as an alias for White', () => {
    expect(searchDmcThreads(catalog, 'Blanc')[0]?.number).toBe('White')
  })

  it('finds multi-word names and families', () => {
    const results = searchDmcThreads(catalog, 'beaver gray')
    expect(results.length).toBeGreaterThanOrEqual(4)
    expect(results.every((t) => t.name.toLowerCase().includes('beaver'))).toBe(true)
  })

  it('returns empty for blank input', () => {
    expect(searchDmcThreads(catalog, '   ')).toEqual([])
  })
})

describe('browse groups and warm/cool grays', () => {
  it('places every single thread in the 488-thread catalog into a known browse group', () => {
    const valid = new Set(BROWSE_GROUPS.map((g) => g.id))
    for (const thread of catalog) {
      expect(valid.has(browseGroupOf(thread))).toBe(true)
    }
    const total = BROWSE_GROUPS.reduce((sum, group) => sum + getBrowseThreads(catalog, group.id).length, 0)
    expect(total).toBe(catalog.length)
  })

  it('separates warm, neutral, and cool grays cleanly for monochrome work', () => {
    const warm = getBrowseThreads(catalog, 'grays', 'warm').map((t) => t.number)
    const neutral = getBrowseThreads(catalog, 'grays', 'neutral').map((t) => t.number)
    const cool = getBrowseThreads(catalog, 'grays', 'cool').map((t) => t.number)
    expect(warm).toContain('646') // Beaver Gray Dk
    expect(warm).toContain('Ecru')
    expect(neutral).toContain('White')
    expect(neutral).toContain('02') // Tin
    expect(cool).toContain('318') // Steel Gray Lt
    expect(cool).toContain('317') // Pewter Gray
  })

  it('does not misclassify muted blue-greens as warm tones', () => {
    expect(threadTone(must('3813'))).toBe('cool') // Blue Green Lt
    expect(threadTone(must('3817'))).toBe('cool') // Celadon Green Lt
    expect(threadTone(must('648'))).toBe('warm') // Beaver Gray Lt
    expect(threadTone(must('317'))).toBe('cool') // Pewter Gray
  })

  it('orders browse groups lightest to darkest', () => {
    const grays = getBrowseThreads(catalog, 'grays')
    for (let i = 1; i < grays.length; i++) {
      expect(grays[i - 1].oklab.L).toBeGreaterThanOrEqual(grays[i].oklab.L)
    }
  })
})

describe('findSubstituteThreads & findClosestOwnedThread', () => {
  it('returns nearest DMC substitutes without repeating the thread itself', () => {
    const target = must('3830')
    const subs = findSubstituteThreads(target, catalog, 5)
    expect(subs).toHaveLength(5)
    expect(subs.every((t) => t.id !== target.id)).toBe(true)
    for (let i = 1; i < subs.length; i++) {
      expect(subs[i - 1].deltaE00).toBeLessThanOrEqual(subs[i].deltaE00)
    }
  })

  it('finds the closest owned thread when stash is present and returns null when empty', () => {
    const sample = must('3713').rgb
    expect(findClosestOwnedThread(sample, catalog, [])).toBeNull()
    const owned = findClosestOwnedThread(sample, catalog, ['310', '761', 'White'])
    expect(owned?.number).toBe('761')
  })
})

describe('findBridgeThreads', () => {
  it('finds an intermediate value thread strictly between a light and dark shade', () => {
    const light = must('762') // Pearl Gray Vy Lt
    const dark = must('317') // Pewter Gray
    const bridges = findBridgeThreads(light, dark, catalog, { count: 5 })
    expect(bridges.length).toBeGreaterThan(0)
    for (const candidate of bridges) {
      expect(candidate.thread.oklab.L).toBeLessThan(light.oklab.L)
      expect(candidate.thread.oklab.L).toBeGreaterThan(dark.oklab.L)
      expect(candidate.position).toBeGreaterThanOrEqual(0.12)
      expect(candidate.position).toBeLessThanOrEqual(0.88)
    }
  })

  it('honors sameTone so monochrome gray blends stay warm or cool', () => {
    const lightWarm = must('3024') // Brown Gray Vy Lt (warm)
    const darkWarm = must('3021') // Brown Gray Vy Dk (warm)
    const bridges = findBridgeThreads(lightWarm, darkWarm, catalog, { count: 5, sameTone: true })
    expect(bridges.length).toBeGreaterThan(0)
    expect(bridges.every((c) => threadTone(c.thread) === 'warm')).toBe(true)
  })

  it('returns empty when endpoints are identical', () => {
    const t = must('310')
    expect(findBridgeThreads(t, t, catalog)).toEqual([])
  })
})

describe('value helpers & thread list export', () => {
  it('computes perceptual grayscale hexes where light threads are lighter than dark ones', () => {
    const white = threadValueHex(must('White').rgb)
    const black = threadValueHex(must('310').rgb)
    expect(white).toMatch(/^#([0-9A-F]{2})\1\1$/)
    expect(black).toMatch(/^#([0-9A-F]{2})\1\1$/)
    expect(parseInt(white.slice(1, 3), 16)).toBeGreaterThan(parseInt(black.slice(1, 3), 16))
  })

  it('sorts threads light to dark and flags wide value jumps vs very close values', () => {
    const sorted = sortThreadsByValue([must('310'), must('White'), must('415'), must('318')])
    expect(sorted[0].number).toBe('White')
    expect(sorted[sorted.length - 1].number).toBe('310')
    const gaps = analyzeValueGaps(sorted)
    expect(gaps.some((g) => g.kind === 'jump')).toBe(true)
    expect(gaps.some((g) => g.kind === 'close')).toBe(true) // 415 and 318 share L = 0.6764
  })

  it('formats a clean store-ready thread list', () => {
    const text = formatThreadList(
      [
        { number: '310', name: 'Black', owned: true, note: 'pupils' },
        { number: '646', name: 'Beaver Gray Dk', owned: false },
      ],
      { title: 'Portrait pull', includeChecklist: true },
    )
    expect(text).toBe('Portrait pull\n[x] DMC 310 — Black (pupils)\n[ ] DMC 646 — Beaver Gray Dk')
  })
})
