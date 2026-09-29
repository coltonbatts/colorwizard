'use client'

/**
 * The printable card: what each pile is, where each goes, how far off it is, in what order to
 * mix them. It is drawn once, off screen, and shown only by the browser's own print (Save as
 * PDF comes with that dialog). It is a direct child of <body> so the print rules can hide
 * everything else: the simple app is a fixed full-screen layer, which prints clipped or as one
 * blank page.
 *
 * Nothing here relies on "background graphics" being switched on in the print dialog: the
 * swatches and number badges are SVG, and the pictures are images. Nothing relies on color
 * either: every pile has its number as text, and swatches have a border.
 */

import { useEffect, useRef } from 'react'
import { CARD, type CardCell, type CardModel } from '@/lib/paint/plan/card'
import type { CardImages } from './planCardImages'
import styles from './planCard.module.css'

/**
 * Page rules that cannot live in a CSS module (they name <html> and <body>). The @page margin
 * and the card's box are chosen together: the card is laid out to fit the smaller of Letter and
 * A4 in each direction inside these margins (see CARD in lib/paint/plan/card.ts).
 *
 * On screen the card is not shown, but it is laid out (off to the side, at the page's width) so
 * its height can be measured before printing.
 */
const PAGE_CSS = `
@page { margin: 10mm; }
@media screen { [data-plan-card] { position: fixed; top: 0; left: -10000px; width: ${CARD.pageWidth}px; visibility: hidden; pointer-events: none; } }
@media print {
  html, body { height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
  body > *:not([data-plan-card]) { display: none !important; }
}
`

function Badge({ number, cx, cy, r, font, unit }: { number: number; cx: number; cy: number; r: number; font: number; unit: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#fff" stroke="#111" strokeWidth={1.25 * unit} />
      <text x={cx} y={cy} dy="0.35em" textAnchor="middle" fontSize={font} fontWeight={700} fill="#111" className={styles.badgeText}>{number}</text>
    </g>
  )
}

function CellBadge({ number }: { number: number }) {
  return (
    <svg className={styles.cellBadge} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <circle cx="8" cy="8" r="7.2" fill="#fff" stroke="#111" strokeWidth="1.25" />
      <text x="8" y="8" dy="0.35em" textAnchor="middle" fontSize="9" fontWeight={700} fill="#111" className={styles.badgeText}>{number}</text>
    </svg>
  )
}

function Cell({ cell }: { cell: CardCell }) {
  return (
    <li className={styles.cell}>
      <CellBadge number={cell.number} />
      <svg className={styles.swatch} viewBox="0 0 30 30" width="30" height="30" aria-hidden="true">
        <rect x="0.75" y="0.75" width="28.5" height="28.5" fill={cell.swatchHex} stroke="#111" strokeWidth="1.5" />
      </svg>
      <div className={styles.cellText}>
        <p className={styles.cellHead}>
          <strong>{cell.name}</strong>
          {cell.fitLabel && <span className={cell.cannotMatch ? styles.cannot : styles.fit}>{cell.fitLabel}</span>}
        </p>
        <p className={styles.recipe}>{cell.recipe}</p>
        <p className={styles.parts}>{cell.partsLine}</p>
        {cell.notes.length > 0 && <p className={styles.cellNotes}>{cell.notes.join(' ')}</p>}
      </div>
      <span className={styles.share}>{cell.share}</span>
    </li>
  )
}

interface PlanCardProps {
  card: CardModel
  images: CardImages
  /** Called when the print dialog closes (or is dismissed) */
  onDone: () => void
  /** Open the print dialog once the pictures are ready. Off when something else drives printing. */
  autoPrint?: boolean
}

export default function PlanCard({ card, images, onDone, autoPrint = true }: PlanCardProps) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!autoPrint) return
    let cancelled = false
    const pictures = Array.from(root.current?.querySelectorAll('img') ?? [])
    const ready = [...pictures.map((img) => img.decode().catch(() => undefined)), document.fonts?.ready]
    Promise.all(ready).then(() => {
      // A plan with many long notes could run past one page: zoom the whole card down until it fits.
      const card = root.current
      if (card && card.scrollHeight > CARD.pageHeight - 4) card.style.zoom = String((CARD.pageHeight - 4) / card.scrollHeight)
      // two frames: let layout settle before the browser takes the page
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

  const unit = card.badgeRadius / CARD.badgeRadius // pile-map pixels per card pixel
  const { width, height } = card.image

  return (
    <div ref={root} className={styles.card} data-plan-card>
      <style>{PAGE_CSS}</style>
      <header className={styles.head}>
        <h1>{card.title}</h1>
        <p className={styles.meta}>{card.metaLine}</p>
      </header>

      <div className={styles.pictures}>
        <figure>
          <div className={styles.frame} style={{ width, height }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a data URL made in this browser, for print: next/image cannot optimize it */}
            <img src={images.original} alt="The original picture" width={width} height={height} />
          </div>
          <figcaption>Original</figcaption>
        </figure>
        <figure>
          <div className={styles.frame} style={{ width, height }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a data URL made in this browser, for print: next/image cannot optimize it */}
            <img src={images.repaint} alt="The picture repainted with the piles" width={width} height={height} />
            <svg className={styles.badges} viewBox={`0 0 ${card.plan.width} ${card.plan.height}`} preserveAspectRatio="none" aria-hidden="true">
              {card.badges.map((badge) => (
                <Badge key={`${badge.number}-${badge.x}-${badge.y}`} number={badge.number} cx={badge.x} cy={badge.y} r={card.badgeRadius} font={card.badgeFont} unit={unit} />
              ))}
            </svg>
          </div>
          <figcaption>
            Repaint, each part in its pile’s color. The numbers say which pile goes where.
            {card.unlabeledNote && <span className={styles.unlabeled}>{card.unlabeledNote}</span>}
          </figcaption>
        </figure>
      </div>

      <section className={styles.summary} aria-label="How close">
        <h2>{card.headline}</h2>
        {card.notes.map((note) => <p key={note} className={styles.summaryNote}>{note}</p>)}
        <dl className={styles.facts}>
          {card.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
        </dl>
      </section>

      <section className={styles.mix} aria-label="Order and unit">
        <p><strong>{card.mixOrderLabel}</strong> {card.mixOrder.join(' → ')}</p>
        <p><strong>{card.partsLabel}</strong> <span className={styles.blank} /></p>
      </section>

      <div className={styles.piles}>
        {card.columns.map((column, index) => (
          <ol key={index}>{column.map((cell) => <Cell key={cell.number} cell={cell} />)}</ol>
        ))}
      </div>

      <footer className={styles.caveats}>
        {card.caveats.map((line) => <p key={line}>{line}</p>)}
      </footer>
    </div>
  )
}
