import { beforeAll, describe, expect, it } from 'vitest'
import {
  getDmcFamily,
  getDmcFamilyThreads,
  getDmcThreadByNumber,
  loadDmcCatalog,
  loadDmcCatalogIndexes,
  resetDmcCatalogCache,
} from './catalog'

describe('dmc catalog', () => {
  beforeAll(() => {
    resetDmcCatalogCache()
  })

  it('loads enriched threads with families', async () => {
    const catalog = await loadDmcCatalog()

    expect(catalog.threads.length).toBeGreaterThanOrEqual(454)
    expect(catalog.families.length).toBeGreaterThan(100)

    const first = catalog.threads[0]
    expect(first.id).toMatch(/^dmc:/)
    expect(first.familyId).toBeTruthy()
    expect(first.shadeRank).toBeGreaterThanOrEqual(0)
    expect(first.oklab.L).toBeGreaterThanOrEqual(0)
    expect(first.productLine).toBe('mouline-solid')
  })

  it('indexes threads by number and id', async () => {
    const black = await getDmcThreadByNumber('310')
    expect(black?.name).toBe('Black')
    expect(black?.familyLabel).toBe('Black')

    const indexes = await loadDmcCatalogIndexes()
    expect(indexes.byNumber.get('310')?.id).toBe('dmc:310')
    expect(indexes.byId.get('dmc:310')?.number).toBe('310')
  })

  it('builds salmon shade ladder light to dark', async () => {
    const salmon = await getDmcThreadByNumber('760')
    expect(salmon).toBeDefined()
    if (!salmon) return

    const family = await getDmcFamily(salmon.familyId)
    expect(family?.label).toBe('Salmon')
    expect(family?.threadNumbers).toEqual(['3713', '761', '760', '3712', '3328', '347'])

    const ladder = await getDmcFamilyThreads(salmon.familyId)
    expect(ladder).toHaveLength(6)

    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i].shadeRank).toBeGreaterThan(ladder[i - 1].shadeRank)
      expect(ladder[i].oklab.L).toBeLessThanOrEqual(ladder[i - 1].oklab.L)
    }

    expect(ladder[0].shadeStep).toBe('very-light')
    expect(ladder[ladder.length - 1].shadeStep).toBe('very-dark')
  })

  it('parses baby blue value steps from names', async () => {
    const medium = await getDmcThreadByNumber('334')
    expect(medium?.name).toBe('Baby Blue Medium')
    expect(medium?.shadeStep).toBe('medium')
    expect(medium?.familyLabel).toBe('Baby Blue')
  })
})
