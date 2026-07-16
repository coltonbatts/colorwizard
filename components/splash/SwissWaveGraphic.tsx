import type { CSSProperties } from 'react'

const WAVE_PALETTE = [
  '#f0efe7', '#f0efe7', '#f0efe7', '#ff5a36', '#f0efe7', '#f0efe7',
  '#42c7e8', '#f0efe7', '#f0efe7', '#f0efe7', '#f6cc43', '#f0efe7',
  '#f0efe7', '#ec4aa8', '#f0efe7', '#f0efe7', '#80cf5b', '#f0efe7',
  '#f0efe7', '#7964e8', '#f0efe7', '#f0efe7', '#ff795b', '#f0efe7',
]

const WAVE_ROWS = Array.from({ length: 24 }, (_, row) => {
  const baseY = 52 + row * 25.2
  const center = 470 + Math.sin(row * 0.58) * 78

  return Array.from({ length: 57 }, (_, point) => {
    const x = point * (1000 / 56)
    const distance = (x - center) / 235
    const envelope = Math.exp(-(distance * distance))
    const pulse = Math.max(0, Math.sin(point * 0.52 + row * 0.71))
    const fine = Math.sin(point * 1.13 - row * 0.33) * 5
    const lift = envelope * (20 + row * 0.95) * (0.28 + pulse * 0.72) + envelope * fine
    const y = baseY - lift - Math.sin(point * 0.18 + row) * 1.8
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
})

interface SwissWaveGraphicProps {
  className?: string
}

export default function SwissWaveGraphic({ className = '' }: SwissWaveGraphicProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 1000 680"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {WAVE_ROWS.map((points, index) => (
        <polyline
          key={index}
          points={points}
          className="splash-wave-line"
          style={{ '--wave-row': index, color: WAVE_PALETTE[index] } as CSSProperties}
        />
      ))}
    </svg>
  )
}
