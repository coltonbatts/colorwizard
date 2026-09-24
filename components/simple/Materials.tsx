'use client'

/**
 * Colors drawn as the materials they become: a skein of floss and a dab of mixed paint.
 * All shading is derived from the color itself, so nothing on screen adds a color of its own.
 */

import { useId } from 'react'
import styles from './simple.module.css'

function mix(hex: string, toward: '#ffffff' | '#000000', amount: number) {
  const channel = (index: number) => {
    const from = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16)
    const to = toward === '#ffffff' ? 255 : 0
    return Math.round(from + (to - from) * amount).toString(16).padStart(2, '0')
  }
  return `#${channel(0)}${channel(1)}${channel(2)}`
}

/** SVG ids must be unique per instance and safe inside url(#…). */
function useSvgId(name: string) {
  return `${name}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
}

/** A skein of stranded floss, twisted, with its paper band. */
export function ThreadSkein({ hex, className }: { hex: string; className?: string }) {
  const sheen = useSvgId('sheen')
  const twist = useSvgId('twist')
  const body = useSvgId('body')
  const light = mix(hex, '#ffffff', 0.32)
  const dark = mix(hex, '#000000', 0.34)

  return (
    <svg viewBox="0 0 80 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={sheen} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="0.4" stopColor={hex} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <pattern id={twist} width="3" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <rect width="1.3" height="40" fill={dark} opacity="0.45" />
        </pattern>
        <clipPath id={body}>
          <rect x="2" y="8" width="76" height="24" rx="12" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${body})`}>
        <rect x="2" y="8" width="76" height="24" fill={`url(#${sheen})`} />
        <rect x="2" y="8" width="76" height="24" fill={`url(#${twist})`} />
        <rect x="6" y="11.5" width="68" height="2.2" rx="1.1" fill="#ffffff" opacity="0.38" />
      </g>
      <rect x="2.5" y="8.5" width="75" height="23" rx="11.5" fill="none" stroke={dark} strokeOpacity="0.35" />
      {/* The two paper bands every skein comes in: a narrow one with the number, a wide one with the brand. */}
      <rect x="17" y="5" width="9" height="30" rx="1.4" fill="#f7f4ed" stroke="rgba(0,0,0,0.14)" strokeWidth="0.8" />
      <rect x="19" y="18" width="5" height="1" rx="0.5" fill="rgba(0,0,0,0.3)" />
      <rect x="19.5" y="21" width="4" height="1" rx="0.5" fill="rgba(0,0,0,0.2)" />
      <rect x="47" y="4" width="15" height="32" rx="1.6" fill="#f7f4ed" stroke="rgba(0,0,0,0.14)" strokeWidth="0.8" />
      <rect x="50" y="15" width="9" height="1.2" rx="0.6" fill="rgba(0,0,0,0.32)" />
      <rect x="51" y="18.5" width="7" height="1" rx="0.5" fill="rgba(0,0,0,0.2)" />
      <rect x="50.5" y="21.5" width="8" height="1" rx="0.5" fill="rgba(0,0,0,0.2)" />
    </svg>
  )
}

const DAB_PATH = 'M12 36 C8 24 18 12 34 13 C46 6 68 10 72 26 C78 40 66 52 50 50 C38 57 18 52 12 36 Z'
const SWIRL_PATH = 'M20 33 C24 18 52 14 62 29 C69 41 46 50 36 39'

interface PaintDabProps {
  hex: string
  paints: Array<{ id: string; hex: string; weight: number }>
  /** Changes whenever a new mix arrives, replaying the swirl. */
  mixKey: string
  className?: string
}

/** A glossy dab of the mixed color; each paint swirls in, in proportion, then blends away. */
export function PaintDab({ hex, paints, mixKey, className }: PaintDabProps) {
  const clip = useSvgId('dab')
  const depth = useSvgId('depth')
  const dark = mix(hex, '#000000', 0.3)

  return (
    <svg viewBox="0 0 84 64" className={className} aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <path d={DAB_PATH} />
        </clipPath>
        <radialGradient id={depth} cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.18" />
        </radialGradient>
      </defs>
      <ellipse cx="43" cy="56" rx="29" ry="4.5" fill="#000000" opacity="0.1" />
      <path d={DAB_PATH} fill={hex} />
      <g clipPath={`url(#${clip})`} key={mixKey}>
        {paints.map((paint, index) => (
          <g key={paint.id} transform={`rotate(${(360 / paints.length) * index} 42 32)`}>
            <path
              className={styles.swirl}
              d={SWIRL_PATH}
              fill="none"
              stroke={paint.hex}
              strokeWidth={3 + paint.weight * 12}
              strokeLinecap="round"
              style={{ animationDelay: `${index * 50}ms` }}
            />
          </g>
        ))}
      </g>
      <path d={DAB_PATH} fill={`url(#${depth})`} />
      <path d={DAB_PATH} fill="none" stroke={dark} strokeOpacity="0.3" />
      <ellipse cx="30" cy="22" rx="7" ry="3.2" transform="rotate(-18 30 22)" fill="#ffffff" opacity="0.62" />
      <circle cx="40" cy="19.5" r="1.4" fill="#ffffff" opacity="0.55" />
    </svg>
  )
}
