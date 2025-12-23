'use client'

import { useState } from 'react'
import { rgb as culoriRgb } from 'culori'
import PaintRecipe from './PaintRecipe'
import MixLab from './MixLab'
import DMCFlossMatch from './DMCFlossMatch'
import PhotoshopColorWheel from './PhotoshopColorWheel'
import ColorHarmonies from './ColorHarmonies'
import { getPainterValue, getPainterChroma, getLuminance, getValueBand } from '@/lib/paintingMath'
import { PinnedColor } from '@/lib/types/pinnedColor'
import { generatePaintRecipe } from '@/lib/colorMixer'
import { solveRecipe } from '@/lib/paint/solveRecipe'
import { findClosestDMCColors } from '@/lib/dmcFloss'

interface ColorPanelProps {
  sampledColor: {
    hex: string
    rgb: { r: number; g: number; b: number }
    hsl: { h: number; s: number; l: number }
  } | null
  onColorSelect: (rgb: { r: number; g: number; b: number }) => void
  onPin: (newPin: PinnedColor) => void
  isPinned: boolean
}

type Tab = 'painter' | 'thread'
type PainterSubTab = 'recipe' | 'mixlab' | 'harmonies'

export default function ColorPanel({ sampledColor, onColorSelect, onPin, isPinned }: ColorPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('painter')
  const [painterSubTab, setPainterSubTab] = useState<PainterSubTab>('recipe')
  const [label, setLabel] = useState('')
  const [isPinning, setIsPinning] = useState(false)

  if (!sampledColor) {
    return (
      <div className="h-full p-6 flex flex-col items-center justify-center bg-gray-950 text-gray-400">
        <div className="w-16 h-16 rounded-full border-2 border-gray-800 flex items-center justify-center mb-4">
          <span className="text-2xl">?</span>
        </div>
        <p className="text-center font-medium">Click image to sample</p>
        <p className="text-sm text-gray-600 mt-2">Pick a color to analyze</p>
      </div>
    )
  }

  const { hex, rgb, hsl } = sampledColor
  const value = getPainterValue(hex)
  const chroma = getPainterChroma(hex)

  // Value First Data
  const valuePercent = getLuminance(rgb.r, rgb.g, rgb.b)
  const valueStep10 = Math.min(10, Math.max(0, Math.round(valuePercent / 10)))
  const valueBand = getValueBand(valuePercent)
  const grayscaleHex = `#${Math.round(valuePercent * 2.55).toString(16).padStart(2, '0').repeat(3)}`

  return (
    <div className="bg-gray-950 text-gray-100 font-sans min-h-full">

      {/* HERO SWATCH AREA - Always Visible */}
      <div className="p-4 lg:p-6 border-b border-gray-800 bg-gray-950">
        <div className="flex flex-col lg:gap-4 gap-2">

          {/* Giant Hero Swatch */}
          <div className="w-full aspect-[2/1] lg:aspect-video rounded-2xl lg:rounded-3xl shadow-2xl border border-gray-800 relative overflow-hidden group transition-all duration-500 hover:shadow-gray-900/50"
            style={{ backgroundColor: hex }}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent pointer-events-none"></div>
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl lg:rounded-3xl"></div>
          </div>

          {/* Hero Info - Now below the swatch for max width */}
          <div className="flex flex-col items-center justify-center pt-1 lg:pt-2">
            <div className="flex items-center gap-4 mb-2">
              <h2 className="text-4xl lg:text-5xl font-black tracking-tighter font-mono text-white tabular-nums">{hex}</h2>
              <button
                onClick={async () => {
                  if (isPinned) return
                  setIsPinning(true)
                  try {
                    const spectral = await solveRecipe(hex)
                    const fallback = generatePaintRecipe(hsl)
                    const dmc = findClosestDMCColors(rgb, 5)

                    onPin({
                      id: crypto.randomUUID(),
                      hex,
                      rgb,
                      hsl,
                      label: label.trim() || `Color ${hex}`,
                      timestamp: Date.now(),
                      spectralRecipe: spectral,
                      fallbackRecipe: fallback,
                      dmcMatches: dmc
                    })
                    setLabel('')
                  } catch (e) {
                    console.error('Failed to pin color', e)
                  } finally {
                    setIsPinning(false)
                  }
                }}
                disabled={isPinning || isPinned}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isPinned
                  ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'
                  }`}
              >
                {isPinning ? (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Pinning...
                  </span>
                ) : isPinned ? (
                  <><span>✓</span> Pinned</>
                ) : (
                  <><span>📌</span> Pin Color</>
                )}
              </button>
            </div>

            <div className="w-full max-w-xs mb-4">
              <input
                type="text"
                placeholder="Add a label/note..."
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Value First Readout */}
            <div className="w-full grid grid-cols-2 gap-4 lg:gap-6 items-center justify-center px-2 lg:px-4 mt-2">
              <div className="flex flex-col items-center bg-gray-900/50 p-3 rounded-xl border border-gray-800/50">
                <span className="text-blue-500 text-[10px] lg:text-[11px] uppercase font-black tracking-widest mb-1">Value</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-4xl lg:text-5xl text-white font-black tabular-nums">{valuePercent}%</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-4 h-4 rounded-sm border border-gray-700 shadow-inner" style={{ backgroundColor: grayscaleHex }}></div>
                  <span className="text-gray-400 font-mono text-xs font-bold">Step {valueStep10}</span>
                </div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight mt-1">{valueBand}</span>
              </div>

              <div className="flex flex-col items-center bg-gray-900/50 p-3 rounded-xl border border-gray-800/50">
                <span className="text-gray-500 text-[10px] lg:text-[11px] uppercase font-bold tracking-widest mb-1">Chroma</span>
                <span className="font-mono text-2xl lg:text-3xl text-gray-200 font-black">{chroma.label}</span>
                <div className="w-px h-2 bg-gray-800 my-1"></div>
                <span className="text-[10px] text-gray-600 font-mono uppercase tracking-tight">{hex}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-gray-800 bg-gray-900/30">
        <button
          onClick={() => setActiveTab('painter')}
          className={`flex-1 py-3 text-sm font-bold uppercase tracking-wide transition-colors ${activeTab === 'painter'
            ? 'text-white border-b-2 border-blue-500 bg-gray-800/50'
            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'
            }`}
        >
          Painter
        </button>
        <button
          onClick={() => setActiveTab('thread')}
          className={`flex-1 py-3 text-sm font-bold uppercase tracking-wide transition-colors ${activeTab === 'thread'
            ? 'text-white border-b-2 border-pink-500 bg-gray-800/50'
            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'
            }`}
        >
          Threads
        </button>
      </div>

      {/* PAINTER SUB-TABS */}
      {activeTab === 'painter' && (
        <div className="flex border-b border-gray-800 bg-gray-900/20">
          <button
            onClick={() => setPainterSubTab('recipe')}
            className={`flex-1 py-2 text-xs font-medium uppercase tracking-wide transition-colors ${painterSubTab === 'recipe'
              ? 'text-blue-400 border-b border-blue-500/50 bg-gray-800/30'
              : 'text-gray-500 hover:text-gray-300'
              }`}
          >
            Recipe
          </button>
          <button
            onClick={() => setPainterSubTab('mixlab')}
            className={`flex-1 py-2 text-xs font-medium uppercase tracking-wide transition-colors ${painterSubTab === 'mixlab'
              ? 'text-purple-400 border-b border-purple-500/50 bg-gray-800/30'
              : 'text-gray-500 hover:text-gray-300'
              }`}
          >
            Mix Lab
          </button>
          <button
            onClick={() => setPainterSubTab('harmonies')}
            className={`flex-1 py-2 text-xs font-medium uppercase tracking-wide transition-colors ${painterSubTab === 'harmonies'
              ? 'text-teal-400 border-b border-teal-500/50 bg-gray-800/30'
              : 'text-gray-500 hover:text-gray-300'
              }`}
          >
            Harmonies
          </button>
        </div>
      )}

      {/* CONTENT AREA */}
      <div className="p-4 lg:p-6">

        {activeTab === 'painter' && (
          <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-300">

            {/* Visualizer - always visible in painter tab */}
            <section className="min-h-0">
              <PhotoshopColorWheel
                color={hex}
                onChange={(newHex) => {
                  const parsed = culoriRgb(newHex)
                  if (parsed) {
                    onColorSelect({
                      r: Math.round(parsed.r * 255),
                      g: Math.round(parsed.g * 255),
                      b: Math.round(parsed.b * 255)
                    })
                  }
                }}
              />
            </section>

            {/* Recipe or Mix Lab based on sub-tab */}
            <section className="min-h-0">
              {painterSubTab === 'recipe' ? (
                <PaintRecipe hsl={hsl} targetHex={hex} />
              ) : painterSubTab === 'mixlab' ? (
                <MixLab targetHex={hex} />
              ) : (
                <ColorHarmonies rgb={rgb} onColorSelect={onColorSelect} />
              )}
            </section>

            {/* Tech Specs */}
            <section className="p-3 lg:p-4 bg-gray-900 rounded-lg border border-gray-800">
              <h3 className="text-[10px] lg:text-xs font-bold text-gray-400 mb-2 lg:mb-3 uppercase">Technical Data</h3>
              <div className="grid grid-cols-2 gap-3 lg:gap-4 text-xs lg:text-sm font-mono">
                <div>
                  <span className="text-gray-600 block text-[9px] lg:text-xs">RGB</span>
                  <span>{rgb.r}, {rgb.g}, {rgb.b}</span>
                </div>
                <div>
                  <span className="text-gray-600 block text-[9px] lg:text-xs">HSL</span>
                  <span>{hsl.h}°, {hsl.s}%, {hsl.l}%</span>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'thread' && (
          <div className="animate-in fade-in duration-300">
            <DMCFlossMatch rgb={rgb} onColorSelect={onColorSelect} />
          </div>
        )}

      </div>
    </div>
  )
}
