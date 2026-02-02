'use client'

import { useState, useCallback, useMemo } from 'react'
import { findClosestDMCColors, DMCMatch } from '@/lib/dmcFloss'

interface DMCFlossMatchProps {
  rgb: { r: number; g: number; b: number }
  onColorSelect: (rgb: { r: number; g: number; b: number }) => void
}

export default function DMCFlossMatch({ rgb, onColorSelect }: DMCFlossMatchProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Memoize matches - performance is sub-ms so no need for async/loading states
  const matches = useMemo(() => {
    if (!rgb) return []
    try {
      return findClosestDMCColors(rgb, 5)
    } catch (e) {
      console.error('DMC Matching Error:', e)
      return []
    }
  }, [rgb])

  const handleCopyCode = useCallback((e: React.MouseEvent, code: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }, [])

  if (matches.length === 0) {
    return null
  }

  return (
    <div className="DMC-match-container animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between mb-2 md:mb-4">
        <h3 className="text-base md:text-lg font-bold text-studio">
          DMC Thread Matches
        </h3>
        <div className="text-[10px] font-black text-studio-dim uppercase tracking-widest bg-gray-100 px-2.5 py-0.5 rounded-full shadow-sm">
          Top 5
        </div>
      </div>

      <p className="hidden md:block text-xs text-studio-muted mb-6 leading-relaxed">
        Select a match to focus clinical view or copy the code for your shopping list.
      </p>

      <div className="space-y-2 md:space-y-3">
        {matches.map((match) => (
          <button
            key={match.number}
            onClick={() => onColorSelect(match.rgb)}
            className="w-full text-left flex items-center gap-2.5 md:gap-3 p-2.5 md:p-4 bg-white/70 backdrop-blur-sm hover:bg-white border border-white/60 hover:border-blue-200 rounded-2xl transition-all shadow-sm hover:shadow-md group relative overflow-hidden active:scale-[0.98]"
          >
            {/* Confidence Strip */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 md:w-1.5 ${match.confidenceBgColor} opacity-70 rounded-l-2xl`} />

            {/* Color Swatch */}
            <div
              className="w-11 h-11 md:w-14 md:h-14 rounded-xl border border-gray-200 flex-shrink-0 ml-1 shadow-sm"
              style={{ backgroundColor: match.hex }}
            />

            {/* Color Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 md:gap-2">
                <span className="font-black text-studio text-base md:text-lg">{match.number}</span>
                {copiedCode === match.number ? (
                  <span className="text-[10px] font-bold text-green-600 animate-in fade-in slide-in-from-bottom-1">COPIED</span>
                ) : (
                  <div
                    onClick={(e) => handleCopyCode(e, match.number)}
                    className="p-1 md:p-1.5 text-studio-dim hover:text-blue-600 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Copy DMC Code"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleCopyCode(e as any, match.number)
                      }
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="text-[13px] md:text-sm text-studio-secondary font-medium truncate">{match.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5 md:mt-1">
                <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-wider ${match.confidenceColor} bg-white/80 shadow-sm px-1.5 py-0.5 rounded-full border border-current/10`}>
                  {match.confidenceLabel}
                </span>
              </div>
            </div>

            {/* Match Percentage */}
            <div className="flex-shrink-0 text-right pr-1 md:pr-2">
              <div className="text-lg md:text-xl font-black text-studio tabular-nums">{Math.round(match.similarity)}%</div>
              <div className="text-[9px] md:text-[10px] font-bold text-studio-dim uppercase">Match</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
