import { describe, expect, it } from 'vitest'
import { PALETTES } from './benchmark'
import { buildCard, CARD, MIX_ORDER_LABEL, PARTS_LABEL } from './card'
import { describePlanForExport } from './export'
import { loadCorpus } from './fixtures/corpus'
import { planPicture, type PicturePlan } from './picture'
import { MODEL_CAVEAT, PLAN_CAVEAT_COPY, PRINT_CAVEAT, PARTS_CAVEAT } from './planFit'

const corpus = loadCorpus('synthetic')
const plans = new Map<string, Promise<PicturePlan>>()
function plan(name: string, budget: number): Promise<PicturePlan> {
  const key = `${name}:${budget}`
  if (!plans.has(key)) {
    const image = corpus.find((i) => i.name === name)!
    plans.set(key, planPicture(image.data, image.width, image.height, budget, PALETTES.core6.pigments))
  }
  return plans.get(key)!
}
const OPTIONS = { paletteName: 'The Core six' }
async function card(name: string, budget: number, dateText = 'September 28, 2026') {
  const p = await plan(name, budget)
  const model = describePlanForExport(p, { ...OPTIONS, pictureName: name })
  return { p, model, card: buildCard(p, model, { dateText }) }
}
const CASES: Array<[string, number]> = [['landscape', 5], ['landscape', 12], ['sunset', 8], ['portrait-light', 12], ['high-key', 12]]

describe('the card lists every pile once, with the export model’s words', () => {
  it.each(CASES)('%s at %i piles', async (name, budget) => {
    const { model, card: c } = await card(name, budget)
    const cells = c.columns.flat()
    expect(cells.map((x) => x.number)).toEqual(model.piles.map((x) => x.number))
    expect(c.columns[0].length).toBe(Math.ceil(model.piles.length / 2))
    cells.forEach((cell, i) => {
      const pile = model.piles[i]
      expect(cell.name).toBe(pile.name) // the number is text, not only a color
      expect(cell.swatchHex).toBe(pile.swatchHex)
      expect(cell.recipe).toBe(pile.recipe)
      expect(cell.share).toBe(pile.share)
      expect(cell.fitLabel).toBe(pile.fit?.label ?? null)
      expect(cell.partsLine).toContain(pile.partsText)
    })
    expect(c.title).toBe(name)
    expect(c.headline).toBe(model.headline)
    expect(c.facts).toEqual(model.facts)
    expect(c.mixOrder).toEqual(model.mixOrder)
    expect(c.mixOrderLabel).toBe(MIX_ORDER_LABEL)
    expect(c.partsLabel).toBe(PARTS_LABEL)
  })

  it('says "8 of 12"-style counts in the header line, with the date it was given', async () => {
    const { model, card: c } = await card('high-key', 12, 'January 2, 2027')
    expect(model.pileCount).toBeLessThan(12)
    expect(c.metaLine).toBe(`The Core six · ${model.pileCount} of 12 piles · January 2, 2027`)
    expect((await card('portrait-light', 12)).card.metaLine).toContain('· 12 piles ·')
  })

  it('carries the full caveats, verbatim, including the print and parts lines', async () => {
    const { card: c } = await card('landscape', 8)
    for (const line of [MODEL_CAVEAT, PLAN_CAVEAT_COPY, PRINT_CAVEAT, PARTS_CAVEAT]) expect(c.caveats).toContain(line)
    expect(c.caveats).toEqual((await card('landscape', 8)).model.caveatLines)
  })

  it('gives a Can’t-match pile the existing wording and the closest mix, never a confident recipe', async () => {
    const { model, card: c } = await card('sunset', 8)
    const cannot = c.columns.flat().filter((x) => x.cannotMatch)
    expect(cannot.length).toBeGreaterThan(0)
    for (const cell of cannot) {
      expect(cell.fitLabel).toBe('Can’t match')
      expect(cell.notes[0]).toBe(model.piles[cell.number - 1].fit!.detail)
      expect(cell.notes[0]).toContain('The Core six can’t mix this. The closest it gets is shown')
    }
  })

  it('repeats the mix-order notes on a pile mixed from another and on its base', async () => {
    const { model, card: c } = await card('landscape', 12)
    const cells = c.columns.flat()
    const derived = model.piles.filter((x) => x.derivedFrom !== null)
    expect(derived.length).toBeGreaterThan(0)
    for (const pile of derived) {
      expect(cells[pile.number - 1].notes).toContain(`Mixed from Pile ${pile.derivedFrom}: make enough of it for both.`)
      expect(cells[pile.number - 1].recipe).toContain(`Pile ${pile.derivedFrom}`)
      const base = model.piles[pile.derivedFrom! - 1]
      if (!base.mixOnly) expect(cells[base.number - 1].notes.some((n) => n.includes('mixed from this one: make extra'))).toBe(true)
    }
  })
})

describe('pile numbers on the picture', () => {
  it.each(CASES)('%s at %i piles: every badge is in its own pile, at the size the card prints it', async (name, budget) => {
    const { p, model, card: c } = await card(name, budget)
    expect(c.plan).toEqual({ width: p.width, height: p.height })
    for (const badge of c.badges) {
      expect(badge.number).toBeGreaterThanOrEqual(1)
      expect(badge.number).toBeLessThanOrEqual(model.pileCount)
      expect(badge.x).toBeGreaterThan(0)
      expect(badge.x).toBeLessThan(p.width)
      expect(badge.y).toBeGreaterThan(0)
      expect(badge.y).toBeLessThan(p.height)
      expect(p.pile[Math.floor(badge.y) * p.width + Math.floor(badge.x)]).toBe(badge.number - 1)
    }
    // a badge is CARD.badgeRadius card pixels whatever the picture, so the same badge on every card
    expect((c.badgeRadius * c.image.width) / p.width).toBeCloseTo(CARD.badgeRadius, 6)
    for (let i = 0; i < c.badges.length; i++)
      for (let j = i + 1; j < c.badges.length; j++) expect(Math.hypot(c.badges[i].x - c.badges[j].x, c.badges[i].y - c.badges[j].y)).toBeGreaterThanOrEqual(2 * c.badgeRadius)
  })

  it('numbers most of the picture, and names the piles it could not number', async () => {
    for (const [name, budget] of CASES) {
      const { p, card: c } = await card(name, budget)
      const painted = p.score.pileAreas.flatMap((a, i) => (a > 0 ? [i + 1] : []))
      const numbered = new Set(c.badges.map((b) => b.number))
      // every pile that paints something is numbered or named in the note, never both
      for (const number of painted) expect(numbered.has(number) !== c.unlabeled.includes(number)).toBe(true)
      expect(c.unlabeled.every((n) => painted.includes(n))).toBe(true)
      if (c.unlabeled.length === 0) expect(c.unlabeledNote).toBeNull()
      else {
        expect(c.unlabeledNote).toContain(`Pile ${c.unlabeled.join(', ')}`)
        expect(c.unlabeledNote).toMatch(/no room for a number on the picture\.$/)
      }
    }
  })

  it('does not call a base that no pixel uses unlabeled: it was never on the picture', async () => {
    const p = await plan('landscape', 12)
    const base = p.plan.piles.findIndex((_, i) => p.plan.piles.some((other) => other.derived?.base === i))
    // pretend this base paints nothing: take its pixels away and give them to a neighbor pile
    const pile = p.pile.map((v) => (v === base ? (base === 0 ? 1 : 0) : v))
    const areas = p.score.pileAreas.map((a, i) => (i === base ? 0 : a))
    const altered: PicturePlan = { ...p, pile, score: { ...p.score, pileAreas: areas } }
    const c = buildCard(altered, describePlanForExport(altered, OPTIONS), { dateText: 'x' })
    expect(c.unlabeled).not.toContain(base + 1)
    expect(c.badges.some((b) => b.number === base + 1)).toBe(false)
    const cell = c.columns.flat()[base]
    expect(cell.share).toBe('—')
    expect(cell.partsLine).toMatch(/only used to mix Pile \d/)
    expect(cell.fitLabel).toBeNull()
  })
})

describe('card geometry', () => {
  it('draws both pictures inside the space a Letter or A4 page leaves', async () => {
    for (const [name, budget] of [['landscape', 8], ['portrait-light', 8], ['portrait-deep', 5]] as Array<[string, number]>) {
      // (these are 4:3; the wide case is below)
      const { p, card: c } = await card(name, budget)
      expect(c.image.width).toBeLessThanOrEqual(CARD.imageMaxWidth)
      expect(c.image.height).toBeLessThanOrEqual(CARD.imageMaxHeight + 0.01)
      expect(c.image.width / c.image.height).toBeCloseTo(p.width / p.height, 2)
      // two pictures with their 1 px frames and a 16 px gap fit the narrower A4 page inside 10 mm margins
      expect(2 * (c.image.width + 2) + 16).toBeLessThanOrEqual(CARD.pageWidth)
    }
  })

  it('keeps a very wide and a very tall picture inside the page too', async () => {
    const image = corpus.find((i) => i.name === 'landscape')!
    for (const [w, h] of [[400, 100], [100, 400]]) {
      // stretch the fixture to an extreme shape: only the pile map's shape matters here
      const pile = new Uint8Array(w * h)
      const p = { ...(await plan('landscape', 5)), width: w, height: h, pile }
      const c = buildCard(p, describePlanForExport(p, OPTIONS), { dateText: 'x' })
      expect(c.image.width).toBeLessThanOrEqual(CARD.imageMaxWidth)
      expect(c.image.height).toBeLessThanOrEqual(CARD.imageMaxHeight + 0.01)
      expect(2 * (c.image.width + 2) + 16).toBeLessThanOrEqual(CARD.pageWidth)
    }
    expect(image).toBeDefined()
  })

  it('is deterministic', async () => {
    const a = JSON.stringify((await card('landscape', 12)).card)
    expect(JSON.stringify((await card('landscape', 12)).card)).toBe(a)
  })
})
