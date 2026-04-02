/**
 * LicenseActivation - Modal shown when no valid license key is found in Tauri.
 * Prompts user to enter their key or directs them to purchase.
 */
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  isTauri,
  validateLicenseKey,
  setLicenseKey,
  getLicenseKey,
} from '@/lib/tauri'

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

  // Check for existing valid key on mount
  useEffect(() => {
    if (!isTauri()) {
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
  }, [])

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

  // Simple formatter: strip non-hex chars, insert dashes, preserve "CW-" prefix
  const formatKey = (raw: string): string => {
    // Strip everything that isn't a hex digit
    const hex = raw.toUpperCase().replace(/[^A-F0-9]/g, '')
    // Build CW-XXXX-XXXX-XXXX from raw hex chars
    const parts = ['CW']
    if (hex.length > 0) parts.push(hex.slice(0, 4))
    if (hex.length > 4) parts.push(hex.slice(4, 8))
    if (hex.length > 8) parts.push(hex.slice(8, 12))
    return parts.join('-')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Get cursor position before reformat
    const cursorPos = e.target.selectionStart || 0
    const beforeFormat = e.target.value

    const formatted = formatKey(beforeFormat)

    // Calculate new cursor position
    // Count hex chars before cursor in original
    const hexBefore = beforeFormat.slice(0, cursorPos).replace(/[^A-Fa-f0-9]/g, '')
    const baseLen = 3 // "CW-"
    let newCursor = baseLen
    newCursor += Math.min(hexBefore.length, 4)
    if (hexBefore.length > 4) newCursor += 1 // dash
    newCursor += Math.min(Math.max(hexBefore.length - 4, 0), 4)
    if (hexBefore.length > 8) newCursor += 1 // dash
    newCursor += Math.min(Math.max(hexBefore.length - 8, 0), 4)

    setKey(formatted)

    // Restore cursor position on next render
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

  if (!isTauri() || !hasChecked) return null

  if (demo) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#f5f0e8] rounded-2xl shadow-2xl max-w-md w-full p-8 border border-[#e5e0d8]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1a1a1a] mb-4">
            <span className="text-2xl font-serif text-[#f5f0e8] font-bold">C</span>
          </div>
          <h2 className="text-xl font-bold text-[#1a1a1a] mb-1">
            Activate ColorWizard
          </h2>
          <p className="text-sm text-[#666]">
            Enter your license key to get started
          </p>
        </div>

        {/* Key Input */}
        <div className="mb-4">
          <label className="block text-xs font-bold uppercase tracking-[0.15em] text-[#999] mb-2">
            License Key
          </label>
          <input
            ref={inputRef}
            type="text"
            value={key}
            onChange={handleChange}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder="CW-XXXX-XXXX-XXXX"
            maxLength={15}
            className={`w-full bg-white border-2 rounded-xl px-4 py-3 text-lg font-mono text-center tracking-widest text-[#1a1a1a] placeholder:text-[#ccc] focus:outline-none transition-colors ${
              error ? 'border-red-400' : 'border-[#ddd] focus:border-[#1a1a1a]'
            }`}
            disabled={isValidating}
            autoFocus
          />
          {error && (
            <p className="mt-2 text-xs text-red-500 text-center">{error}</p>
          )}
        </div>

        {/* Button */}
        <button
          onClick={handleValidate}
          disabled={!key.trim() || isValidating}
          className="w-full bg-[#1a1a1a] text-white py-3 rounded-xl font-medium hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors mb-6"
        >
          {isValidating ? 'Validating...' : 'Activate'}
        </button>

        {/* Purchase link */}
        <div className="text-center pt-4 border-t border-[#e5e0d8]">
          <p className="text-xs text-[#999] mb-2">
            Don&apos;t have a key yet?
          </p>
          <button
            onClick={() => window.open('https://colorwizard.app', '_blank')}
            className="text-sm text-[#1a1a1a] underline hover:no-underline transition-colors"
          >
            Get ColorWizard Desktop - $10
          </button>
        </div>

        {/* Debug: show valid demo keys */}
        <div className="mt-4 pt-4 border-t border-[#e5e0d8]">
          <p className="text-[10px] text-[#bbb] text-center">
            Demo keys: CW-A1B2-C3D4-6627 / CW-BEEF-0000-E385 / CW-CAFE-0000-D582
          </p>
        </div>
      </div>
    </div>
  )
}
