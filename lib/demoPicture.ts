/**
 * The welcome's demo picture: a real picture to try every view on, opened with a first sample
 * already taken. Pure apart from `averageColorAt` reading the pixels it is given.
 *
 * The picture is Katsushika Hokusai, "Umezawa Manor in Sagami Province", from Thirty-six Views
 * of Mount Fuji (ca. 1830–32), The Metropolitan Museum of Art, released as CC0 (public domain)
 * in the Met's Open Access program; the file is the Met's scan via Wikimedia Commons, 1280 px.
 *
 * It was chosen by measurement among seven CC0 candidates (four oil paintings, three prints):
 * at the Plan view's default 8 piles it is the only one rated "A fair repaint" (29% of the
 * picture visibly off; 23% at 12 piles), and its monochrome Thread Map is rated close.
 * The first sample is a flat cream cloud where both the paint recipe (Very close) and the
 * nearest thread (Close in catalog) read well, so the first result is a confident one.
 */

export const DEMO_PICTURE = {
  src: '/images/demo/hokusai-umezawa.webp',
  /** Shown as the picture's name (saved colors, the printed plan card). */
  name: 'Hokusai, Umezawa Manor (The Met)',
  /** Where the first sample is taken, as a share of the picture's width and height. */
  firstSample: { x: 0.08, y: 0.43 },
  /** Half-width of the averaged square: 3 is a 7x7 average, steadier than a click on paper grain. */
  sampleRadius: 3,
} as const

/** The average color of the (2r+1)² square around (x, y), clipped to the picture. */
export function averageColorAt(
  data: ArrayLike<number>,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number,
): { r: number; g: number; b: number } {
  let r = 0, g = 0, b = 0, count = 0
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const sx = x + dx, sy = y + dy
      if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue
      const i = (sy * width + sx) * 4
      r += data[i]; g += data[i + 1]; b += data[i + 2]
      count++
    }
  }
  if (count === 0) return { r: 0, g: 0, b: 0 }
  return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) }
}

/** The pixel the first sample lands on in a picture of this size. */
export function firstSamplePixel(width: number, height: number): { x: number; y: number } {
  return {
    x: Math.min(width - 1, Math.max(0, Math.round(DEMO_PICTURE.firstSample.x * width))),
    y: Math.min(height - 1, Math.max(0, Math.round(DEMO_PICTURE.firstSample.y * height))),
  }
}
