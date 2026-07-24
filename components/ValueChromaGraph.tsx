'use client'

import { useMemo } from 'react'
import { getPainterValue, getPainterChroma } from '@/lib/paintingMath'
import { hexToRgb, rgbToHsl } from '@/lib/color/conversions'

interface ValueChromaGraphProps {
  color: string // Hex or CSS string
}

function getTemperature(colorHex: string): { label: string; score: number } {
  const rgb = hexToRgb(colorHex)
  if (!rgb) return { label: 'Neutral', score: 0.5 }
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const h = hsl.h // 0-360

  // Warm angles: 0-60 (red to yellow), 300-360 (magenta to red)
  // Cool angles: 150-250 (cyan to blue)
  if ((h >= 0 && h <= 65) || h >= 300) {
    const dist = h >= 300 ? (360 - h) : h
    const score = Math.max(0.6, 1 - dist / 90)
    return { label: 'Warm', score }
  } else if (h >= 150 && h <= 250) {
    const dist = Math.abs(h - 200)
    const score = Math.max(0.6, 1 - dist / 80)
    return { label: 'Cool', score }
  } else {
    return { label: 'Neutral', score: 0.5 }
  }
}

export default function ValueChromaGraph({ color }: ValueChromaGraphProps) {
  const { value, chroma, chromaObj, temp, x, y } = useMemo(() => {
    const val = getPainterValue(color) // 0-10
    const chrObj = getPainterChroma(color)
    const chr = chrObj.value // 0-~0.4
    const t = getTemperature(color)

    // Dimensions for SVG ViewBox (0 0 240 140)
    const width = 240
    const height = 140
    const paddingLeft = 32
    const paddingBottom = 24
    const graphW = width - paddingLeft - 12
    const graphH = height - paddingBottom - 12

    const yPos = 12 + (10 - val) / 10 * graphH
    const xPos = paddingLeft + Math.min(1, chr / 0.35) * graphW

    return { value: val, chroma: chr, chromaObj: chrObj, temp: t, x: xPos, y: yPos }
  }, [color])

  return (
    <div className="w-full rounded-2xl border border-ink-hairline bg-paper-elevated p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-muted">
            Perceptual Metrics
          </span>
          <h4 className="font-serif text-sm font-semibold tracking-tight text-ink">
            Munsell Value & Chroma
          </h4>
        </div>
        <span className="rounded-md border border-ink-hairline bg-paper-recessed px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-secondary">
          Munsell Scale
        </span>
      </div>

      {/* Numerical Readout Grid */}
      <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl border border-ink-hairline bg-paper p-2.5">
        <div className="flex flex-col items-center text-center">
          <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-ink-muted">Value</span>
          <span className="font-mono text-xs font-bold tabular-nums text-ink">{value.toFixed(1)} / 10</span>
        </div>
        <div className="flex flex-col items-center text-center border-x border-ink-hairline px-1">
          <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-ink-muted">Chroma</span>
          <span className="font-mono text-xs font-bold uppercase tracking-wide text-ink">{chromaObj.label}</span>
        </div>
        <div className="flex flex-col items-center text-center">
          <span className="text-[9px] font-medium uppercase tracking-[0.08em] text-ink-muted">Temp</span>
          <span className={`font-mono text-xs font-bold tracking-wide ${
            temp.label === 'Warm' ? 'text-signal' : temp.label === 'Cool' ? 'text-subsignal' : 'text-ink'
          }`}>
            {temp.label}
          </span>
        </div>
      </div>

      {/* SVG Graph */}
      <div className="relative w-full aspect-[240/140]">
        <svg
          viewBox="0 0 240 140"
          className="h-full w-full select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern id="paper-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(26,26,26,0.06)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Grid Background */}
          <rect x="32" y="12" width="196" height="104" fill="url(#paper-grid)" />
          <rect x="32" y="12" width="196" height="104" fill="none" stroke="rgba(26,26,26,0.12)" strokeWidth="1" />

          {/* Axes & Ticks */}
          <line x1="32" y1="12" x2="32" y2="116" stroke="rgba(26,26,26,0.25)" strokeWidth="1" />
          <line x1="32" y1="116" x2="228" y2="116" stroke="rgba(26,26,26,0.25)" strokeWidth="1" />

          {/* Y Axis Numerals */}
          <text x="26" y="16" textAnchor="end" fill="rgba(26,26,26,0.5)" fontSize="9" fontFamily="monospace" className="tabular-nums">10</text>
          <text x="26" y="66" textAnchor="end" fill="rgba(26,26,26,0.5)" fontSize="9" fontFamily="monospace" className="tabular-nums">5</text>
          <text x="26" y="116" textAnchor="end" fill="rgba(26,26,26,0.5)" fontSize="9" fontFamily="monospace" className="tabular-nums">0</text>

          {/* Axis Labels */}
          <text x="14" y="64" textAnchor="middle" fill="rgba(26,26,26,0.6)" fontSize="9" fontWeight="600" fontFamily="sans-serif" transform="rotate(-90, 14, 64)" letterSpacing="0.08em">VALUE</text>
          <text x="130" y="132" textAnchor="middle" fill="rgba(26,26,26,0.6)" fontSize="9" fontWeight="600" fontFamily="sans-serif" letterSpacing="0.08em">CHROMA</text>

          {/* Target Crosshairs */}
          <line x1="32" y1={y} x2={x} y2={y} stroke="rgba(26,26,26,0.35)" strokeWidth="1" strokeDasharray="3 3" />
          <line x1={x} y1={y} x2={x} y2="116" stroke="rgba(26,26,26,0.35)" strokeWidth="1" strokeDasharray="3 3" />

          {/* Data Marker */}
          <circle
            cx={x}
            cy={y}
            r="7"
            fill={color}
            stroke="#FAFAF7"
            strokeWidth="2"
            className="transition-all duration-300 ease-out"
          />
          <circle
            cx={x}
            cy={y}
            r="8"
            fill="none"
            stroke="rgba(26,26,26,0.4)"
            strokeWidth="1"
          />
        </svg>
      </div>

      <div className="mt-2 flex justify-between font-mono text-[10px] text-ink-muted">
        <span>Neutral / Muted</span>
        <span>Vivid / Intense</span>
      </div>
    </div>
  )
}

