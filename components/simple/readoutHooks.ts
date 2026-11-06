'use client'

/** What the full color readout and the phone Thread view share. */

import { useEffect, useState } from 'react'
import { getThreadMatchContext, type ThreadMatchResult } from '@/lib/dmcFloss'

/** Let a drag come to rest before running the lookups. */
export const SETTLE_MS = 120

export function useSettled<T>(value: T, delay: number) {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return settled
}

export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(text)
      window.setTimeout(() => setCopied((current) => (current === text ? null : current)), 1200)
    } catch {
      /* clipboard can be unavailable in insecure contexts; the text is still on screen */
    }
  }
  return { copied, copy }
}

/**
 * The catalog match for `settledHex`.
 * `threads` belongs to `hex` or is null; `latest` is the last match found, which may be for the
 * color before this one, so a view can hold it dimmed instead of blanking between samples.
 */
export function useThreadMatch(hex: string, settledHex: string) {
  const [match, setMatch] = useState<{ hex: string; result: ThreadMatchResult | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    const rgb = {
      r: parseInt(settledHex.slice(1, 3), 16),
      g: parseInt(settledHex.slice(3, 5), 16),
      b: parseInt(settledHex.slice(5, 7), 16),
    }
    getThreadMatchContext(rgb, { alternativeCount: 3, topMatchCount: 4 })
      .then((result) => { if (!cancelled) setMatch({ hex: settledHex, result }) })
      .catch(() => { if (!cancelled) setMatch({ hex: settledHex, result: null }) })
    return () => { cancelled = true }
  }, [settledHex])

  const current = match?.hex === hex
  return {
    threads: current ? match.result : null,
    failed: current && !match.result,
    latest: match?.result ?? null,
  }
}
