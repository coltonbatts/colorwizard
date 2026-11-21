import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { buildThreadMapCard } from '@/lib/dmc/map/card'
import { buildThreadMap } from '@/lib/dmc/map/engine'
import type { DMCThread } from '@/lib/dmc/types'
import { loadCorpus } from '@/lib/paint/plan/fixtures/corpus'
import ThreadMapCard from './ThreadMapCard'

const ALL_THREADS: DMCThread[] = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/data/dmc-floss.json'), 'utf8'),
)
const CORPUS = loadCorpus('synthetic')

function renderCard(
  fixtureName: string,
  mode: 'full-color' | 'monochrome',
  budget: number,
  ownedNumbers: string[] = [],
) {
  const image = CORPUS.find((img) => img.name === fixtureName)!
  const map = buildThreadMap(image.data, image.width, image.height, ALL_THREADS, {
    mode,
    budget,
    monochromeTone: mode === 'monochrome' ? 'warm-grays' : undefined,
  })
  const card = buildThreadMapCard(map, {
    pictureName: fixtureName,
    dateText: 'November 20, 2026',
    ownedNumbers,
  })
  const html = renderToStaticMarkup(
    createElement(ThreadMapCard, {
      card,
      images: {
        original: 'data:image/jpeg;base64,AAAA',
        repaint: 'data:image/png;base64,AAAA',
      },
      onDone: () => undefined,
      autoPrint: false,
    }),
  )
  return { map, card, html }
}

const stripHtml = (html: string) =>
  html
    .replace(/<style>[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')

describe('ThreadMapCard markup', () => {
  it('draws every DMC thread once with badge, Have/Need box, and full caveats', () => {
    const { map, card, html } = renderCard('portrait-light', 'full-color', 10, ['310', 'White'])
    expect((html.match(/<li /g) ?? []).length).toBe(map.slots.length)
    for (const slot of map.slots) {
      expect(html).toContain(`DMC ${slot.thread.number}`)
      expect(html).toContain(slot.thread.name)
    }

    const body = stripHtml(html)
    for (const line of card.caveats) {
      expect(body).toContain(stripHtml(line))
    }
    expect(body).toContain(card.metaLine)
    expect(body).not.toMatch(/\bexact\b/i)
    expect(body).not.toMatch(/\bverified\b/i)
  })

  it('survives background-graphics-off and grayscale: SVG swatches with border, <img> pictures, text checkboxes', () => {
    const { map, card, html } = renderCard('landscape', 'monochrome', 7, [
      // Own first thread to verify [x] and [ ] both render cleanly.
      'White',
      '746',
      '822',
      '3865',
    ])

    const styleAttrs = [...html.matchAll(/ style="([^"]*)"/g)].map((m) => m[1])
    expect(styleAttrs.length).toBeGreaterThan(0)
    expect(styleAttrs.some((v) => /background/.test(v))).toBe(false)

    for (const slot of map.slots) {
      expect(html).toContain(`fill="${slot.thread.hex}" stroke="#111"`)
    }
    expect((html.match(/<img /g) ?? []).length).toBe(2)
    expect((html.match(/<circle /g) ?? []).length).toBe(card.badges.length + card.columns.flat().length)
    expect(html).toContain('[ ]')
    expect(stripHtml(html)).not.toMatch(/\bexact\b/i)
  })

  it('includes print isolation rules targeting [data-thread-map-card] and 10mm page margins', () => {
    const { html } = renderCard('sunset', 'full-color', 18)
    expect(html).toContain('data-thread-map-card')
    expect(html).toContain('body &gt; *:not([data-thread-map-card]) { display: none !important; }')
    expect(html).toContain('@page { margin: 10mm; }')
  })

  it('renders a grayscale-safe 1-page B&W Transfer Outline card with mirror note, single outline <img>, and caveats', () => {
    const image = CORPUS.find((img) => img.name === 'landscape')!
    const map = buildThreadMap(image.data, image.width, image.height, ALL_THREADS, {
      mode: 'full-color',
      budget: 10,
    })
    const card = buildThreadMapCard(map, {
      variant: 'transfer-outline',
      mirror: true,
      showNumbers: true,
      pictureName: 'landscape',
      dateText: 'November 20, 2026',
      ownedNumbers: [map.slots[0].thread.number],
    })
    const html = renderToStaticMarkup(
      createElement(ThreadMapCard, {
        card,
        images: {
          original: '',
          repaint: 'data:image/png;base64,BBBB',
          outline: 'data:image/png;base64,BBBB',
        },
        onDone: () => undefined,
        autoPrint: false,
      }),
    )

    expect(html).toContain('data-variant="transfer-outline"')
    expect(html).toContain('Mirrored fabric transfer outline')
    expect((html.match(/<img /g) ?? []).length).toBe(1)
    expect((html.match(/<li /g) ?? []).length).toBe(map.slots.length)
    expect(html).toContain('[x]')
    expect(html).toContain('[ ]')
    const body = stripHtml(html)
    for (const line of card.caveats) {
      expect(body).toContain(stripHtml(line))
    }
    expect(body).not.toMatch(/\bexact\b/i)
    expect(body).not.toMatch(/\bverified\b/i)
  })
})
