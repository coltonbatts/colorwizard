'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import ImageCanvas from '@/components/ImageCanvas'
import ColorPanel from '@/components/ColorPanel'
import ShoppingListPanel from '@/components/ShoppingListPanel'
import PinnedColorsPanel from '@/components/PinnedColorsPanel'
import PaletteSelector from '@/components/PaletteSelector'
import PaletteManager from '@/components/PaletteManager'
import { PinnedColor } from '@/lib/types/pinnedColor'
import { ValueScaleSettings, DEFAULT_VALUE_SCALE_SETTINGS } from '@/lib/types/valueScale'
import { Palette, DEFAULT_PALETTE } from '@/lib/types/palette'

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
  const [activeTab, setActiveTab] = useState<'inspect' | 'shopping' | 'pinned'>('inspect')
  const [pinnedColors, setPinnedColors] = useState<PinnedColor[]>([])
  const [valueScaleSettings, setValueScaleSettings] = useState<ValueScaleSettings>(DEFAULT_VALUE_SCALE_SETTINGS)
  const [palettes, setPalettes] = useState<Palette[]>([DEFAULT_PALETTE])
  const [showPaletteManager, setShowPaletteManager] = useState(false)

  // Derived active palette
  const activePalette = useMemo(() => {
    return palettes.find(p => p.isActive) || palettes[0] || DEFAULT_PALETTE
  }, [palettes])

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('colorwizard_pinned_colors')
    if (saved) {
      try {
        setPinnedColors(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load pinned colors', e)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('colorwizard_pinned_colors', JSON.stringify(pinnedColors))
  }, [pinnedColors])

  // Palette persistence - load
  useEffect(() => {
    const saved = localStorage.getItem('colorwizard_palettes')
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Palette[]
        // Ensure default palette exists
        const hasDefault = parsed.some(p => p.isDefault)
        if (!hasDefault) {
          parsed.unshift(DEFAULT_PALETTE)
        }
        // Ensure at least one is active
        const hasActive = parsed.some(p => p.isActive)
        if (!hasActive && parsed.length > 0) {
          parsed[0].isActive = true
        }
        setPalettes(parsed)
      } catch (e) {
        console.error('Failed to load palettes', e)
      }
    }
  }, [])

  // Palette persistence - save
  useEffect(() => {
    localStorage.setItem('colorwizard_palettes', JSON.stringify(palettes))
  }, [palettes])

  const handlePinColor = (newPin: PinnedColor) => {
    setPinnedColors(prev => {
      // Limit to 30 colors
      const filtered = prev.filter(p => p.hex !== newPin.hex)
      const next = [newPin, ...filtered]
      if (next.length > 30) return next.slice(0, 30)
      return next
    })
  }

  const handleUnpinColor = (id: string) => {
    setPinnedColors(prev => prev.filter(p => p.id !== id))
  }

  const handleClearPinned = () => {
    if (confirm('Clear all pinned colors?')) {
      setPinnedColors([])
    }
  }

  const handleExportPalette = () => {
    const data = JSON.stringify(pinnedColors, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `colorwizard_palette_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Palette CRUD handlers
  const handleCreatePalette = (newPalette: Palette) => {
    setPalettes(prev => [...prev, newPalette])
  }

  const handleUpdatePalette = (updatedPalette: Palette) => {
    setPalettes(prev => prev.map(p =>
      p.id === updatedPalette.id ? updatedPalette : p
    ))
  }

  const handleDeletePalette = (paletteId: string) => {
    setPalettes(prev => {
      const filtered = prev.filter(p => p.id !== paletteId)
      // If deleted palette was active, activate the first one
      const hadActive = prev.find(p => p.id === paletteId)?.isActive
      if (hadActive && filtered.length > 0) {
        filtered[0].isActive = true
      }
      return filtered
    })
  }

  const handleSetActivePalette = (paletteId: string) => {
    setPalettes(prev => prev.map(p => ({
      ...p,
      isActive: p.id === paletteId
    })))
  }

  return (
    <main className="flex flex-col lg:flex-row h-screen bg-[#1a1a1a] overflow-hidden">
      <div className="flex-1 lg:flex-[7] p-6 flex flex-col min-h-0 min-w-0">
        {/* Header with Palette Selector and Color Theory Lab */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <PaletteSelector
            palettes={palettes}
            activePalette={activePalette}
            onSelectPalette={handleSetActivePalette}
            onOpenManager={() => setShowPaletteManager(true)}
          />
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
            valueScaleSettings={valueScaleSettings}
          />
        </div>
      </div>
      <div className="w-full lg:w-[30%] lg:min-w-[400px] border-l border-gray-700 flex flex-col h-1/2 lg:h-full bg-gray-950 shadow-2xl z-10">
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
            List
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'pinned' ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-800/50' : 'text-gray-400 hover:text-gray-200'}`}
            onClick={() => setActiveTab('pinned')}
          >
            Pinned <span className="text-[10px] bg-gray-700 px-1 rounded ml-1">{pinnedColors.length}</span>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden relative">
          {(!activeTab || activeTab === 'inspect') ? (
            <div className="absolute inset-0 overflow-y-auto">
              <ColorPanel
                sampledColor={sampledColor}
                onColorSelect={(rgb) => setActiveHighlightColor(rgb)}
                onPin={handlePinColor}
                isPinned={!!sampledColor && pinnedColors.some(p => p.hex === sampledColor.hex)}
                valueScaleSettings={valueScaleSettings}
                onValueScaleChange={setValueScaleSettings}
                activePalette={activePalette}
              />
            </div>
          ) : activeTab === 'shopping' ? (
            <div className="absolute inset-0">
              <ShoppingListPanel image={image} />
            </div>
          ) : (
            <div className="absolute inset-0 overflow-y-auto">
              <PinnedColorsPanel
                pinnedColors={pinnedColors}
                activeHighlightColor={activeHighlightColor}
                onUnpin={handleUnpinColor}
                onClearAll={handleClearPinned}
                onExport={handleExportPalette}
                onSelect={(rgb: { r: number; g: number; b: number }) => setActiveHighlightColor(rgb)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Palette Manager Modal */}
      <PaletteManager
        isOpen={showPaletteManager}
        onClose={() => setShowPaletteManager(false)}
        palettes={palettes}
        onCreatePalette={handleCreatePalette}
        onUpdatePalette={handleUpdatePalette}
        onDeletePalette={handleDeletePalette}
      />
    </main>
  )
}
