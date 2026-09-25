import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { differenceCiede2000 } from 'culori'
import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'
import type { DMCThread } from '@/lib/dmc/types'
import { buildFlossTemplate, colorizeFloss, type FlossTemplate } from './floss'

globalThis.ImageData ??= class {
  data: Uint8ClampedArray
  constructor(public width: number, public height: number) {
    this.data = new Uint8ClampedArray(width * height * 4)
  }
} as unknown as typeof ImageData

const deltaE = differenceCiede2000()
const LINEAR = Array.from({ length: 256 }, (_, v) => {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
})
const toHex = (linear: number) => {
  const c = linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055
  return Math.round(c * 255).toString(16).padStart(2, '0')
}

/** The rendered floss (labels excluded) in linear light: its average color and how bright its top fibers are. */
function measureSkein(template: FlossTemplate, { data }: ImageData) {
  let r = 0
  let g = 0
  let b = 0
  const luminance: number[] = []
  for (let p = 0; p < template.shade.length; p++) {
    const i = p * 4
    if (template.original[i + 3] <= 200 || template.label[p] !== 0) continue
    r += LINEAR[data[i]]
    g += LINEAR[data[i + 1]]
    b += LINEAR[data[i + 2]]
    luminance.push(0.2126 * LINEAR[data[i]] + 0.7152 * LINEAR[data[i + 1]] + 0.0722 * LINEAR[data[i + 2]])
  }
  const n = luminance.length
  luminance.sort((x, y) => x - y)
  return {
    hex: `#${[r, g, b].map((v) => toHex(v / n)).join('')}`,
    brightFibers: luminance[Math.floor(n * 0.95)] / (0.2126 * r / n + 0.7152 * g / n + 0.0722 * b / n),
  }
}

describe('colorizeFloss', () => {
  let template: FlossTemplate
  let threads: DMCThread[]

  beforeAll(async () => {
    const { data, info } = await sharp(resolve('public/images/floss-template.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    template = buildFlossTemplate(new Uint8ClampedArray(data), info.width, info.height)
    threads = JSON.parse(readFileSync(resolve('public/data/dmc-floss.json'), 'utf8'))
  })

  it('renders every thread so the skein averages to its color', () => {
    const misses = threads
      .map((thread) => {
        const { hex } = measureSkein(template, colorizeFloss(template, thread.hex))
        return { error: deltaE(thread.hex, hex), label: `DMC ${thread.number} ${thread.hex} rendered as ${hex}` }
      })
      .sort((a, b) => b.error - a.error)
    expect(misses[0].error, misses[0].label).toBeLessThan(1)
  }, 30_000)

  it('keeps the twist visible on black and a softer one on white, like DMC photographs them', () => {
    const shading = (number: string) => {
      const thread = threads.find((t) => t.number === number)!
      return measureSkein(template, colorizeFloss(template, thread.hex)).brightFibers
    }
    expect(shading('310')).toBeGreaterThan(2)
    expect(shading('White')).toBeGreaterThan(1.1)
    expect(shading('White')).toBeLessThan(1.4)
  })
})
