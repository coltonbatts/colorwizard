import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ThreadMapResult } from '@/lib/dmc/map/types'
import type { DMCThread, ScoredDMCThread, ThreadMatchResult } from '@/lib/dmc/types'
import ThreadMapPanel from './ThreadMapPanel'
import { BridgeFinderCard, ThreadDetailCard, ThreadMatchCard } from './ThreadStudio'

const makeThread = (
  number: string,
  name: string,
  hex: string,
  L: number,
  deltaE00 = 1.4,
  confidence: 'measured' | 'approximate' = 'measured',
): ScoredDMCThread => ({
  id: `dmc:${number}`,
  brand: 'dmc',
  number,
  name,
  rgb: { r: 160, g: 120, b: 110 },
  hex,
  colorConfidence: confidence,
  productLine: 'mouline-solid',
  familyId: 'beaver-gray',
  familyLabel: 'Beaver Gray',
  shadeStep: 'medium',
  shadeRank: 1,
  familySize: 3,
  oklab: { L, a: 0.002, b: 0.014 },
  hueBucket: 'neutral',
  warmth: 'warm',
  deltaE00,
  confidenceLabel: 'Close match',
  confidenceColor: '',
  confidenceBgColor: '',
})

const light = makeThread('648', 'Beaver Gray Lt', '#B0A69E', 0.71, 6.2)
const mid = makeThread('647', 'Beaver Gray Med', '#8A8178', 0.59, 1.4)
const dark = makeThread('646', 'Beaver Gray Dk', '#6B625A', 0.48, 5.1)
const owned = makeThread('3023', 'Brown Gray Light', '#9D9383', 0.67, 2.8)

const matchResult: ThreadMatchResult = {
  primary: mid,
  sameFamily: [mid, dark, light],
  familyLadder: [light, mid, dark],
  alternatives: [owned],
  topMatches: [mid, owned, dark],
  sampleValue: {
    oklabL: 0.45,
    normalizedPosition: 32,
    band: 'dark',
    bandLabel: 'Dark',
    renderingRole: 'dark',
  },
  valueWarnings: [
    {
      code: 'hue-match-too-light',
      severity: 'caution',
      message: 'Hue is close, but this thread reads lighter than your shadow sample — form may flatten.',
    },
  ],
  suggestedSet: {
    suggestions: [
      { role: 'base', thread: mid, note: 'Closest in catalog' },
      { role: 'highlight', thread: light },
      { role: 'shadow', thread: dark },
    ],
  },
}

describe('ThreadMatchCard', () => {
  const renderMatch = (overrides: Partial<Parameters<typeof ThreadMatchCard>[0]> = {}) =>
    renderToStaticMarkup(createElement(ThreadMatchCard, {
      hex: '#847B72',
      threads: matchResult,
      shown: mid,
      shownCatalogThread: mid,
      closestOwned: owned,
      stale: false,
      failed: false,
      copied: false,
      savedInTray: false,
      inBox: false,
      canSave: true,
      runSavedCount: null,
      onCopy: () => undefined,
      onSave: () => undefined,
      onSaveRun: () => undefined,
      onToggleBox: () => undefined,
      onChoose: () => undefined,
      onInspectInBrowse: () => undefined,
      ...overrides,
    }))

  it('shows the DMC match, photo value band, shading run, ladder, value warning, and closest owned thread', () => {
    const html = renderMatch()
    expect(html).toContain('DMC 647')
    expect(html).toContain('Beaver Gray Med')
    expect(html).toContain('Dark in photo')
    expect(html).toContain('reads lighter than your shadow sample')
    expect(html).toContain('Closest in your box: DMC 3023')
    expect(html).toContain('Shading run')
    expect(html).toContain('Lighter')
    expect(html).toContain('Darker')
    expect(html).toContain('aria-label="Sampled #847B72, DMC 647 #8A8178"')
  })

  it('never says exact and always includes the thread basis note', () => {
    const html = renderMatch()
    expect(html).not.toMatch(/exact/i)
    expect(html).toContain('data-topic="thread"')
  })

  it('flags approximate catalog colors clearly', () => {
    const approx = makeThread('647', 'Beaver Gray Med', '#8A8178', 0.59, 1.4, 'approximate')
    const html = renderMatch({ shown: approx, shownCatalogThread: approx })
    expect(html).toContain('Approximate color')
    expect(html).toContain('may be further off')
  })
})

describe('ThreadDetailCard', () => {
  it('renders skein details, family ladder, substitutes, and basis note without claiming exact', () => {
    const html = renderToStaticMarkup(createElement(ThreadDetailCard, {
      thread: mid as DMCThread,
      familyLadder: [light, mid, dark],
      substitutes: [owned],
      closestOwned: owned,
      copied: false,
      inTray: false,
      inBox: true,
      canSave: true,
      onCopy: () => undefined,
      onAddToTray: () => undefined,
      onToggleBox: () => undefined,
      onStartBridge: () => undefined,
      onSelectThread: () => undefined,
    }))
    expect(html).toContain('DMC 647')
    expect(html).toContain('Closest DMC substitutes')
    expect(html).toContain('DMC 3023')
    expect(html).toContain('In my box')
    expect(html).toContain('data-topic="thread"')
    expect(html).not.toMatch(/exact/i)
  })
})

describe('BridgeFinderCard', () => {
  it('renders both endpoints and intermediate bridge threads', () => {
    const html = renderToStaticMarkup(createElement(BridgeFinderCard, {
      from: light,
      to: dark,
      sameTone: true,
      candidates: [{ thread: mid, position: 0.5, deviation: 0.002, score: 0.002 }],
      inTrayNumbers: new Set<string>(),
      canSave: true,
      onToggleSameTone: () => undefined,
      onAddCandidate: () => undefined,
      onInspectCandidate: () => undefined,
      onClose: () => undefined,
    }))
    expect(html).toContain('DMC 648')
    expect(html).toContain('DMC 646')
    expect(html).toContain('DMC 647')
    expect(html).toContain('Same tone only')
    expect(html).toContain('aria-pressed="true"')
  })
})

describe('ThreadMapPanel', () => {
  const sampleMap: ThreadMapResult = {
    mode: 'full-color',
    budget: 10,
    monochromeTone: null,
    preferBox: false,
    width: 4,
    height: 4,
    slots: [
      { index: 0, thread: light, area: 0.4, meanDeltaE00: 1.8, meanDeltaL: 0.02, targetHex: '#B0A69E', swapped: false },
      { index: 1, thread: makeThread('647', 'Beaver Gray Med', '#8A8178', 0.59, 2.4, 'approximate'), area: 0.35, meanDeltaE00: 2.4, meanDeltaL: 0.03, targetHex: '#8A8178', swapped: false },
      { index: 2, thread: dark, area: 0.25, meanDeltaE00: 3.1, meanDeltaL: 0.04, targetHex: '#6B625A', swapped: false },
    ],
    slot: new Uint8Array(16),
    visiblyOff: new Uint8Array(16),
    score: {
      threadCount: 3,
      meanDeltaE00: 2.3,
      p95DeltaE00: 4.1,
      meanDeltaL: 0.028,
      visiblyOffArea: 0.06,
      approximateThreads: 1,
    },
    imageOklabLRange: { min: 0.45, max: 0.74 },
    ms: 12,
  }

  const baseProps = {
    source: {} as HTMLCanvasElement,
    pictureName: 'portrait.jpg',
    state: {
      status: 'ready' as const,
      result: sampleMap,
      hasSwaps: false,
      error: null,
      swapThread: () => undefined,
      resetSwaps: () => undefined,
    },
    mode: 'full-color' as const,
    onModeChange: () => undefined,
    fullColorBudget: 10 as const,
    onFullColorBudgetChange: () => undefined,
    monochromeBudget: 7 as const,
    onMonochromeBudgetChange: () => undefined,
    monochromeTone: 'warm-grays' as const,
    onMonochromeToneChange: () => undefined,
    preferBox: false,
    onPreferBoxChange: () => undefined,
    selectedSlot: null,
    onSelectSlot: () => undefined,
    markMisses: true,
    onMarkMissesChange: () => undefined,
    allThreads: [light, mid, dark, owned],
    stash: ['648'],
    onToggleStash: () => undefined,
    canSave: true,
    onSendPullToTray: () => 'portrait · Map (3)',
    onChoosePicture: () => undefined,
  }

  it('invites opening a photo when no source is open', () => {
    const html = renderToStaticMarkup(createElement(ThreadMapPanel, { ...baseProps, source: null }))
    expect(html).toContain('Build a painterly Thread Map')
    expect(html).toContain('Open reference photo')
    expect(html).not.toMatch(/exact/i)
  })

  it('renders Full Color controls, thread key, approximate badge, actions, and thread basis note without saying exact', () => {
    const html = renderToStaticMarkup(createElement(ThreadMapPanel, baseProps))
    expect(html).toContain('Full color')
    expect(html).toContain('Monochrome')
    expect(html).toContain('Prefer my box')
    expect(html).toContain('Hatch what’s visibly off')
    expect(html).toContain('DMC 648')
    expect(html).toContain('DMC 647')
    expect(html).toContain('DMC 646')
    expect(html).toContain('Approx')
    expect(html).toContain('Send pull to Skein Tray')
    expect(html).toContain('Print Thread Map')
    expect(html).toContain('data-topic="thread"')
    expect(html).not.toMatch(/\bexact\b/i)
    expect(html).not.toMatch(/\bverified\b/i)
  })

  it('renders Monochrome tone presets and step budgets cleanly', () => {
    const monoMap: ThreadMapResult = {
      ...sampleMap,
      mode: 'monochrome',
      budget: 7,
      monochromeTone: 'warm-grays',
      score: { ...sampleMap.score, visiblyOffArea: 0 },
    }
    const html = renderToStaticMarkup(createElement(ThreadMapPanel, {
      ...baseProps,
      mode: 'monochrome',
      state: { ...baseProps.state, result: monoMap },
    }))
    expect(html).toContain('Warm grays')
    expect(html).toContain('Neutral grays')
    expect(html).toContain('Cool grays')
    expect(html).toContain('Sepia &amp; browns')
    expect(html).toContain('5 skeins')
    expect(html).toContain('7 skeins')
    expect(html).toContain('9 skeins')
    expect(html).not.toContain('Hatch what’s visibly off')
    expect(html).toContain('data-topic="thread"')
    expect(html).not.toMatch(/\bexact\b/i)
  })
})
