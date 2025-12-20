'use client'

import { useState } from 'react'
import Link from 'next/link'
import ImageCanvas from '@/components/ImageCanvas'
import ColorPanel from '@/components/ColorPanel'
import ShoppingListPanel from '@/components/ShoppingListPanel'

export default function Home() {
  const [sampledColor, setSampledColor] = useState<{
    hex: string
    rgb: { r: number; g: number; b: number }
    hsl: { h: number; s: number; l: number }
  } | null>(null)

  const [activeHighlightColor, setActiveHighlightColor] = useState<{ r: number; g: number; b: number } | null>(null)
  const [highlightTolerance, setHighlightTolerance] = useState(20)
  const [highlightMode, setHighlightMode] = useState<'solid' | 'heatmap'>('solid')
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [activeTab, setActiveTab] = useState<'inspect' | 'shopping'>('inspect')

  return (
    <main className="flex h-screen bg-[#1a1a1a]">
      <div className="w-[70%] p-6 flex flex-col">
        {/* Color Theory Lab Button */}
        <div className="mb-4 flex justify-end">
          <Link
            href="/color-theory"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg hover:shadow-purple-500/25"
          >
            <span>🎨</span>
            Color Theory Lab
          </Link>
        </div>
        {/* Highlight Controls - Only show active if a color is selected */}
        {activeHighlightColor && (
          <div className="mb-4 p-3 bg-gray-800 rounded-lg flex items-center gap-6 border border-gray-700 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-300">Highlight Mode:</span>
              <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                <button
                  onClick={() => setHighlightMode('solid')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${highlightMode === 'solid' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Solid
                </button>
                <button
                  onClick={() => setHighlightMode('heatmap')}
                  className={`px-3 py-1 rounded text-sm transition-colors ${highlightMode === 'heatmap' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Heatmap
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-1">
              <span className="text-sm font-medium text-gray-300 whitespace-nowrap">Tolerance ({highlightTolerance}):</span>
              <input
                type="range"
                min="1"
                max="60"
                value={highlightTolerance}
                onChange={(e) => setHighlightTolerance(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <button
              onClick={() => setActiveHighlightColor(null)}
              className="ml-auto px-3 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              Clear Highlight
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0">
          <ImageCanvas
            image={image}
            onImageLoad={setImage}
            onReset={() => setImage(null)}
            onColorSample={setSampledColor}
            highlightColor={activeHighlightColor}
            highlightTolerance={highlightTolerance}
            highlightMode={highlightMode}
          />
        </div>
      </div>
      <div className="w-[30%] border-l border-gray-700 flex flex-col">
        {/* Simple Tab Switcher */}
        <div className="flex border-b border-gray-700">
          <button
            className={`flex-1 py-3 text-sm font-medium transition-colors ${!activeTab || activeTab === 'inspect' ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-800/50' : 'text-gray-400 hover:text-gray-200'}`}
            onClick={() => setActiveTab('inspect')}
          >
            Inspect
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'shopping' ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-800/50' : 'text-gray-400 hover:text-gray-200'}`}
            onClick={() => setActiveTab('shopping')}
          >
            Shopping List <span className="text-xs bg-blue-900 text-blue-200 px-1.5 rounded ml-1">NEW</span>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden relative">
          {(!activeTab || activeTab === 'inspect') ? (
            <div className="absolute inset-0 overflow-y-auto">
              <ColorPanel
                sampledColor={sampledColor}
                onColorSelect={(rgb) => setActiveHighlightColor(rgb)}
              />
            </div>
          ) : (
            <div className="absolute inset-0">
              <ShoppingListPanel image={image} />
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
