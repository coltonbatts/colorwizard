'use client'

import { rankDmcThreadsByDeltaE } from '../dmc/match'
import type { DMCThread } from '../dmc/types'

export interface StitchCell {
  x: number
  y: number
  r: number
  g: number
  b: number
  dmcCode: string
  dmcName: string
  symbol: string
  colorId: string
  isTransparent: boolean
}

export interface LegendItem {
  dmcCode: string
  dmcName: string
  colorId: string
  rgb: { r: number; g: number; b: number }
  symbol: string
  count: number
  percentage: number
}

export interface QuantizationResult {
  width: number
  height: number
  cells: StitchCell[]
  legend: LegendItem[]
}

export interface RawPixel {
  x: number
  y: number
  r: number
  g: number
  b: number
  isTransparent: boolean
}

const CHART_SYMBOLS = [
  '✚', '✖', '●', '■', '▲', '◆', '★', '♥', '♣', '♠',
  '✽', '✦', '✶', '✿', '❀', '▼', '◀', '▶', '⬢', '⬧',
  '☀', '☁', '☂', '☃', '☄', '☉', '☎', '☑', '☒', '☮',
  '☯', '♛', '♞', '♜', '♝', '♟', '⚽', '⚾', '⚓', '⚔'
]

function getSymbolForIndex(index: number): string {
  if (index < CHART_SYMBOLS.length) {
    return CHART_SYMBOLS[index]
  }
  const offsetIndex = index - CHART_SYMBOLS.length
  if (offsetIndex < 26) {
    return String.fromCharCode(65 + offsetIndex)
  }
  return String(offsetIndex - 26 + 1)
}

/**
 * Pure K-Means clustering and DMC thread mapping logic.
 * Decoupled from the DOM for easy unit testing in Node environments.
 */
export function quantizePixels(
  rawPixels: RawPixel[],
  gridWidth: number,
  gridHeight: number,
  maxColors: number,
  threads: DMCThread[]
): QuantizationResult {
  const clusterableColors: { r: number; g: number; b: number }[] = []

  rawPixels.forEach(p => {
    if (!p.isTransparent) {
      clusterableColors.push({ r: p.r, g: p.g, b: p.b })
    }
  })

  // 1. Run K-Means Clustering on active pixels
  let centroids: { r: number; g: number; b: number }[] = []

  if (clusterableColors.length > 0) {
    const k = Math.min(maxColors, clusterableColors.length)
    
    // Seed centroids: pick pixels spread across the unique colors list
    const uniqueColorsMap = new Map<string, { r: number; g: number; b: number }>()
    clusterableColors.forEach(p => {
      uniqueColorsMap.set(`${p.r},${p.g},${p.b}`, p)
    })
    const uniqueColors = Array.from(uniqueColorsMap.values())

    if (uniqueColors.length <= k) {
      centroids = [...uniqueColors]
    } else {
      for (let i = 0; i < k; i++) {
        const index = Math.floor((i / k) * uniqueColors.length)
        centroids.push(uniqueColors[index])
      }

      // K-Means clustering loop
      const maxIterations = 6
      for (let iter = 0; iter < maxIterations; iter++) {
        const assignments: { r: number; g: number; b: number }[][] = Array.from({ length: k }, () => [])

        for (const pixel of clusterableColors) {
          let minDistance = Infinity
          let bestCentroidIndex = 0

          for (let cIdx = 0; cIdx < k; cIdx++) {
            const centroid = centroids[cIdx]
            const dist = 
              Math.pow(pixel.r - centroid.r, 2) +
              Math.pow(pixel.g - centroid.g, 2) +
              Math.pow(pixel.b - centroid.b, 2)

            if (dist < minDistance) {
              minDistance = dist
              bestCentroidIndex = cIdx
            }
          }
          assignments[bestCentroidIndex].push(pixel)
        }

        for (let cIdx = 0; cIdx < k; cIdx++) {
          const clusterPixels = assignments[cIdx]
          if (clusterPixels.length === 0) {
            centroids[cIdx] = uniqueColors[Math.floor(Math.random() * uniqueColors.length)]
          } else {
            let sumR = 0, sumG = 0, sumB = 0
            for (const p of clusterPixels) {
              sumR += p.r
              sumG += p.g
              sumB += p.b
            }
            centroids[cIdx] = {
              r: Math.round(sumR / clusterPixels.length),
              g: Math.round(sumG / clusterPixels.length),
              b: Math.round(sumB / clusterPixels.length),
            }
          }
        }
      }
    }
  }

  // 2. Map centroids to closest DMC Threads synchronously (using CIEDE2000 ΔE₀₀)
  const dmcCache = new Map<string, DMCThread>()
  const centroidToDmcMap = new Map<number, DMCThread>()

  centroids.forEach((centroid, index) => {
    const key = `${centroid.r},${centroid.g},${centroid.b}`
    let matchedThread = dmcCache.get(key)
    if (!matchedThread) {
      const scored = rankDmcThreadsByDeltaE(centroid, threads)
      matchedThread = scored[0]
      dmcCache.set(key, matchedThread)
    }
    centroidToDmcMap.set(index, matchedThread)
  })

  // 3. Map all grid pixels to their DMC values
  const cells: StitchCell[] = []
  const dmcCounts = new Map<string, { thread: DMCThread; count: number }>()

  rawPixels.forEach(pixel => {
    if (pixel.isTransparent) {
      cells.push({
        x: pixel.x,
        y: pixel.y,
        r: 0,
        g: 0,
        b: 0,
        dmcCode: '',
        dmcName: 'Transparent',
        symbol: ' ',
        colorId: 'transparent',
        isTransparent: true,
      })
      return
    }

    let minDistance = Infinity
    let bestCentroidIndex = 0
    centroids.forEach((centroid, idx) => {
      const dist =
        Math.pow(pixel.r - centroid.r, 2) +
        Math.pow(pixel.g - centroid.g, 2) +
        Math.pow(pixel.b - centroid.b, 2)
      if (dist < minDistance) {
        minDistance = dist
        bestCentroidIndex = idx
      }
    })

    const dmc = centroidToDmcMap.get(bestCentroidIndex)
    if (!dmc) {
      // Fallback in case of empty threads or centroids
      cells.push({
        x: pixel.x,
        y: pixel.y,
        r: pixel.r,
        g: pixel.g,
        b: pixel.b,
        dmcCode: 'Unmapped',
        dmcName: 'Unmapped color',
        symbol: '?',
        colorId: 'unmapped',
        isTransparent: false,
      })
      return
    }

    const current = dmcCounts.get(dmc.id) || { thread: dmc, count: 0 }
    current.count++
    dmcCounts.set(dmc.id, current)

    cells.push({
      x: pixel.x,
      y: pixel.y,
      r: dmc.rgb.r,
      g: dmc.rgb.g,
      b: dmc.rgb.b,
      dmcCode: dmc.number,
      dmcName: dmc.name,
      symbol: '',
      colorId: dmc.id,
      isTransparent: false,
    })
  })

  // 4. Sort used threads by count and assign unique symbols
  const sortedLegendItems = Array.from(dmcCounts.values())
    .sort((a, b) => b.count - a.count)

  const legendSymbolMap = new Map<string, string>()
  const legend: LegendItem[] = []
  const totalStitchedPixels = sortedLegendItems.reduce((acc, curr) => acc + curr.count, 0)

  sortedLegendItems.forEach((item, index) => {
    const symbol = getSymbolForIndex(index)
    legendSymbolMap.set(item.thread.id, symbol)

    legend.push({
      dmcCode: item.thread.number,
      dmcName: item.thread.name,
      colorId: item.thread.id,
      rgb: item.thread.rgb,
      symbol,
      count: item.count,
      percentage: totalStitchedPixels > 0 ? (item.count / totalStitchedPixels) * 100 : 0,
    })
  })

  cells.forEach(cell => {
    if (!cell.isTransparent) {
      cell.symbol = legendSymbolMap.get(cell.colorId) || ''
    }
  })

  return {
    width: gridWidth,
    height: gridHeight,
    cells,
    legend,
  }
}

/**
 * Resizes an image and returns its DMC-quantized representation.
 * (DOM-dependent wrapper called in client component context).
 */
export function quantizeImageToDmc(
  img: HTMLImageElement,
  fidelity: number,
  maxColors: number,
  threads: DMCThread[]
): QuantizationResult {
  // 1. Calculate grid dimensions
  let gridWidth = fidelity
  let gridHeight = fidelity
  const aspect = img.width / img.height

  if (aspect > 1) {
    gridHeight = Math.max(1, Math.round(fidelity / aspect))
  } else {
    gridWidth = Math.max(1, Math.round(fidelity * aspect))
  }

  // 2. Render onto canvas to fetch image pixel buffer
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = gridWidth
  tempCanvas.height = gridHeight
  const tempCtx = tempCanvas.getContext('2d')
  if (!tempCtx) {
    throw new Error('Could not create offscreen canvas context')
  }
  tempCtx.drawImage(img, 0, 0, gridWidth, gridHeight)
  const imgData = tempCtx.getImageData(0, 0, gridWidth, gridHeight)
  const pixels = imgData.data

  // 3. Assemble RawPixel buffer
  const rawPixels: RawPixel[] = []
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const idx = (y * gridWidth + x) * 4
      const r = pixels[idx]
      const g = pixels[idx + 1]
      const b = pixels[idx + 2]
      const a = pixels[idx + 3]
      const isTransparent = a < 128

      rawPixels.push({ x, y, r, g, b, isTransparent })
    }
  }

  // 4. Delegate to pure logic
  return quantizePixels(rawPixels, gridWidth, gridHeight, maxColors, threads)
}
