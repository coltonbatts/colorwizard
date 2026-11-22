import { columnLabel, gridSegments, type CanvasFace, type ImageCrop, type ImagePoint } from '@/lib/paint/canvasSetup'

export function cropCanvas(source: HTMLCanvasElement, crop: ImageCrop): HTMLCanvasElement {
  if (crop.width === source.width && crop.height === source.height) return source
  const result = document.createElement('canvas')
  result.width = Math.max(1, Math.round(crop.width))
  result.height = Math.max(1, Math.round(crop.height))
  const ctx = result.getContext('2d', { alpha: false, willReadFrequently: true })
  if (!ctx) throw new Error('Canvas context unavailable')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, result.width, result.height)
  return result
}

export function drawTransferOverlay(
  ctx: CanvasRenderingContext2D,
  image: ImageCrop,
  face: CanvasFace,
  landmarks: Array<{ index: number; position: ImagePoint | null; isTrial: boolean }>,
  showGrid: boolean,
) {
  const { x, y, width, height } = image
  const columns = gridSegments(face.width)
  const rows = gridSegments(face.height)
  const scaleX = width / face.width
  const scaleY = height / face.height
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.clip()
  if (showGrid) {
    ctx.beginPath()
    ctx.rect(x + 0.5, y + 0.5, Math.max(0, width - 1), Math.max(0, height - 1))
    for (const { start } of columns.slice(1)) {
      ctx.moveTo(x + start * scaleX, y)
      ctx.lineTo(x + start * scaleX, y + height)
    }
    for (const { start } of rows.slice(1)) {
      ctx.moveTo(x, y + start * scaleY)
      ctx.lineTo(x + width, y + start * scaleY)
    }
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(16, 16, 12, 0.8)'
    ctx.stroke()
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(255, 246, 220, 0.68)'
    ctx.stroke()

    const label = (text: string, cx: number, cy: number) => {
      ctx.strokeText(text, cx, cy)
      ctx.fillText(text, cx, cy)
    }
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 3
    ctx.strokeStyle = '#181711'
    ctx.fillStyle = '#fff5d7'
    columns.forEach(({ start, end }, i) => {
      if ((end - start) * scaleX >= 14) label(columnLabel(i), x + (start + end) * scaleX / 2, y + 9)
    })
    rows.forEach(({ start, end }, i) => {
      if ((end - start) * scaleY >= 14) label(String(i + 1), x + 10, y + (start + end) * scaleY / 2)
    })
  }
  for (const { index, position, isTrial } of landmarks) {
    if (!position) continue
    const cx = x + position.x * scaleX
    const cy = y + position.y * scaleY
    ctx.beginPath()
    ctx.arc(cx, cy, 3, 0, 2 * Math.PI)
    ctx.lineWidth = 1.5
    ctx.strokeStyle = '#1b1710'
    ctx.fillStyle = isTrial ? '#f8c27b' : '#fff5d7'
    ctx.fill()
    ctx.stroke()
    ctx.font = 'bold 10px monospace'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    const labelX = Math.max(x + 9, Math.min(x + width - 9, cx + 9))
    const labelY = Math.max(y + 8, Math.min(y + height - 8, cy - 8))
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    ctx.strokeText(String(index), labelX, labelY)
    ctx.fillText(String(index), labelX, labelY)
  }
  ctx.restore()
}
