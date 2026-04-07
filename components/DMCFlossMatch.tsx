'use client'

import { useState, useCallback, useEffect } from 'react'
import { findClosestDMCColors } from '@/lib/dmcFloss'
import type { KeyboardEvent, MouseEvent } from 'react'

interface DMCFlossMatchProps {
  rgb: { r: number; g: number; b: number }
  onColorSelect: (rgb: { r: number; g: number; b: number }) => void
}

export default function DMCFlossMatch({ rgb, onColorSelect }: DMCFlossMatchProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [matches, setMatches] = useState<Awaited<ReturnType<typeof findClosestDMCColors>>>([])

  useEffect(() => {
    let cancelled = false

    if (!rgb) {
      setMatches([])
      return
    }

    findClosestDMCColors(rgb, 5)
      .then((results) => {
        if (!cancelled) {
          setMatches(results)
        }
      })
      .catch((error) => {
        console.error('DMC Matching Error:', error)
        if (!cancelled) {
          setMatches([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [rgb])

  const handleCopyCode = useCallback((e: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>, code: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 1800)
  }, [])

  if (matches.length === 0) {
    return null
  }

  return (
    <section className="overflow-hidden rounded-xl border border-ink-hairline bg-paper animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between gap-3 border-b border-ink-hairline px-3 py-2.5">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-secondary">
          Threads
        </div>
        <div className="font-mono text-[10px] font-bold text-ink-faint">
          5
        </div>
      </div>

      <div className="bg-paper-elevated">
        {matches.map((match, index) => (
          <div
            key={match.number}
            className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 transition-colors hover:bg-paper-recessed ${
              index !== 0 ? 'border-t border-ink-hairline' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => onColorSelect(match.rgb)}
              className="group flex min-w-0 items-center gap-3 text-left"
            >
              <div className="relative">
                <div className={`absolute inset-y-1 -left-3 w-1 rounded-full ${match.confidenceBgColor}`} />
                <div
                  className="h-10 w-10 rounded-xl border border-black/10 shadow-inner"
                  style={{ backgroundColor: match.hex }}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black tracking-tight text-ink">
                    {match.number}
                  </span>
                  <span className={`rounded-full bg-paper-recessed px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] ${match.confidenceColor}`}>
                    {match.confidenceLabel}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-sm font-semibold text-ink-secondary">
                  {match.name}
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-sm font-black tracking-tight text-ink">
                  {Math.round(match.similarity)}%
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={(e) => handleCopyCode(e, match.number)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-hairline bg-paper text-ink-secondary transition-colors hover:bg-paper-recessed hover:text-ink"
              title="Copy DMC code"
              aria-label={`Copy DMC code ${match.number}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleCopyCode(e, match.number)
                }
              }}
            >
              {copiedCode === match.number ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="9" width="10" height="10" rx="2" />
                  <rect x="5" y="5" width="10" height="10" rx="2" />
                </svg>
              )}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
