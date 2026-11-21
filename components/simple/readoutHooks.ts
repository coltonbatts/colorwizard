'use client'

/** What the full color readout and the phone Thread view share. */

import { useEffect, useState } from 'react'
import { loadDmcCatalog, type DMCCatalog } from '@/lib/dmc/catalog'
import type { ImageValueContext } from '@/lib/dmc/types'
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
export function useThreadMatch(hex: string | null, settledHex: string | null, imageValue?: ImageValueContext | null) {
  const [match, setMatch] = useState<{ hex: string; result: ThreadMatchResult | null } | null>(null)

  useEffect(() => {
    if (!settledHex) return
    let cancelled = false
    const rgb = {
      r: parseInt(settledHex.slice(1, 3), 16),
      g: parseInt(settledHex.slice(3, 5), 16),
      b: parseInt(settledHex.slice(5, 7), 16),
    }
    getThreadMatchContext(rgb, { alternativeCount: 4, topMatchCount: 6, imageValue })
      .then((result) => { if (!cancelled) setMatch({ hex: settledHex, result }) })
      .catch(() => { if (!cancelled) setMatch({ hex: settledHex, result: null }) })
    return () => { cancelled = true }
  }, [settledHex, imageValue])

  const current = !!hex && match?.hex === hex
  return {
    threads: current ? match.result : null,
    failed: current && !match.result,
    latest: hex ? (match?.result ?? null) : null,
  }
}

export function useDmcCatalog() {
  const [state, setState] = useState<{ catalog: DMCCatalog | null; failed: boolean }>({ catalog: null, failed: false })

  useEffect(() => {
    let cancelled = false
    loadDmcCatalog()
      .then((catalog) => { if (!cancelled) setState({ catalog, failed: false }) })
      .catch(() => { if (!cancelled) setState({ catalog: null, failed: true }) })
    return () => { cancelled = true }
  }, [])

  return state
}
