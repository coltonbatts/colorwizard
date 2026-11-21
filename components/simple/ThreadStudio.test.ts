import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { DMCThread, ScoredDMCThread, ThreadMatchResult } from '@/lib/dmc/types'
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
