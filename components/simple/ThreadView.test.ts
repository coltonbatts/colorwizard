import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { closeThreads } from '@/lib/dmc/threadFit'
import type { ScoredDMCThread, ThreadMatchResult } from '@/lib/dmc/types'
import { ThreadCard } from './ThreadView'

const thread = (number: string, deltaE00: number, confidence: 'measured' | 'approximate' = 'measured') => ({
  id: `dmc-${number}`,
  number,
  name: `Thread ${number}`,
  hex: '#C45C3E',
  deltaE00,
  colorConfidence: confidence,
}) as ScoredDMCThread

const primary = thread('3830', 1.2)
const match = {
  primary,
  topMatches: [primary, thread('356', 3), thread('3778', 4)],
  alternatives: [thread('356', 3), thread('922', 6), thread('921', 7), thread('920', 8)],
  familyLadder: [thread('3779', 9), primary, thread('355', 8)],
} as unknown as ThreadMatchResult

const card = (overrides: Partial<Parameters<typeof ThreadCard>[0]> = {}) => renderToStaticMarkup(createElement(ThreadCard, {
  hex: '#C45C3E',
  threads: match,
  shown: primary,
  stale: false,
  failed: false,
  copied: false,
  saveLabel: 'Save',
  canSave: true,
  onCopy: () => undefined,
  onSave: () => undefined,
  onChoose: () => undefined,
  ...overrides,
}))

describe('closeThreads', () => {
  it('lists the next-best threads once each, without the primary', () => {
    expect(closeThreads(match).map((t) => t.number)).toEqual(['356', '3778', '922', '921'])
  })
})

describe('ThreadCard markup', () => {
  it('gives the number, the name and how close it is', () => {
    const out = card()
    expect(out).toContain('DMC 3830')
    expect(out).toContain('Thread 3830')
    expect(out).toContain('Hard to tell apart on screen')
  })

  it('never says exact, and keeps saying how the match was found', () => {
    const out = card()
    expect(out).not.toMatch(/exact/i)
    expect(out).toContain('data-topic="thread"')
  })

  it('shows the sampled color and the thread side by side', () => {
    expect(card({ shown: match.topMatches[1] })).toContain('aria-label="Sampled #C45C3E, DMC 356 #C45C3E"')
  })

  it('offers the nearest thread first, so a thread being tried can be undone', () => {
    const out = card({ shown: match.topMatches[1] })
    expect(out.indexOf('title="DMC 3830 · Thread 3830"')).toBeLessThan(out.indexOf('title="DMC 356 · Thread 356"'))
  })

  it('marks only the shown thread as chosen, among the choices and on the ladder', () => {
    const out = card({ shown: match.familyLadder[2] })
    expect(out.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(out).toMatch(/aria-pressed="true"[^>]*aria-label="DMC 355, Thread 355"/)
  })

  it('says when the catalog color itself is approximate', () => {
    const approximate = thread('3830', 1.2, 'approximate')
    const out = card({ shown: approximate })
    expect(out).toContain('approximate color')
    expect(out).toContain('may be further off')
  })

  it('cannot be copied or saved while the number shown belongs to the last sample', () => {
    const out = card({ stale: true, canSave: false })
    expect(out).toContain('aria-busy="true"')
    expect((out.match(/<button[^>]*disabled=""/g) ?? []).length).toBe(2)
  })

  it('reports a failed lookup instead of a thread', () => {
    const out = card({ threads: null, shown: null, failed: true })
    expect(out).toContain('role="alert"')
    expect(out).toContain('Thread matches are unavailable.')
  })
})
