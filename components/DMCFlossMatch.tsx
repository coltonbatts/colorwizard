'use client'

import { findClosestDMCColors } from '@/lib/dmcFloss'

interface DMCFlossMatchProps {
  rgb: { r: number; g: number; b: number }
  onColorSelect: (rgb: { r: number; g: number; b: number }) => void
}

export default function DMCFlossMatch({ rgb, onColorSelect }: DMCFlossMatchProps) {
  const matches = findClosestDMCColors(rgb, 5)

  return (
    <div className="p-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700">
      <h3 className="text-xl font-bold mb-4 text-gray-100">
        DMC Embroidery Floss Matches
      </h3>
      <p className="text-xs text-gray-400 mb-3">Click a color to see where it appears on the image</p>

      <div className="space-y-3">
        {matches.map((match, index) => (
          <button
            key={match.number}
            onClick={() => onColorSelect(match.rgb)}
            className="w-full text-left flex items-center gap-3 p-3 bg-gray-800/50 rounded border border-gray-700 hover:bg-gray-700 hover:border-gray-500 transition-all group relative overflow-hidden"
          >
            {/* Confidence Strip */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${match.confidenceBgColor}`}></div>

            {/* Color Swatch */}
            <div
              className="w-12 h-12 rounded border-2 border-gray-600 flex-shrink-0 ml-2"
              style={{ backgroundColor: match.hex }}
              title={match.hex}
            />

            {/* Color Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-gray-100">
                  {match.number}
                </span>
                <span className="text-sm text-gray-400 truncate">
                  {match.name}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-bold ${match.confidenceColor}`}>
                  {match.confidenceLabel}
                </span>
              </div>
            </div>

            {/* Match Percentage */}
            <div className="flex-shrink-0 text-right">
              <div className="text-lg font-bold text-gray-100">
                {Math.round(match.similarity)}%
              </div>
              <div className="text-xs text-gray-500">sim.</div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">
          Matches calculated using CIE Lab DeltaE 2000 (Perceptual)
        </p>
      </div>
    </div>
  )
}
