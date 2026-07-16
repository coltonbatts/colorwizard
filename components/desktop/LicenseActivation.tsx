/**
 * LicenseActivation - Modal shown when no valid license key is found in Tauri.
 * Prompts the user to unlock the local app copy.
 */
'use client'

import { useState, useEffect, useCallback, useId, useRef } from 'react'
import { isDesktopApp } from '@/lib/desktop/detect'
import { validateLicenseKey, setLicenseKey, getLicenseKey } from '@/lib/desktop/tauriClient'

interface LicenseActivationProps {
  onActivated: () => void
  demo?: boolean
}

export default function LicenseActivation({ onActivated, demo = false }: LicenseActivationProps) {
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  useEffect(() => {
    if (!isDesktopApp()) {
      setHasChecked(true)
      return
    }

    getLicenseKey().then((existingKey) => {
      if (existingKey) {
        onActivated()
      }
      setHasChecked(true)
    }).catch(() => {
      setHasChecked(true)
    })
  }, [onActivated])

  const handleValidate = useCallback(async () => {
    if (!key.trim()) {
      setError('Please enter a license key')
      return
    }

    setIsValidating(true)
    setError(null)

    const trimmed = key.trim().toUpperCase()
    const valid = await validateLicenseKey(trimmed)

    if (valid) {
      await setLicenseKey(trimmed)
      onActivated()
    } else {
      setError('Invalid license key. Please check and try again.')
    }

    setIsValidating(false)
  }, [key, onActivated])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleValidate()
    }
  }

  const formatKey = (raw: string): string => {
    const hex = raw.toUpperCase().replace(/[^A-F0-9]/g, '')
    const parts = ['CW']
    if (hex.length > 0) parts.push(hex.slice(0, 4))
    if (hex.length > 4) parts.push(hex.slice(4, 8))
    if (hex.length > 8) parts.push(hex.slice(8, 12))
    return parts.join('-')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cursorPos = e.target.selectionStart || 0
    const beforeFormat = e.target.value

    const formatted = formatKey(beforeFormat)

    const hexBefore = beforeFormat.slice(0, cursorPos).replace(/[^A-Fa-f0-9]/g, '')
    const baseLen = 3
    let newCursor = baseLen
    newCursor += Math.min(hexBefore.length, 4)
    if (hexBefore.length > 4) newCursor += 1
    newCursor += Math.min(Math.max(hexBefore.length - 4, 0), 4)
    if (hexBefore.length > 8) newCursor += 1
    newCursor += Math.min(Math.max(hexBefore.length - 8, 0), 4)

    setKey(formatted)

    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newCursor, newCursor)
      }
    })

    setError(null)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text')
    const formatted = formatKey(pasted)
    setKey(formatted)
    setError(null)
  }

  if (!isDesktopApp() || !hasChecked) return null

  if (demo) {
    return null
  }

  return (
    <div className="license-activation fixed inset-0 z-[100] flex items-center justify-center bg-paper-shell p-6">
      <div className="license-activation-panel w-full max-w-md border-t border-ink pt-5 text-ink">
        <div className="mb-8">
          <p className="text-section">Desktop activation</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            ColorWizard Pro
          </h2>
          <p className="mt-2 text-sm text-ink-secondary">
            Enter the license key for this Mac.
          </p>
        </div>

        <div className="mb-4">
          <label htmlFor={inputId} className="mb-2 block text-sm font-semibold">
            License key
          </label>
          <input
            id={inputId}
            name="license-key"
            ref={inputRef}
            type="text"
            value={key}
            onChange={handleChange}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder="CW-XXXX-XXXX-XXXX"
            maxLength={15}
            aria-describedby={error ? `${inputId}-error` : undefined}
            aria-invalid={Boolean(error)}
            className={`min-h-12 w-full border bg-paper-elevated px-4 py-3 text-center font-mono text-lg tracking-widest text-ink placeholder:text-ink-faint transition-colors ${
              error ? 'border-danger' : 'border-ink-hairline focus:border-ink'
            }`}
            disabled={isValidating}
            autoFocus
          />
          {error && (
            <p id={`${inputId}-error`} className="mt-2 text-sm text-danger">{error}</p>
          )}
        </div>

        <button
          type="button"
          onClick={handleValidate}
          disabled={!key.trim() || isValidating}
          className="mb-6 min-h-12 w-full border border-ink bg-ink px-5 font-semibold text-paper-elevated transition-colors hover:bg-graphite disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isValidating ? 'Validating...' : 'Unlock'}
        </button>

        <div className="border-t border-ink-hairline pt-4">
          <p className="text-xs text-ink-muted">
            Activation is stored locally on this Mac.
          </p>
        </div>
      </div>
    </div>
  )
}
