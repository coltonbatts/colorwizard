export type WorkbenchLayoutMode = 'wide' | 'medium' | 'narrow'

const WIDE_MIN_WIDTH = 1520
const WIDE_MIN_HEIGHT = 860
/** Typical 13–15" laptops (1280–1440 CSS px) stay side-by-side, not stacked. */
const MEDIUM_MIN_WIDTH = 1180
const MEDIUM_MIN_HEIGHT = 680

export function getWorkbenchLayoutMode(width: number, height: number): WorkbenchLayoutMode {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 'wide'
  }

  if (width >= WIDE_MIN_WIDTH && height >= WIDE_MIN_HEIGHT) {
    return 'wide'
  }

  if (width >= MEDIUM_MIN_WIDTH && height >= MEDIUM_MIN_HEIGHT) {
    return 'medium'
  }

  return 'narrow'
}
