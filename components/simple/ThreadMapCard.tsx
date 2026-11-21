'use client'

/**
 * 1-page printable Studio Thread Map reference sheet.
 * Follows the exact battle-tested print architecture of PlanCard.tsx:
 * - Portaled to a direct child of <body> only while printing (`[data-thread-map-card]`).
 * - Fits US Letter and A4 (718 × 980 CSS px inside 10 mm margins), auto-zoomed down if tall.
 * - Survives grayscale and "Background graphics: off": pictures are <img>, swatches and
 *   number badges are bordered SVG, and Have/Need boxes are printed text `[ ]` / `[x]`.
 */

import { useEffect, useRef } from 'react'
import {
  THREAD_MAP_CARD,
  type ThreadMapCardCell,
  type ThreadMapCardModel,
} from '@/lib/dmc/map/card'
import type { ThreadMapImages } from './threadMapImages'
import styles from './threadMapCard.module.css'

const PAGE_CSS = `
@page { margin: 10mm; }
@media screen { [data-thread-map-card] { position: fixed; top: 0; left: -10000px; width: ${THREAD_MAP_CARD.pageWidth}px; visibility: hidden; pointer-events: none; } }
@media print {
  html, body { height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
  body > *:not([data-thread-map-card]) { display: none !important; }
}
`

function Badge({
  number,
  cx,
  cy,
  r,
  font,
  unit,
}: {
  number: number
  cx: number
  cy: number
  r: number
  font: number
  unit: number
}) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#fff" stroke="#111" strokeWidth={1.25 * unit} />
      <text
        x={cx}
        y={cy}
        dy="0.35em"
        textAnchor="middle"
        fontSize={font}
        fontWeight={700}
        fill="#111"
        className={styles.badgeText}
      >
        {number}
      </text>
    </g>
  )
}

function CellBadge({ number }: { number: number }) {
  return (
    <svg className={styles.cellBadge} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <circle cx="8" cy="8" r="7.2" fill="#fff" stroke="#111" strokeWidth="1.25" />
      <text
        x="8"
        y="8"
        dy="0.35em"
        textAnchor="middle"
        fontSize="8.5"
        fontWeight={700}
        fill="#111"
        className={styles.badgeText}
      >
        {number}
      </text>
    </svg>
  )
}

function Cell({ cell }: { cell: ThreadMapCardCell }) {
  return (
    <li className={styles.cell}>
      <CellBadge number={cell.number} />
      <svg className={styles.swatch} viewBox="0 0 26 26" width="26" height="26" aria-hidden="true">
        <rect x="0.75" y="0.75" width="24.5" height="24.5" fill={cell.swatchHex} stroke="#111" strokeWidth="1.5" />
      </svg>
      <div className={styles.cellText}>
        <p className={styles.cellHead}>
          <strong className={styles.dmcCode}>DMC {cell.dmcNumber}</strong>
          <span className={styles.threadName}>{cell.name}</span>
        </p>
        <p className={styles.detail}>{cell.detail}</p>
      </div>
      <span className={styles.share}>{cell.share}</span>
      <span className={styles.checkBox} aria-label={cell.owned ? 'Have' : 'Need'}>
        {cell.owned ? '[x]' : '[ ]'}
      </span>
    </li>
  )
}

function CompactCell({ cell }: { cell: ThreadMapCardCell }) {
  return (
    <li className={styles.compactCell}>
      <CellBadge number={cell.number} />
      <span className={styles.compactText}>
        <strong className={styles.dmcCode}>DMC {cell.dmcNumber}</strong>{' '}
        <span className={styles.threadName}>{cell.name}</span>
      </span>
      <span className={styles.share}>{cell.share}</span>
      <span className={styles.checkBox} aria-label={cell.owned ? 'Have' : 'Need'}>
        {cell.owned ? '[x]' : '[ ]'}
      </span>
    </li>
  )
}

export interface ThreadMapCardProps {
  card: ThreadMapCardModel
  images: ThreadMapImages
  onDone: () => void
  autoPrint?: boolean
}

export default function ThreadMapCard({
  card,
  images,
  onDone,
  autoPrint = true,
}: ThreadMapCardProps) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!autoPrint) return
    let cancelled = false
    const pictures = Array.from(root.current?.querySelectorAll('img') ?? [])
    const ready = [...pictures.map((img) => img.decode().catch(() => undefined)), document.fonts?.ready]
    Promise.all(ready).then(() => {
      const node = root.current
      if (node && node.scrollHeight > THREAD_MAP_CARD.pageHeight - 4) {
        node.style.zoom = String((THREAD_MAP_CARD.pageHeight - 4) / node.scrollHeight)
      }
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!cancelled) window.print()
        }),
      )
    })
    const done = () => onDone()
    window.addEventListener('afterprint', done, { once: true })
    return () => {
      cancelled = true
      window.removeEventListener('afterprint', done)
    }
  }, [autoPrint, onDone])

  const unit = card.badgeRadius / (card.variant === 'transfer-outline' ? 7 : THREAD_MAP_CARD.badgeRadius)
  const { width, height } = card.image

  if (card.variant === 'transfer-outline') {
    const outlineSrc = images.outline || images.repaint
    return (
      <div ref={root} className={styles.card} data-thread-map-card data-variant="transfer-outline">
        <style>{PAGE_CSS}</style>
        <header className={styles.head}>
          <h1>{card.title}</h1>
          <p className={styles.meta}>{card.metaLine}</p>
        </header>

        <figure className={styles.outlineFigure}>
          <div className={styles.frame} style={{ width, height }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local browser data URL for print */}
            <img
              src={outlineSrc}
              alt={card.mirror ? 'Mirrored fabric transfer outline' : 'Fabric transfer outline'}
              width={width}
              height={height}
            />
            {card.showNumbers && card.badges.length > 0 && (
              <svg
                className={styles.badges}
                viewBox={`0 0 ${card.map.width} ${card.map.height}`}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {card.badges.map((badge) => (
                  <Badge
                    key={`${badge.number}-${badge.x}-${badge.y}`}
                    number={badge.number}
                    cx={badge.x}
                    cy={badge.y}
                    r={card.badgeRadius}
                    font={card.badgeFont}
                    unit={unit}
                  />
                ))}
              </svg>
            )}
          </div>
          <figcaption className={styles.outlineCaption}>
            {card.mirror
              ? 'Mirrored B&W fabric transfer outline (ready for back-side or iron-on transfer).'
              : 'B&W fabric transfer outline (ready for lightbox, window, or water-soluble stabilizer tracing).'}
            {card.unlabeledNote && <span className={styles.unlabeled}>{card.unlabeledNote}</span>}
          </figcaption>
        </figure>

        <p className={styles.orderBar}>{card.orderNote}</p>

        <div
          className={card.keyColumns.length === 3 ? styles.compactThreads3 : styles.compactThreads2}
        >
          {card.keyColumns.map((column, colIdx) => (
            <ol key={colIdx}>
              {column.map((cell) => <CompactCell key={cell.number} cell={cell} />)}
            </ol>
          ))}
        </div>

        <footer className={styles.caveats}>
          {card.caveats.map((line) => <p key={line}>{line}</p>)}
        </footer>
      </div>
    )
  }

  return (
    <div ref={root} className={styles.card} data-thread-map-card data-variant="color-map">
      <style>{PAGE_CSS}</style>
      <header className={styles.head}>
        <h1>{card.title}</h1>
        <p className={styles.meta}>{card.metaLine}</p>
      </header>

      <div className={styles.pictures}>
        <figure>
          <div className={styles.frame} style={{ width, height }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local browser data URL for print */}
            <img src={images.original} alt="Original reference photo" width={width} height={height} />
          </div>
          <figcaption>Original</figcaption>
        </figure>
        <figure>
          <div className={styles.frame} style={{ width, height }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local browser data URL for print */}
            <img src={images.repaint} alt="Painterly DMC thread map" width={width} height={height} />
            <svg
              className={styles.badges}
              viewBox={`0 0 ${card.map.width} ${card.map.height}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {card.badges.map((badge) => (
                <Badge
                  key={`${badge.number}-${badge.x}-${badge.y}`}
                  number={badge.number}
                  cx={badge.x}
                  cy={badge.y}
                  r={card.badgeRadius}
                  font={card.badgeFont}
                  unit={unit}
                />
              ))}
            </svg>
          </div>
          <figcaption>
            Painterly thread map. Numbers match the DMC key below (lightest to darkest).
            {card.unlabeledNote && <span className={styles.unlabeled}>{card.unlabeledNote}</span>}
          </figcaption>
        </figure>
      </div>

      <section className={styles.summary} aria-label="Thread map summary">
        <h2>{card.headline}</h2>
        {card.notes.map((note) => <p key={note} className={styles.summaryNote}>{note}</p>)}
        <dl className={styles.facts}>
          {card.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className={styles.orderBar}>{card.orderNote}</p>

      <div className={styles.threads}>
        {card.columns.map((column, colIdx) => (
          <ol key={colIdx}>
            {column.map((cell) => <Cell key={cell.number} cell={cell} />)}
          </ol>
        ))}
      </div>

      <footer className={styles.caveats}>
        {card.caveats.map((line) => <p key={line}>{line}</p>)}
      </footer>
    </div>
  )
}
