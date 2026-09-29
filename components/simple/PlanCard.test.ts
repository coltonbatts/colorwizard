import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PALETTES } from '@/lib/paint/plan/benchmark'
import { buildCard } from '@/lib/paint/plan/card'
import { describePlanForExport } from '@/lib/paint/plan/export'
import { loadCorpus } from '@/lib/paint/plan/fixtures/corpus'
import { planPicture } from '@/lib/paint/plan/picture'
import PlanCard from './PlanCard'

async function markup(name: string, budget: number) {
  const image = loadCorpus('synthetic').find((i) => i.name === name)!
  const plan = await planPicture(image.data, image.width, image.height, budget, PALETTES.core6.pigments)
  const model = describePlanForExport(plan, { paletteName: 'The Core six', pictureName: name })
  const card = buildCard(plan, model, { dateText: 'September 28, 2026' })
  const html = renderToStaticMarkup(createElement(PlanCard, { card, images: { original: 'data:image/jpeg;base64,AAAA', repaint: 'data:image/png;base64,AAAA' }, onDone: () => undefined, autoPrint: false }))
  return { card, model, html }
}

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ')

describe('PlanCard markup', () => {
  it('draws every pile once, with its number as text, and every caveat in full', async () => {
    const { card, model, html } = await markup('landscape', 12)
    expect((html.match(/<li /g) ?? []).length).toBe(model.pileCount)
    for (const pile of model.piles) expect(html).toContain(`<strong>${pile.name}</strong>`)
    const body = text(html)
    for (const line of model.caveatLines) expect(body).toContain(text(line))
    expect(body).toContain(card.mixOrder.join(' → '))
    expect(body).toContain('One part =')
    expect(body).toContain(card.metaLine)
    if (card.unlabeledNote) expect(body).toContain(text(card.unlabeledNote))
  })

  it('puts every badge on the repaint, and none anywhere else', async () => {
    const { card, html } = await markup('sunset', 8)
    // badge texts on the picture (font-size in pile-map pixels) plus one per pile cell (font-size 9)
    expect((html.match(/<circle /g) ?? []).length).toBe(card.badges.length + card.columns.flat().length)
    for (const badge of card.badges) expect(html).toContain(`cx="${badge.x}" cy="${badge.y}"`)
  })

  it('does not depend on "background graphics" or on color: swatches are SVG with a border, pictures are images', async () => {
    const { model, html } = await markup('landscape', 8)
    // no element carries a background of its own: nothing disappears when the print dialog drops backgrounds
    const styleAttributes = [...html.matchAll(/ style="([^"]*)"/g)].map((m) => m[1])
    expect(styleAttributes.length).toBeGreaterThan(0)
    expect(styleAttributes.some((value) => /background/.test(value))).toBe(false)
    for (const pile of model.piles) expect(html).toContain(`fill="${pile.swatchHex}" stroke="#111"`)
    expect((html.match(/<img /g) ?? []).length).toBe(2)
  })

  it('carries the page rules that hide the app when printing, and only when the card exists', async () => {
    const { html } = await markup('landscape', 5)
    expect(html).toContain('data-plan-card')
    expect(html).toContain('body &gt; *:not([data-plan-card]) { display: none !important; }')
    expect(html).toContain('@page { margin: 10mm; }')
  })
})
