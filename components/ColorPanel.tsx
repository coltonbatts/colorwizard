'use client'

import { useState } from 'react'
import PaintRecipe from './PaintRecipe'
import MixLab from './MixLab'
import DMCFlossMatch from './DMCFlossMatch'
import ValueChromaGraph from './ValueChromaGraph'
import { getPainterValue, getPainterChroma } from '@/lib/paintingMath'

interface ColorPanelProps {
  sampledColor: {
    hex: string
    rgb: { r: number; g: number; b: number }
    hsl: { h: number; s: number; l: number }
  } | null
  onColorSelect: (rgb: { r: number; g: number; b: number }) => void
}

type Tab = 'painter' | 'thread'
type PainterSubTab = 'recipe' | 'mixlab'

export default function ColorPanel({ sampledColor, onColorSelect }: ColorPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('painter')
  const [painterSubTab, setPainterSubTab] = useState<PainterSubTab>('recipe')

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

  return (
    <div className="h-full flex flex-col bg-gray-950 text-gray-100 font-sans">

      {/* HERO SWATCH AREA - Always Visible */}
      <div className="p-6 pb-6 border-b border-gray-800 bg-gray-950">
        <div className="flex flex-col gap-4">

          {/* Giant Hero Swatch */}
          <div className="w-full aspect-video rounded-3xl shadow-2xl border border-gray-800 relative overflow-hidden group transition-all duration-500 hover:shadow-gray-900/50"
            style={{ backgroundColor: hex }}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent pointer-events-none"></div>
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-3xl"></div>
          </div>

          {/* Hero Info - Now below the swatch for max width */}
          <div className="flex flex-col items-center justify-center pt-2">
            <h2 className="text-6xl font-black tracking-tighter font-mono text-white mb-3 tabular-nums">{hex}</h2>

            <div className="flex gap-8 items-center justify-center w-full px-4">
              <div className="flex flex-col items-center">
                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-1">Value</span>
                <span className="font-mono text-2xl text-gray-200 font-bold">{value}</span>
              </div>
              <div className="w-px h-8 bg-gray-800"></div>
              <div className="flex flex-col items-center">
                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-1">Chroma</span>
                <span className="font-mono text-2xl text-gray-200 font-bold">{chroma.label}</span>
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
        </div>
      )}

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">

        {activeTab === 'painter' && (
          <div className="space-y-8 animate-in fade-in duration-300">

            {/* Visualizer - always visible in painter tab */}
            <section>
              <ValueChromaGraph color={hex} />
            </section>

            {/* Recipe or Mix Lab based on sub-tab */}
            {painterSubTab === 'recipe' ? (
              <section>
                <PaintRecipe hsl={hsl} targetHex={hex} />
              </section>
            ) : (
              <section>
                <MixLab targetHex={hex} />
              </section>
            )}

            {/* Tech Specs */}
            <section className="p-4 bg-gray-900 rounded-lg border border-gray-800">
              <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase">Technical Data</h3>
              <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                <div>
                  <span className="text-gray-600 block text-xs">RGB</span>
                  <span>{rgb.r}, {rgb.g}, {rgb.b}</span>
                </div>
                <div>
                  <span className="text-gray-600 block text-xs">HSL</span>
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
