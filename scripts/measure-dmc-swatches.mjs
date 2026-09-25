/**
 * Re-measures every DMC thread color from DMC's own product photos.
 *
 * DMC publishes no hex/RGB/Lab values. What it does publish is a full-frame macro photo of
 * every Mouliné Spécial (117MC) thread, all from one studio shoot and tagged sRGB. For each
 * photo we average the central 80% in linear light: the color the thread reads as from a
 * stitching distance, and the value the skein renderer (`components/simple/floss.ts`) is
 * built to reproduce.
 *
 * Updates `scripts/source/dmc-threads.json` in place. Names and color-card order are kept
 * (DMC's store names are a marketing layer, e.g. "310 Metallic Black"), so the file stays the
 * hand-maintained source of truth and this script only refreshes colors and flags.
 *
 *   node scripts/measure-dmc-swatches.mjs
 *
 * Not part of the build: it needs the network, and its output is committed.
 */

import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import sharp from 'sharp'
import { parseDmcName, rgbToOklabRecord } from './dmc-enrich.mjs'

const PRODUCT_URL = 'https://www.dmc.com/US/en/api/quilt/products/mouline-special/product_data'
const repoRoot = process.cwd()
const sourcePath = `${repoRoot}/scripts/source/dmc-threads.json`
const cacheDir = `${repoRoot}/node_modules/.cache/dmc-swatches`

/** DMC's store codes for threads we number differently. */
const CODE_TO_NUMBER = { BLANC: 'White', ECRU: 'Ecru' }
/** Photos smaller than this are thumbnails: usable, but less trustworthy. */
const MIN_RELIABLE_SIZE = 100
/** Lightness (OKLab L) a lighter-named thread may sit below a darker-named one before we flag it. */
const INVERSION_TOLERANCE = 0.01
const STEP_ORDER = { 'very-light': 0, light: 1, medium: 2, dark: 3, 'very-dark': 4 }

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toSrgb8 = (c) => Math.round(255 * Math.min(1, c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055))
const toHex = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`

async function fetchSwatch(url, code) {
  const file = `${cacheDir}/${code}.jpg`
  try {
    await access(file)
    return readFile(file)
  } catch {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Swatch for ${code}: HTTP ${response.status}`)
    const buffer = Buffer.from(await response.arrayBuffer())
    await writeFile(file, buffer)
    return buffer
  }
}

/** Linear-light average of the photo's central 80%, skipping any edge vignetting. */
async function measureSwatch(buffer) {
  const image = sharp(buffer)
  const { width, height } = await image.metadata()
  const { data, info } = await image
    .extract({ left: Math.round(width * 0.1), top: Math.round(height * 0.1), width: Math.round(width * 0.8), height: Math.round(height * 0.8) })
    .toColorspace('srgb')
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const sum = [0, 0, 0]
  const pixels = info.width * info.height
  for (let p = 0; p < pixels; p++) {
    for (let c = 0; c < 3; c++) sum[c] += toLinear(data[p * info.channels + c] / 255)
  }
  return { hex: toHex(sum.map((total) => toSrgb8(total / pixels))), size: Math.min(width, height) }
}

/**
 * Flags threads whose measured lightness contradicts their name within a family run
 * (e.g. "Melon Dark" photographing darker than "Melon Very Dark"): a sign of per-shot
 * exposure drift in DMC's photos.
 */
function flagLadderInversions(threads) {
  const inverted = new Set()
  let run = []
  const check = () => {
    for (const a of run) {
      for (const b of run) {
        if (STEP_ORDER[a.step] < STEP_ORDER[b.step] && a.L < b.L - INVERSION_TOLERANCE) {
          inverted.add(a.number)
          inverted.add(b.number)
        }
      }
    }
  }
  for (const thread of threads) {
    const { stem, shadeStep } = parseDmcName(thread.name)
    if (run.length && run[0].stem !== stem) {
      check()
      run = []
    }
    if (thread.hex && shadeStep in STEP_ORDER) {
      const hex = thread.hex.slice(1)
      const rgb = { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) }
      run.push({ number: thread.number, stem, step: shadeStep, L: rgbToOklabRecord(rgb).L })
    } else {
      run.push({ number: thread.number, stem, step: 'none', L: 0 })
    }
  }
  check()
  return inverted
}

async function main() {
  await mkdir(cacheDir, { recursive: true })
  const source = JSON.parse(await readFile(sourcePath, 'utf8'))
  const response = await fetch(PRODUCT_URL, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`DMC product data: HTTP ${response.status}`)
  const { variants } = await response.json()

  const solids = new Map()
  const variegated = []
  for (const { colour } of variants) {
    const code = colour.code.toUpperCase()
    const number = CODE_TO_NUMBER[code] ?? code
    if (/ombre/i.test(colour.presentation ?? '')) {
      variegated.push({ number, dmcName: colour.presentation })
    } else {
      solids.set(number, colour)
    }
  }

  const threads = []
  const retired = [...source.retired]
  for (const thread of source.threads) {
    if (solids.has(thread.number)) threads.push(thread)
    else retired.push({ number: thread.number, name: thread.name, lastHex: thread.hex })
  }
  const known = new Set(threads.map((thread) => thread.number))
  for (const [number, colour] of solids) {
    if (!known.has(number)) {
      // DMC's store name is a placeholder until someone adds the color-card name.
      threads.push({ number, name: colour.presentation ?? number, hex: null, confidence: 'legacy', flags: ['store-name'] })
    }
  }

  let measured = 0
  for (const thread of threads) {
    const colour = solids.get(thread.number)
    const keep = thread.flags.filter((flag) => flag === 'store-name')
    if (!colour.swatch) {
      thread.flags = [...keep, 'no-photo']
      thread.confidence = 'legacy'
      continue
    }
    const { hex, size } = await measureSwatch(await fetchSwatch(colour.swatch, colour.code.toUpperCase()))
    thread.hex = hex
    thread.flags = size < MIN_RELIABLE_SIZE ? [...keep, 'low-res-photo'] : keep
    measured++
  }

  for (const number of flagLadderInversions(threads)) {
    threads.find((thread) => thread.number === number).flags.push('ladder-inversion')
  }
  for (const thread of threads) {
    if (thread.flags.includes('no-photo')) continue
    thread.confidence = thread.flags.some((flag) => flag !== 'store-name') ? 'low' : 'photo'
  }

  const missing = threads.filter((thread) => !thread.hex)
  if (missing.length) throw new Error(`No color for ${missing.map((thread) => thread.number).join(', ')}`)

  const output = {
    source: `DMC Mouliné Spécial (117MC) product photos, ${PRODUCT_URL}`,
    method: 'Linear-light average of the central 80% of each sRGB swatch photo. confidence: photo = measured; low = measured but a thumbnail or out of order with its shade family; legacy = no photo, kept from the old fan-made chart.',
    measuredAt: new Date().toISOString().slice(0, 10),
    threads,
    retired,
    variegated,
  }
  await writeFile(sourcePath, `${JSON.stringify(output, null, 2)}\n`)

  const counts = threads.reduce((acc, thread) => ({ ...acc, [thread.confidence]: (acc[thread.confidence] ?? 0) + 1 }), {})
  console.log(`Measured ${measured} of ${threads.length} solids`, counts)
  if (retired.length) console.log('No longer sold by DMC:', retired.map((thread) => thread.number).join(', '))
  const unnamed = threads.filter((thread) => thread.flags.includes('store-name'))
  if (unnamed.length) console.log('Needs a color-card name:', unnamed.map((thread) => `${thread.number} (${thread.name})`).join(', '))
}

await main()
