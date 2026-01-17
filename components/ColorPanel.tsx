'use client'

import { useState } from 'react'
import { rgb as culoriRgb } from 'culori'
import PaintRecipe from './PaintRecipe'
import MixLab from './MixLab'
import DMCFlossMatch from './DMCFlossMatch'
import PhotoshopColorWheel from './PhotoshopColorWheel'
import ColorHarmonies from './ColorHarmonies'
import ValueHistogram from './ValueHistogram'
import { getPainterValue, getPainterChroma, getLuminance, getValueBand } from '@/lib/paintingMath'
import { PinnedColor } from '@/lib/types/pinnedColor'
import { ValueScaleSettings } from '@/lib/types/valueScale'
import { Palette } from '@/lib/types/palette'
import { generatePaintRecipe } from '@/lib/colorMixer'
import { solveRecipe } from '@/lib/paint/solveRecipe'
import { findClosestDMCColors } from '@/lib/dmcFloss'
import { ValueScaleResult } from '@/lib/valueScale'

interface ColorPanelProps {
  sampledColor: {
    hex: string
    rgb: { r: number; g: number; b: number }
    hsl: { h: number; s: number; l: number }
    valueMetadata?: {
      y: number
      step: number
      range: [number, number]
      percentile: number
    }
  } | null
  onColorSelect: (rgb: { r: number; g: number; b: number }) => void
  onPin: (newPin: PinnedColor) => void
  isPinned: boolean
  valueScaleSettings?: ValueScaleSettings
  onValueScaleChange?: (settings: ValueScaleSettings) => void
  activePalette?: Palette
  histogramBins?: number[]
  valueScaleResult?: ValueScaleResult | null
}

type Tab = 'painter' | 'thread'
type PainterSubTab = 'recipe' | 'mixlab' | 'harmonies' | 'valueScale'

export default function ColorPanel({ sampledColor, onColorSelect, onPin, isPinned, valueScaleSettings, onValueScaleChange, activePalette, histogramBins, valueScaleResult }: ColorPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('painter')
  const [painterSubTab, setPainterSubTab] = useState<PainterSubTab>('recipe')
  const [label, setLabel] = useState('')
  const [isPinning, setIsPinning] = useState(false)

  if (!sampledColor) {
    return (
      <div className="h-full p-6 flex flex-col items-center justify-center bg-white text-studio-secondary">
        <div className="w-16 h-16 rounded-full border-2 border-gray-100 flex items-center justify-center mb-4">
          <span className="text-2xl text-studio-dim">?</span>
        </div>
        <p className="text-center font-semibold text-studio">Click image to sample</p>
        <p className="text-sm text-studio-muted mt-2">Pick a color to analyze</p>
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
    <div className="bg-white text-studio font-sans min-h-full">

      {/* HERO SWATCH AREA - Always Visible */}
      <div className="p-4 lg:p-6 border-b border-gray-100 bg-[#fbfbfd]">
        <div className="flex flex-col lg:gap-4 gap-2">

          {/* Giant Hero Swatch */}
          <div className="w-full aspect-[2/1] lg:aspect-video rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden group transition-all duration-500"
            style={{ backgroundColor: hex }}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent pointer-events-none"></div>
            <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-3xl"></div>
          </div>

          {/* Hero Info - Now below the swatch for max width */}
          <div className="flex flex-col items-center justify-center pt-1 lg:pt-2">
            <div className="flex items-center gap-4 mb-2">
              <h2 className="text-4xl lg:text-5xl font-black tracking-tighter font-mono text-studio tabular-nums">{hex}</h2>
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
                className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs text-studio focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
              />
            </div>

            {/* Value First Readout */}
            <div className="w-full grid grid-cols-2 gap-4 lg:gap-6 items-center justify-center px-2 lg:px-4 mt-2">
              <div className="flex flex-col items-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                <span className="text-blue-600 text-[10px] lg:text-[11px] uppercase font-black tracking-widest mb-1">Value</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-4xl lg:text-5xl text-studio font-black tabular-nums">{sampledColor.valueMetadata ? Math.round(sampledColor.valueMetadata.y * 100) : valuePercent}%</span>
                </div>
                {sampledColor.valueMetadata ? (
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-sm border border-gray-100 shadow-inner" style={{ backgroundColor: grayscaleHex }}></div>
                      <span className="text-yellow-600 font-mono text-sm font-bold">Step {sampledColor.valueMetadata.step} / {valueScaleSettings?.steps || 7}</span>
                    </div>
                    <span className="text-[9px] text-studio-muted font-mono uppercase">Range: {sampledColor.valueMetadata.range[0].toFixed(2)}-{sampledColor.valueMetadata.range[1].toFixed(2)}</span>
                    <span className="text-[9px] text-blue-500 font-mono font-bold uppercase">Rank: {(sampledColor.valueMetadata.percentile * 100).toFixed(1)}%</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-studio-muted font-mono text-sm">Value Step: —</span>
                  </div>
                )}
                {!sampledColor.valueMetadata && <span className="text-[10px] text-studio-muted font-bold uppercase tracking-tight mt-1">{valueBand}</span>}
              </div>

              <div className="flex flex-col items-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                <span className="text-studio-dim text-[10px] lg:text-[11px] uppercase font-bold tracking-widest mb-1">Chroma</span>
                <span className="font-mono text-2xl lg:text-3xl text-studio font-black">{chroma.label}</span>
                <div className="w-px h-2 bg-gray-100 my-1"></div>
                <span className="text-[10px] text-studio-muted font-mono uppercase tracking-tight">{hex}</span>
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
            ? 'text-studio border-b-2 border-blue-600 bg-white'
            : 'text-studio-dim hover:text-studio-secondary hover:bg-gray-50'
            }`}
        >
          Painter
        </button>
        <button
          onClick={() => setActiveTab('thread')}
          className={`flex-1 py-3 text-sm font-bold uppercase tracking-wide transition-colors ${activeTab === 'thread'
            ? 'text-studio border-b-2 border-pink-600 bg-white'
            : 'text-studio-dim hover:text-studio-secondary hover:bg-gray-50'
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
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${painterSubTab === 'recipe'
              ? 'text-blue-600 border-b border-blue-500 bg-blue-50/30'
              : 'text-studio-dim hover:text-studio-secondary hover:bg-gray-50'
              }`}
          >
            Recipe
          </button>
          <button
            onClick={() => setPainterSubTab('mixlab')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${painterSubTab === 'mixlab'
              ? 'text-purple-600 border-b border-purple-500 bg-purple-50/30'
              : 'text-studio-dim hover:text-studio-secondary hover:bg-gray-50'
              }`}
          >
            Mix Lab
          </button>
          <button
            onClick={() => setPainterSubTab('harmonies')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${painterSubTab === 'harmonies'
              ? 'text-teal-600 border-b border-teal-500 bg-teal-50/30'
              : 'text-studio-dim hover:text-studio-secondary hover:bg-gray-50'
              }`}
          >
            Harmonies
          </button>
          <button
            onClick={() => setPainterSubTab('valueScale')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${painterSubTab === 'valueScale'
              ? 'text-yellow-600 border-b border-yellow-500 bg-yellow-50/30'
              : 'text-studio-dim hover:text-studio-secondary hover:bg-gray-50'
              }`}
          >
            Value
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
                <PaintRecipe hsl={hsl} targetHex={hex} activePalette={activePalette} />
              ) : painterSubTab === 'mixlab' ? (
                <MixLab targetHex={hex} />
              ) : painterSubTab === 'harmonies' ? (
                <ColorHarmonies rgb={rgb} onColorSelect={onColorSelect} />
              ) : (
                <div className="space-y-6">
                  {/* Value Scale Controls */}
                  <div className="p-4 bg-gray-900 rounded-lg border border-gray-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">Value Distribution</h3>
                    </div>

                    {histogramBins && (
                      <ValueHistogram
                        bins={histogramBins}
                        thresholds={valueScaleResult?.thresholds}
                        currentValue={sampledColor ? getLuminance(sampledColor.rgb.r, sampledColor.rgb.g, sampledColor.rgb.b) / 100 : undefined}
                      />
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Settings</h3>
                      <button
                        onClick={() => onValueScaleChange?.({ ...valueScaleSettings!, enabled: !valueScaleSettings?.enabled })}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${valueScaleSettings?.enabled ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
                      >
                        {valueScaleSettings?.enabled ? 'Overlay ON' : 'Overlay OFF'}
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Steps</span>
                          <select
                            value={valueScaleSettings?.steps}
                            onChange={(e) => onValueScaleChange?.({ ...valueScaleSettings!, steps: parseInt(e.target.value) })}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="5">5 Steps</option>
                            <option value="7">7 Steps</option>
                            <option value="9">9 Steps</option>
                            <option value="11">11 Steps</option>
                          </select>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Mode</span>
                          <select
                            value={valueScaleSettings?.mode}
                            onChange={(e) => onValueScaleChange?.({ ...valueScaleSettings!, mode: e.target.value as any })}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="Even">Even</option>
                            <option value="Percentile">Percentile</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Clip</span>
                          <select
                            value={valueScaleSettings?.clip}
                            onChange={(e) => onValueScaleChange?.({ ...valueScaleSettings!, clip: parseFloat(e.target.value) as any })}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="0">None (0%)</option>
                            <option value="0.005">0.5%</option>
                            <option value="0.01">1%</option>
                            <option value="0.02">2%</option>
                          </select>
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase mb-1">
                            <span>Opacity</span>
                            <span>{Math.round((valueScaleSettings?.opacity ?? 0.45) * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={Math.round((valueScaleSettings?.opacity ?? 0.45) * 100)}
                            onChange={(e) => onValueScaleChange?.({ ...valueScaleSettings!, opacity: parseInt(e.target.value) / 100 })}
                            className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => {
                          const canvas = document.getElementById('value-map-canvas') as HTMLCanvasElement;
                          if (!canvas) {
                            alert('Value map canvas not found. Please enable the overlay first.');
                            return;
                          }

                          // Convert canvas to blob and download
                          canvas.toBlob((blob) => {
                            if (!blob) {
                              alert('Failed to generate PNG');
                              return;
                            }

                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `value-map-${Date.now()}.png`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                          }, 'image/png');
                        }}
                        className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-[10px] font-bold text-gray-300 transition-colors"
                      >
                        Download PNG
                      </button>
                      <button
                        onClick={() => {
                          const data = JSON.stringify(valueScaleSettings, null, 2);
                          navigator.clipboard.writeText(data);
                          alert('Value Scale settings copied to clipboard!');
                        }}
                        className="flex-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-[10px] font-bold text-gray-300 transition-colors"
                      >
                        Copy JSON
                      </button>
                    </div>
                  </div>

                  {/* Value Scale Legend */}
                  <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                    <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider">Value Step Legend</h3>
                    <div className="space-y-2">
                      {Array.from({ length: valueScaleSettings?.steps || 0 }).map((_, i) => {
                        const stepVal = (i / ((valueScaleSettings?.steps || 1) - 1));
                        const color = `rgb(${Math.round(stepVal * 255)}, ${Math.round(stepVal * 255)}, ${Math.round(stepVal * 255)})`;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded border border-gray-700 shadow-sm flex-shrink-0" style={{ backgroundColor: color }}></div>
                            <div className="flex-1 flex flex-col">
                              <span className="text-[11px] font-bold text-gray-200">Step {i + 1}</span>
                              <span className="text-[9px] text-gray-500 font-mono italic">
                                Approx {stepVal.toFixed(2)} Luminance
                              </span>
                            </div>
                            {valueScaleSettings?.mode === 'Percentile' && (
                              <span className="text-[10px] text-yellow-500/80 font-mono font-bold">~{Math.round(100 / valueScaleSettings.steps)}% pixels</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Tech Specs */}
            <section className="p-3 lg:p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <h3 className="text-[10px] lg:text-xs font-bold text-studio-dim mb-2 lg:mb-3 uppercase tracking-widest">Technical Data</h3>
              <div className="grid grid-cols-2 gap-3 lg:gap-4 text-xs lg:text-sm font-mono">
                <div>
                  <span className="text-studio-muted block text-[9px] lg:text-xs">RGB</span>
                  <span className="text-studio">{rgb.r}, {rgb.g}, {rgb.b}</span>
                </div>
                <div>
                  <span className="text-studio-muted block text-[9px] lg:text-xs">HSL</span>
                  <span className="text-studio">{hsl.h}°, {hsl.s}%, {hsl.l}%</span>
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
