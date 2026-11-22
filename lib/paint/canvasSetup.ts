/** Transfer geometry uses the decoded reference. Persisted points are normalized to its full extent. */
export interface CanvasFace {
  width: number
  height: number
}

export interface ImagePoint {
  x: number
  y: number
}

export interface ImageCrop extends CanvasFace, ImagePoint {}

export interface MixTrial {
  hex: string
  measured: string
  correction: string
  acceptedPalette: string | null
}

export interface CanvasLandmark extends ImagePoint {
  id: string
  name: string
  trial?: MixTrial
}

export interface CanvasSpan {
  from: string
  to: string
}

export interface CanvasDraft {
  face: CanvasFace
  grid: boolean
  landmarks: CanvasLandmark[]
  spans: CanvasSpan[]
  volumeUnit: string
}

export const DEFAULT_FACE = { width: 24, height: 30 }
export const GRID_INCHES = 3
export const CANVAS_DRAFT_KEY = 'colorwizard-canvas-setup-v1'

export function validFace(face: CanvasFace): boolean {
  return [face.width, face.height].every((edge) => Number.isFinite(edge) && edge >= 0.125 && edge <= 240)
}

export function newCanvasDraft(face: CanvasFace): CanvasDraft {
  return { face, grid: true, landmarks: [], spans: [], volumeUnit: '' }
}

export function centeredCrop(source: CanvasFace, face: CanvasFace): ImageCrop {
  const scale = Math.min(source.width / face.width, source.height / face.height)
  const width = Math.min(source.width, face.width * scale)
  const height = Math.min(source.height, face.height * scale)
  return { x: (source.width - width) / 2, y: (source.height - height) / 2, width, height }
}

export function referencePoint(point: ImagePoint, source: CanvasFace, crop: ImageCrop): ImagePoint {
  return { x: (crop.x + point.x * crop.width) / source.width, y: (crop.y + point.y * crop.height) / source.height }
}

export function canvasPosition(point: ImagePoint, source: CanvasFace, crop: ImageCrop, face: CanvasFace): ImagePoint | null {
  const x = (point.x * source.width - crop.x) / crop.width
  const y = (point.y * source.height - crop.y) / crop.height
  const epsilon = 1e-9
  if (x < -epsilon || y < -epsilon || x > 1 + epsilon || y > 1 + epsilon) return null
  return { x: Math.max(0, Math.min(1, x)) * face.width, y: Math.max(0, Math.min(1, y)) * face.height }
}

export function transferMeasurements(draft: CanvasDraft, source: CanvasFace, crop: ImageCrop) {
  const landmarks = draft.landmarks.map((mark, index) => ({
    mark,
    index: index + 1,
    position: canvasPosition(mark, source, crop, draft.face),
  }))
  const spans = draft.spans.flatMap((span) => {
    const from = landmarks.find(({ mark }) => mark.id === span.from)
    const to = landmarks.find(({ mark }) => mark.id === span.to)
    if (!from || !to) return []
    const distance = from.position && to.position
      ? Math.hypot(from.position.x - to.position.x, from.position.y - to.position.y)
      : null
    return [{ ...span, fromName: from.mark.name, toName: to.mark.name, distance }]
  })
  return { landmarks, spans }
}

export function formatInches(value: number): string {
  const eighths = Math.round(value * 8)
  const whole = Math.floor(eighths / 8)
  const fractions = ['', '⅛', '¼', '⅜', '½', '⅝', '¾', '⅞']
  const fraction = fractions[eighths % 8]
  return whole && fraction ? `${whole} ${fraction}` : fraction || String(whole)
}

export function gridSegments(edge: number): Array<{ start: number; end: number }> {
  return Array.from({ length: Math.ceil(edge / GRID_INCHES) }, (_, i) => ({
    start: i * GRID_INCHES,
    end: Math.min((i + 1) * GRID_INCHES, edge),
  }))
}

export function columnLabel(index: number): string {
  const letter = String.fromCharCode(65 + index % 26)
  return index < 26 ? letter : columnLabel(Math.floor(index / 26) - 1) + letter
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isText(value: unknown, limit: number): value is string {
  return typeof value === 'string' && value.length <= limit
}

function isPointCoordinate(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 1
}

function isTrial(value: unknown): value is MixTrial {
  return isRecord(value) && typeof value.hex === 'string' && /^#[0-9a-f]{6}$/i.test(value.hex)
    && isText(value.measured, 500) && isText(value.correction, 500)
    && (value.acceptedPalette === null || isText(value.acceptedPalette, 12000))
}

function isLandmark(value: unknown): value is CanvasLandmark {
  return isRecord(value) && isText(value.id, 50) && isText(value.name, 80)
    && isPointCoordinate(value.x) && isPointCoordinate(value.y)
    && (value.trial === undefined || isTrial(value.trial))
}

export function loadCanvasDraft(storage: Pick<Storage, 'getItem'>, pictureKey: string): CanvasDraft | null {
  const raw = storage.getItem(CANVAS_DRAFT_KEY)
  if (!raw) return null
  const saved: unknown = JSON.parse(raw)
  if (!isRecord(saved) || saved.version !== 1 || saved.pictureKey !== pictureKey) return null
  const draft = saved.draft
  if (!isRecord(draft) || !isRecord(draft.face)
    || typeof draft.face.width !== 'number' || typeof draft.face.height !== 'number'
    || !validFace({ width: draft.face.width, height: draft.face.height })
    || typeof draft.grid !== 'boolean' || !isText(draft.volumeUnit, 80)
    || !Array.isArray(draft.landmarks) || !draft.landmarks.every(isLandmark)
    || !Array.isArray(draft.spans)) return null
  const ids = new Set(draft.landmarks.map((mark) => mark.id))
  if (ids.size !== draft.landmarks.length) return null
  const spans = draft.spans.filter((span): span is CanvasSpan =>
    isRecord(span) && typeof span.from === 'string' && typeof span.to === 'string'
    && span.from !== span.to && ids.has(span.from) && ids.has(span.to))
  return { face: { width: draft.face.width, height: draft.face.height }, grid: draft.grid, landmarks: draft.landmarks, spans, volumeUnit: draft.volumeUnit }
}

export function storeCanvasDraft(storage: Pick<Storage, 'setItem'>, pictureKey: string, draft: CanvasDraft): void {
  storage.setItem(CANVAS_DRAFT_KEY, JSON.stringify({ version: 1, pictureKey, draft }))
}

export async function canvasPictureKey(file: Blob): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null
  try {
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}
