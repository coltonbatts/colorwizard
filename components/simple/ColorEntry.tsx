'use client'

/** Start from an exact color: type a hex, see it as a color. */

import { useState, type FormEvent } from 'react'
import { parseColorInput } from '@/lib/color/parseColorInput'
import styles from './simple.module.css'

interface ColorEntryProps {
  onSubmit: (hex: string) => void
  onCancel?: () => void
  autoFocus?: boolean
}

export default function ColorEntry({ onSubmit, onCancel, autoFocus }: ColorEntryProps) {
  const [text, setText] = useState('')
  const [invalid, setInvalid] = useState(false)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const hex = parseColorInput(text)
    if (!hex) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    onSubmit(hex)
    setText('')
  }

  return (
    <form className={styles.colorEntry} onSubmit={submit} noValidate>
      <label className={styles.srOnly} htmlFor="color-entry-input">Color as a hex code</label>
      <input
        id="color-entry-input"
        value={text}
        onChange={(event) => { setText(event.target.value); setInvalid(false) }}
        placeholder="#C45C3E"
        autoFocus={autoFocus}
        autoCapitalize="off"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={invalid}
        aria-describedby={invalid ? 'color-entry-error' : undefined}
        onKeyDown={(event) => { if (event.key === 'Escape') onCancel?.() }}
      />
      <button type="submit">Show color</button>
      {invalid && <p id="color-entry-error" role="alert" className={styles.smallNote}>Enter a hex code like #C45C3E or #C53.</p>}
    </form>
  )
}
