'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import ImageCanvas from '@/components/ImageCanvas'
import ColorPanel from '@/components/ColorPanel'
import ShoppingListPanel from '@/components/ShoppingListPanel'
import PinnedColorsPanel from '@/components/PinnedColorsPanel'
import PaletteSelector from '@/components/PaletteSelector'
import PaletteManager from '@/components/PaletteManager'
import { useStore } from '@/lib/store/useStore'

export default function Home() {
  const {
    sampledColor, setSampledColor,
    activeHighlightColor, setActiveHighlightColor,
    highlightTolerance, setHighlightTolerance,
    highlightMode, setHighlightMode,
    image, setImage,
    activeTab, setActiveTab,
    pinnedColors, pinColor, unpinColor, clearPinned,
    valueScaleSettings, setValueScaleSettings,
    histogramBins, setHistogramBins,
    valueScaleResult, setValueScaleResult,
    palettes, createPalette, updatePalette, deletePalette, setActivePalette,
    showPaletteManager, setShowPaletteManager
  } = useStore()

  // Derived active palette
  const activePalette = useMemo(() => {
    return palettes.find(p => p.isActive) || palettes[0] || { id: 'default', name: 'Default', colors: [], isActive: true, isDefault: true }
  }, [palettes])

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

  return (
    <main className="flex flex-col lg:flex-row h-screen bg-[#1a1a1a] overflow-hidden">
      <div className="flex-1 lg:flex-[7] p-6 flex flex-col min-h-0 min-w-0">
        {/* Header with Palette Selector and Color Theory Lab */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <PaletteSelector
            palettes={palettes}
            activePalette={activePalette}
            onSelectPalette={setActivePalette}
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
            onValueScaleChange={setValueScaleSettings}
            onHistogramComputed={setHistogramBins}
            onValueScaleResult={setValueScaleResult}
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
                onPin={pinColor}
                isPinned={!!sampledColor && pinnedColors.some(p => p.hex === sampledColor.hex)}
                valueScaleSettings={valueScaleSettings}
                onValueScaleChange={setValueScaleSettings}
                activePalette={activePalette}
                histogramBins={histogramBins}
                valueScaleResult={valueScaleResult}
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
                onUnpin={unpinColor}
                onClearAll={clearPinned}
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
        onCreatePalette={createPalette}
        onUpdatePalette={updatePalette}
        onDeletePalette={deletePalette}
      />
    </main>
  )
}
