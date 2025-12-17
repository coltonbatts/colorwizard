'use client'

import PaintRecipe from './PaintRecipe'
import DMCFlossMatch from './DMCFlossMatch'

interface ColorPanelProps {
  sampledColor: {
    hex: string
    rgb: { r: number; g: number; b: number }
    hsl: { h: number; s: number; l: number }
  } | null
}

export default function ColorPanel({ sampledColor }: ColorPanelProps) {
  if (!sampledColor) {
    return (
      <div className="h-full p-6 flex items-center justify-center">
        <p className="text-gray-500 text-center">
          Click on the image to sample a color
        </p>
      </div>
    )
  }

  const { hex, rgb, hsl } = sampledColor

  return (
    <div className="h-full p-6 overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-100">Color Analysis</h2>

      {/* Color Swatch */}
      <div className="mb-6">
        <p className="text-sm text-gray-400 mb-2">Sampled Color</p>
        <div
          className="w-full h-32 rounded-lg border border-gray-700 shadow-lg"
          style={{ backgroundColor: hex }}
        />
        <p className="text-lg font-mono mt-2 text-gray-200">{hex}</p>
      </div>

      {/* RGB Values */}
      <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
        <p className="text-sm text-gray-400 mb-2">RGB</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-xs text-gray-500">Red</p>
            <p className="font-mono text-gray-200">{rgb.r}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Green</p>
            <p className="font-mono text-gray-200">{rgb.g}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Blue</p>
            <p className="font-mono text-gray-200">{rgb.b}</p>
          </div>
        </div>
      </div>

      {/* HSL Values */}
      <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
        <p className="text-sm text-gray-400 mb-2">HSL</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-xs text-gray-500">Hue</p>
            <p className="font-mono text-gray-200">{hsl.h}°</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Saturation</p>
            <p className="font-mono text-gray-200">{hsl.s}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Lightness</p>
            <p className="font-mono text-gray-200">{hsl.l}%</p>
          </div>
        </div>
      </div>

      {/* Paint Recipe */}
      <PaintRecipe hsl={hsl} />

      {/* DMC Floss Matches */}
      <div className="mt-6">
        <DMCFlossMatch rgb={rgb} />
      </div>
    </div>
  )
}
