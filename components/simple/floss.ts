/**
 * Colorize the photographed skein template to any thread color.
 *
 * The template's own lighting becomes a shading map (luminance only), normalized so the
 * floss averages to 1. Each fiber is the target color scaled by its shade, in linear light,
 * so the skein as a whole averages to exactly the thread color and keeps its hue, while
 * the twist and sheen survive as light and dark.
 *
 * Light threads have no room above them for highlights. Real light floss photographs flatter
 * anyway, because its fibers bounce light into their own shadows (in DMC's photos the
 * brightest fibers sit ~2.5x the average for mid-tones but ~1.3x for near-whites). So the
 * shading contrast is reduced evenly around the average until the brightest 3% of fibers
 * reach white, which keeps the average exact. Those top fibers, and any stray speculars,
 * spill toward white, keeping their brightness.
 *
 * Thread colors come from DMC's photos (see scripts/measure-dmc-swatches.mjs), so even 310
 * Black is a real dark gray and shows its twist without any added sheen. The paper labels
 * are untouched.
 */

const TEMPLATE_SRC = '/images/floss-template.png'

/** Template rows covered by the paper labels (the DMC band, then the barcode label). */
const LABEL_ROWS: ReadonlyArray<readonly [number, number]> = [[120, 227], [549, 708]]
const LABEL_FEATHER = 2 // px of blend at each label edge, so the cut isn't visible

export interface FlossTemplate {
  width: number
  height: number
  original: Uint8ClampedArray
  /** Per pixel: luminance relative to the floss average (1 = exactly the thread color). */
  shade: Float32Array
  /** Per pixel: 0 = floss, 1 = paper label. */
  label: Float32Array
  /** Shade of the brightest fibers (97th percentile), used to fit highlights under white. */
  shadeHigh: number
}

const toLinear = new Float32Array(256)
for (let i = 0; i < 256; i++) {
  const c = i / 255
  toLinear[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

const TO_SRGB_STEPS = 4096
const toSrgb = new Uint8ClampedArray(TO_SRGB_STEPS + 1)
for (let i = 0; i <= TO_SRGB_STEPS; i++) {
  const c = i / TO_SRGB_STEPS
  toSrgb[i] = Math.round((c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255)
}

function labelWeight(y: number) {
  for (const [top, bottom] of LABEL_ROWS) {
    if (y >= top && y <= bottom) return 1
    const distance = y < top ? top - y : y - bottom
    if (distance < LABEL_FEATHER) return 1 - distance / LABEL_FEATHER
  }
  return 0
}

/** Builds the shading map from the template's RGBA pixels. */
export function buildFlossTemplate(data: Uint8ClampedArray, width: number, height: number): FlossTemplate {
  const count = width * height
  const luminance = new Float32Array(count)
  const label = new Float32Array(count)
  let flossTotal = 0
  const flossLuminance: number[] = []

  for (let p = 0; p < count; p++) {
    const i = p * 4
    luminance[p] = 0.2126 * toLinear[data[i]] + 0.7152 * toLinear[data[i + 1]] + 0.0722 * toLinear[data[i + 2]]
    label[p] = labelWeight(Math.floor(p / width))
    if (data[i + 3] > 200 && label[p] === 0) {
      flossTotal += luminance[p]
      flossLuminance.push(luminance[p])
    }
  }

  const average = flossLuminance.length ? flossTotal / flossLuminance.length : 1
  flossLuminance.sort((a, b) => a - b)
  const high = flossLuminance[Math.floor(flossLuminance.length * 0.97)] ?? average
  return {
    width,
    height,
    original: data,
    shade: luminance.map((y) => y / average),
    label,
    shadeHigh: Math.max(1.01, high / average),
  }
}

let templatePromise: Promise<FlossTemplate> | null = null

export function loadFlossTemplate(): Promise<FlossTemplate> {
  templatePromise ??= new Promise<FlossTemplate>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return reject(new Error('No 2D context for the floss template'))
      ctx.drawImage(image, 0, 0)
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
      resolve(buildFlossTemplate(data, canvas.width, canvas.height))
    }
    image.onerror = () => {
      templatePromise = null
      reject(new Error('Could not load the floss template'))
    }
    image.src = TEMPLATE_SRC
  })
  return templatePromise
}

export function colorizeFloss(template: FlossTemplate, hex: string): ImageData {
  const { width, height, original, shade, label, shadeHigh } = template
  const [tr, tg, tb] = [1, 3, 5].map((start) => toLinear[parseInt(hex.slice(start, start + 2), 16)])
  const targetY = 0.2126 * tr + 0.7152 * tg + 0.0722 * tb
  // Flatten the shading evenly around 1 (so the average holds) until the brightest fibers fit under white.
  const brightest = Math.max(tr, tg, tb)
  const contrast = brightest > 0 ? Math.min(1, (1 / brightest - 1) / (shadeHigh - 1)) : 1
  const out = new ImageData(width, height)
  const pixels = out.data
  const rgb = [0, 0, 0]

  for (let p = 0; p < shade.length; p++) {
    const i = p * 4
    pixels[i + 3] = original[i + 3]
    if (original[i + 3] === 0) continue

    const t = 1 + (shade[p] - 1) * contrast
    rgb[0] = Math.min(1, tr * t)
    rgb[1] = Math.min(1, tg * t)
    rgb[2] = Math.min(1, tb * t)
    // Clipping lost brightness; give it back by moving toward white, which keeps the hue family.
    const clippedY = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
    const wantedY = Math.min(1, targetY * t)
    if (wantedY > clippedY + 1e-6) {
      const toWhite = (wantedY - clippedY) / (1 - clippedY)
      for (let c = 0; c < 3; c++) rgb[c] += (1 - rgb[c]) * toWhite
    }

    const paper = label[p]
    for (let c = 0; c < 3; c++) {
      const floss = toSrgb[Math.round(rgb[c] * TO_SRGB_STEPS)]
      pixels[i + c] = paper === 0 ? floss : Math.round(floss * (1 - paper) + original[i + c] * paper)
    }
  }
  return out
}
