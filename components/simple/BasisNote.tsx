/** "How this was found": a closed disclosure under each result, naming its basis and what could change it. */

import { BASES, NOT_VERIFIED, type BasisTopic } from '@/lib/color/basis'
import styles from './simple.module.css'

export default function BasisNote({ topic }: { topic: BasisTopic }) {
  const info = BASES[topic]
  return (
    <details className={styles.basis} data-basis={info.basis} data-topic={topic}>
      <summary>
        <span className={styles.basisChip}>{info.label}</span>
        How this was found
      </summary>
      <p>{info.how}</p>
      <p className={styles.basisHead}>What could make the real thing differ</p>
      <ul>
        {info.limits.map((limit) => <li key={limit}>{limit}</li>)}
      </ul>
      <p>{NOT_VERIFIED}</p>
    </details>
  )
}
