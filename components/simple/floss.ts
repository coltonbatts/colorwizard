/**
 * Colorize the photographed skein template to any thread color.
 *
 * The template's own lighting becomes a shading map (luminance only), normalized so the
 * floss averages to 1. Each fiber is the target color scaled by its shade, in linear light,
 * so the skein as a whole averages to exactly the thread color and keeps its hue, while
 * the twist and sheen survive as light and dark.
 *
 * Light threads have no room above them for highlights, so only their highlights are
 * softened, just enough to stay within white: the lit body of the floss is still the exact
 * color and the shadows stay dark, the way white floss photographs. Any stray speculars
 * past that spill toward white, keeping their brightness.
 *
 * Very dark threads have the opposite problem: scaling black is still black. They get a
 * faint neutral sheen on their highlights only, so black floss still shows its twist
 * while its body stays exact. The paper labels are untouched.
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
  /** Shade of the brightest fibers (99.5th percentile), used to fit highlights under white. */
  shadeHigh: number
}

const toLinear = new Float32Array(256)
for (let i = 0; i < 256; i++) {
  const c = i / 255
  toLinear[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** Neutral sheen added per unit of highlight on the darkest threads, in linear light. */
const DARK_SHEEN = 0.07

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
      const count = canvas.width * canvas.height
      const luminance = new Float32Array(count)
      const label = new Float32Array(count)
      let flossTotal = 0
      const flossLuminance: number[] = []

      for (let p = 0; p < count; p++) {
        const i = p * 4
        luminance[p] = 0.2126 * toLinear[data[i]] + 0.7152 * toLinear[data[i + 1]] + 0.0722 * toLinear[data[i + 2]]
        label[p] = labelWeight(Math.floor(p / canvas.width))
        if (data[i + 3] > 200 && label[p] === 0) {
          flossTotal += luminance[p]
          flossLuminance.push(luminance[p])
        }
      }

      const average = flossLuminance.length ? flossTotal / flossLuminance.length : 1
      flossLuminance.sort((a, b) => a - b)
      const high = flossLuminance[Math.floor(flossLuminance.length * 0.995)] ?? average
      resolve({
        width: canvas.width,
        height: canvas.height,
        original: data,
        shade: luminance.map((y) => y / average),
        label,
        shadeHigh: Math.max(1.01, high / average),
      })
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
  // Squeeze highlights so the brightest fibers land at or under pure white.
  const brightest = Math.max(tr, tg, tb)
  const highlightScale = brightest > 0 ? Math.min(1, (1 / brightest - 1) / (shadeHigh - 1)) : 1
  // Fades out fast: full for black, negligible by mid-tones.
  const sheen = DARK_SHEEN * Math.pow(1 - brightest, 6)
  const out = new ImageData(width, height)
  const pixels = out.data
  const rgb = [0, 0, 0]

  for (let p = 0; p < shade.length; p++) {
    const i = p * 4
    pixels[i + 3] = original[i + 3]
    if (original[i + 3] === 0) continue

    const t = shade[p] > 1 ? 1 + (shade[p] - 1) * highlightScale : shade[p]
    const shine = shade[p] > 1 ? sheen * (shade[p] - 1) : 0
    rgb[0] = Math.min(1, tr * t + shine)
    rgb[1] = Math.min(1, tg * t + shine)
    rgb[2] = Math.min(1, tb * t + shine)
    // Clipping lost brightness; give it back by moving toward white, which keeps the hue family.
    const clippedY = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
    const wantedY = Math.min(1, targetY * t + shine)
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
