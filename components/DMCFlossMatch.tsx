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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-studio">
          DMC Thread Matches
        </h3>
        <div className="text-[10px] font-black text-studio-dim uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded">
          Top 5
        </div>
      </div>

      <p className="text-xs text-studio-muted mb-6 leading-relaxed">
        Select a match to focus clinical view or copy the code for your shopping list.
      </p>

      <div className="space-y-3">
        {matches.map((match) => (
          <button
            key={match.number}
            onClick={() => onColorSelect(match.rgb)}
            className="w-full text-left flex items-center gap-3 p-4 bg-gray-50 hover:bg-white border border-gray-100 hover:border-blue-200 rounded-xl transition-all shadow-sm hover:shadow-md group relative overflow-hidden active:scale-[0.98]"
          >
            {/* Confidence Strip */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${match.confidenceBgColor} opacity-70`} />

            {/* Color Swatch */}
            <div
              className="w-14 h-14 rounded-lg border border-gray-200 flex-shrink-0 ml-1 shadow-inner"
              style={{ backgroundColor: match.hex }}
            />

            {/* Color Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-black text-studio text-lg">{match.number}</span>
                {copiedCode === match.number ? (
                  <span className="text-[10px] font-bold text-green-600 animate-in fade-in slide-in-from-bottom-1">COPIED</span>
                ) : (
                  <button
                    onClick={(e) => handleCopyCode(e, match.number)}
                    className="p-1.5 text-studio-dim hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy DMC Code"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="text-sm text-studio-secondary font-medium truncate">{match.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-black uppercase tracking-wider ${match.confidenceColor} bg-white/50 px-1.5 py-0.5 rounded border border-current/10`}>
                  {match.confidenceLabel}
                </span>
              </div>
            </div>

            {/* Match Percentage */}
            <div className="flex-shrink-0 text-right pr-2">
              <div className="text-xl font-black text-studio tabular-nums">{Math.round(match.similarity)}%</div>
              <div className="text-[10px] font-bold text-studio-dim uppercase">Match</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
