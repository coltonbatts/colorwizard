'use client'

/**
 * What this color is and which colors sit around it. Calculated from the color alone,
 * before any paint or thread is chosen. Every swatch is itself a color you can open.
 */

import { useMemo } from 'react'
import { describeColor, type Relationship } from '@/lib/color/profile'
import BasisNote from './BasisNote'
import { originOf, type PourOrigin } from './pour'
import styles from './simple.module.css'

interface ColorUnderstandingProps {
  hex: string
  onOpenColor: (hex: string, origin?: PourOrigin) => void
}

const GROUPS: { id: Relationship['group']; label: string }[] = [
  { id: 'nearby', label: 'Nearby' },
  { id: 'contrasting', label: 'Contrasting' },
]

export default function ColorUnderstanding({ hex, onOpenColor }: ColorUnderstandingProps) {
  const profile = useMemo(() => describeColor(hex), [hex])
  if (!profile) return null

  return (
    <section className={styles.section} aria-labelledby="understand-heading" data-testid="understanding">
      <div className={styles.sectionHead}>
        <h3 id="understand-heading">This color</h3>
      </div>
      <p className={styles.description}>{profile.description}</p>

      <dl className={styles.meters}>
        <div>
          <dt>Lightness</dt>
          <dd>
            <span className={styles.meter} role="img" aria-label={`Value ${profile.value.toFixed(1)} of 10`}>
              <i style={{ width: `${profile.value * 10}%` }} />
            </span>
            <span>{profile.value.toFixed(1)} of 10</span>
          </dd>
        </div>
        <div>
          <dt>Strength</dt>
          <dd>
            <span className={styles.meter} role="img" aria-label={`Strength ${profile.strengthLabel}`}>
              <i style={{ width: `${Math.round(profile.strength * 100)}%` }} />
            </span>
            <span>{profile.strengthLabel.charAt(0).toUpperCase() + profile.strengthLabel.slice(1)}</span>
          </dd>
        </div>
      </dl>

      {GROUPS.map(({ id, label }) => {
        const items = profile.relationships.filter((relationship) => relationship.group === id)
        if (items.length === 0) return null
        return (
          <div key={id} className={styles.relations} data-group={id}>
            <span className={styles.rowLabel}>{label}</span>
            <ul>
              {items.map((relationship) => (
                <li key={relationship.id}>
                  <button
                    type="button"
                    onClick={(event) => onOpenColor(relationship.hex, originOf(event))}
                    title={`${relationship.hex} · ${relationship.change}`}
                    aria-label={`${relationship.label}: ${relationship.hex}. ${relationship.change}`}
                  >
                    <i style={{ backgroundColor: relationship.hex }} aria-hidden="true" />
                    <span>{relationship.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      <p className={styles.smallNote}>
        Relationships between screen colors, not paint or thread matches.
      </p>
      <BasisNote topic="relationships" />

      <details className={styles.technical}>
        <summary>Technical values</summary>
        <dl>
          <div><dt>Hex</dt><dd>{profile.hex}</dd></div>
          {profile.technical.map((item) => (
            <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>
          ))}
        </dl>
      </details>
    </section>
  )
}
