/**
 * The pour: a drop of the picked color arcs from where it was picked into the swatch,
 * and the swatch fills outward from where the drop lands.
 */

export interface PourOrigin {
  x: number
  y: number
}

const FLIGHT_MS = 300
const FILL_MS = 260
const DROP_SIZE = 18

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * @param swatch  the swatch frame, showing `previousHex` underneath while the drop is in flight
 * @param fill    the layer painted with the new color, revealed when the drop lands
 */
export function pour(origin: PourOrigin, hex: string, previousHex: string | null, swatch: HTMLElement, fill: HTMLElement) {
  if (prefersReducedMotion()) return

  const target = swatch.getBoundingClientRect()
  // Land a little in from the side the drop comes from, so it reads as flowing in.
  const landX = target.left + target.width * (origin.x < target.left ? 0.22 : 0.5)
  const landY = target.top + target.height * (origin.y > target.bottom ? 0.8 : 0.5)
  const peakY = Math.min(origin.y, landY) - Math.min(80, Math.abs(landX - origin.x) * 0.25 + 24)
  const peakX = origin.x + (landX - origin.x) * 0.55

  const drop = document.createElement('div')
  Object.assign(drop.style, {
    position: 'fixed',
    left: '0px',
    top: '0px',
    width: `${DROP_SIZE}px`,
    height: `${DROP_SIZE}px`,
    borderRadius: '50%',
    background: hex,
    boxShadow: '0 0 0 1.5px rgba(255,255,255,0.9), 0 3px 10px rgba(0,0,0,0.3)',
    pointerEvents: 'none',
    zIndex: '50',
  })
  document.body.appendChild(drop)

  const at = (x: number, y: number, scale: number) =>
    `translate(${x - DROP_SIZE / 2}px, ${y - DROP_SIZE / 2}px) scale(${scale})`
  const flight = drop.animate(
    [
      { transform: at(origin.x, origin.y, 0.3) },
      { transform: at(origin.x, origin.y - 6, 1.1), offset: 0.14 },
      { transform: at(peakX, peakY, 1), offset: 0.55 },
      { transform: at(landX, landY, 0.7) },
    ],
    { duration: FLIGHT_MS, easing: 'cubic-bezier(0.45, 0, 0.35, 1)' },
  )
  flight.onfinish = () => drop.remove()
  flight.oncancel = () => drop.remove()

  // Until the drop lands, show the previous color; then the new one spreads from the landing point.
  swatch.style.backgroundColor = previousHex ?? 'transparent'
  const cx = `${landX - target.left}px`
  const cy = `${landY - target.top}px`
  fill.animate(
    [
      { clipPath: `circle(0px at ${cx} ${cy})` },
      { clipPath: `circle(${Math.hypot(target.width, target.height)}px at ${cx} ${cy})` },
    ],
    { duration: FILL_MS, delay: FLIGHT_MS - 30, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'backwards' },
  )
}
