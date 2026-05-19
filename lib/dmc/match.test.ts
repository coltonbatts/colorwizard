import { beforeAll, describe, expect, it } from 'vitest'
import { loadDmcCatalog, resetDmcCatalogCache } from './catalog'
import { getThreadMatchContext, rankDmcThreadsByDeltaE } from './match'

describe('dmc match', () => {
  beforeAll(() => {
    resetDmcCatalogCache()
  })

  it('ranks black to DMC 310', async () => {
    const { threads } = await loadDmcCatalog()
    const ranked = rankDmcThreadsByDeltaE({ r: 0, g: 0, b: 0 }, threads)

    expect(ranked[0].number).toBe('310')
    expect(ranked[0].deltaE00).toBe(0)
  })

  it('returns family-aware context for a salmon sample', async () => {
    const context = await getThreadMatchContext({ r: 241, g: 135, b: 135 })
    expect(context).not.toBeNull()
    if (!context) return

    expect(context.primary.familyLabel).toBe('Salmon')
    expect(context.sameFamily.every((t) => t.familyId === context.primary.familyId)).toBe(true)
    expect(context.sameFamily[0].id).toBe(context.primary.id)

    expect(context.familyLadder.map((t) => t.number)).toEqual([
      '3713',
      '761',
      '760',
      '3712',
      '3328',
      '347',
    ])

    expect(context.alternatives.length).toBeLessThanOrEqual(3)
    expect(
      context.alternatives.every((t) => t.familyId !== context.primary.familyId),
    ).toBe(true)
  })

  it('exposes lighter and darker ladder neighbors when applicable', async () => {
    const context = await getThreadMatchContext({ r: 241, g: 135, b: 135 })
    expect(context?.primary.number).toBe('3712')

    const ladder = context?.ladderPosition
    expect(ladder?.rank).toBe(context?.primary.shadeRank)
    expect(ladder?.total).toBe(6)
    expect(ladder?.lighter?.number).toBe('760')
    expect(ladder?.darker?.number).toBe('3328')
  })

  it('respects alternativeCount', async () => {
    const few = await getThreadMatchContext({ r: 128, g: 128, b: 128 }, { alternativeCount: 1 })
    const many = await getThreadMatchContext({ r: 128, g: 128, b: 128 }, { alternativeCount: 5 })

    expect(few?.alternatives).toHaveLength(1)
    expect(many?.alternatives).toHaveLength(5)
  })

  it('findClosestDMCColors stays compatible via ranked slice', async () => {
    const { findClosestDMCColors } = await import('../dmcFloss')
    const matches = await findClosestDMCColors({ r: 0, g: 0, b: 0 }, 3)

    expect(matches).toHaveLength(3)
    expect(matches[0].number).toBe('310')
    expect(matches[0].distance).toBe(matches[0].deltaE00)
    expect(matches[1].distance).toBeGreaterThanOrEqual(matches[0].distance)
  })
})
