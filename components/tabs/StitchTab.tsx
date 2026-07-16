'use client'

import { useStitchStore } from '@/lib/store/useStitchStore'
import { useDmcStore } from '@/lib/store/useDmcStore'
import type { LegendItem } from '@/lib/image/quantization'

interface StitchTabProps {
  legend: LegendItem[]
  gridWidth: number
  gridHeight: number
  onColorSelect?: (rgb: { r: number; g: number; b: number }) => void
}

export default function StitchTab({
  legend,
  gridWidth,
  gridHeight,
  onColorSelect,
}: StitchTabProps) {
  const {
    fidelity,
    maxColors,
    symbolsEnabled,
    gridlinesEnabled,
    stitchOpacity,
    highlightedDmcCode,
    setFidelity,
    setMaxColors,
    setSymbolsEnabled,
    setGridlinesEnabled,
    setStitchOpacity,
    setHighlightedDmcCode,
  } = useStitchStore()

  const {
    stash,
    shoppingList,
    toggleStash,
    toggleShoppingList,
    addToShoppingList,
  } = useDmcStore()

  // Calculate stitch statistics
  const totalStitches = gridWidth * gridHeight
  const uniqueColorsCount = legend.length
  
  // Stash counts
  const stashedColorsCount = legend.filter(item => stash.includes(item.dmcCode)).length
  const missingColors = legend.filter(item => !stash.includes(item.dmcCode))

  const handleAddAllMissingToShopping = () => {
    missingColors.forEach(item => {
      addToShoppingList(item.dmcCode)
    })
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="tab-content-scroll h-full stitch-tab-container">
      <div className="space-y-6 pb-20 p-4">
        
        {/* Statistics Card */}
        <section className="rounded-lg border border-ink-hairline bg-paper-recessed p-4" aria-labelledby="stitch-pattern-info">
          <h3 id="stitch-pattern-info" className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Pattern info</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-xs text-ink-faint">Grid Dimensions</span>
              <span className="font-semibold text-ink">{gridWidth} × {gridHeight} sts</span>
            </div>
            <div>
              <span className="block text-xs text-ink-faint">Total Stitches</span>
              <span className="font-semibold text-ink">{totalStitches.toLocaleString()}</span>
            </div>
            <div>
              <span className="block text-xs text-ink-faint">Required Colors</span>
              <span className="font-semibold text-ink">{uniqueColorsCount} threads</span>
            </div>
            <div>
              <span className="block text-xs text-ink-faint">Owned / Missing</span>
              <span className="font-semibold text-ink text-xs">
                <span className="font-bold text-emerald-600">{stashedColorsCount}</span> owned / <span className="font-bold text-amber-600">{missingColors.length}</span> missing
              </span>
            </div>
          </div>

          {missingColors.length > 0 && (
            <button
              type="button"
              onClick={handleAddAllMissingToShopping}
              className="mt-4 min-h-10 w-full rounded-md border border-ink bg-ink px-3 py-2 text-xs font-semibold text-paper-elevated shadow-sm transition-colors hover:bg-graphite"
            >
              Add {missingColors.length} Missing to Shopping List
            </button>
          )}
        </section>

        {/* Configurations */}
        <div className="space-y-4 border-t border-ink-hairline pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Grid configuration</h3>

          {/* Fidelity Slider */}
          <div>
            <div className="mb-1 flex justify-between text-xs text-ink-secondary">
              <label htmlFor="stitch-grid-size">Grid Size (Stitches Wide/Tall)</label>
              <output htmlFor="stitch-grid-size" className="font-mono font-semibold tabular-nums">{fidelity}</output>
            </div>
            <input
              id="stitch-grid-size"
              name="stitch-grid-size"
              type="range"
              min="16"
              max="120"
              value={fidelity}
              onChange={(e) => setFidelity(parseInt(e.target.value))}
              className="w-full h-1.5 bg-paper-recessed rounded-lg appearance-none cursor-pointer accent-studio"
            />
          </div>

          {/* Max Colors Slider */}
          <div>
            <div className="mb-1 flex justify-between text-xs text-ink-secondary">
              <label htmlFor="stitch-max-colors">Max Colors (Threads)</label>
              <output htmlFor="stitch-max-colors" className="font-mono font-semibold tabular-nums">{maxColors}</output>
            </div>
            <input
              id="stitch-max-colors"
              name="stitch-max-colors"
              type="range"
              min="2"
              max="40"
              value={maxColors}
              onChange={(e) => setMaxColors(parseInt(e.target.value))}
              className="w-full h-1.5 bg-paper-recessed rounded-lg appearance-none cursor-pointer accent-studio"
            />
          </div>

          {/* Opacity Slider */}
          <div>
            <div className="mb-1 flex justify-between text-xs text-ink-secondary">
              <label htmlFor="stitch-opacity">Stitch Opacity</label>
              <output htmlFor="stitch-opacity" className="font-mono font-semibold tabular-nums">{Math.round(stitchOpacity * 100)}%</output>
            </div>
            <input
              id="stitch-opacity"
              name="stitch-opacity"
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={stitchOpacity}
              onChange={(e) => setStitchOpacity(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-paper-recessed rounded-lg appearance-none cursor-pointer accent-studio"
            />
          </div>

          {/* Checkbox settings */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <label className="flex items-center text-xs text-ink-secondary font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={symbolsEnabled}
                onChange={(e) => setSymbolsEnabled(e.target.checked)}
                className="mr-2 h-4 w-4 rounded border-ink-hairline text-studio focus:ring-studio"
              />
              Show Symbols
            </label>
            <label className="flex items-center text-xs text-ink-secondary font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={gridlinesEnabled}
                onChange={(e) => setGridlinesEnabled(e.target.checked)}
                className="mr-2 h-4 w-4 rounded border-ink-hairline text-studio focus:ring-studio"
              />
              Show Gridlines
            </label>
          </div>
        </div>

        {/* Legend */}
        <div className="border-t border-ink-hairline pt-4 stitch-legend-print-section">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Thread legend</h3>
            <button
              type="button"
              onClick={handlePrint}
              disabled={legend.length === 0}
              className="rounded-lg border border-ink-hairline bg-paper hover:bg-paper-recessed text-ink text-xs font-medium py-1 px-3.5 transition-colors inline-flex items-center shadow-xs"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print Pattern
            </button>
          </div>

          {legend.length === 0 ? (
            <p className="text-xs text-ink-faint text-center py-4">No colors quantized. Upload an image to start.</p>
          ) : (
            <>
              <div className="space-y-1 print:hidden">
                {legend.map((item) => {
                  const isHighlighted = highlightedDmcCode === item.dmcCode
                  const isOwned = stash.includes(item.dmcCode)
                  const inShopping = shoppingList.includes(item.dmcCode)

                  return (
                    <div
                      key={item.colorId}
                      onMouseEnter={() => setHighlightedDmcCode(item.dmcCode)}
                      onMouseLeave={() => setHighlightedDmcCode(null)}
                      className={`flex items-center justify-between rounded-lg border p-2 transition-[background-color,border-color,box-shadow] ${
                        isHighlighted
                          ? 'border-ink-muted bg-paper-recessed shadow-sm'
                          : 'bg-paper hover:bg-paper-recessed border-transparent'
                      }`}
                    >
                      {/* Symbol & Swatch */}
                      <button
                        type="button"
                        onClick={() => onColorSelect?.(item.rgb)}
                        className="flex min-w-0 flex-1 items-center space-x-3 rounded-md text-left"
                        aria-label={`Select DMC ${item.dmcCode}, ${item.dmcName}`}
                      >
                        {/* Swatch color with overlay symbol */}
                        <div
                          className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border border-black/15 shadow-inner"
                          style={{ backgroundColor: `rgb(${item.rgb.r}, ${item.rgb.g}, ${item.rgb.b})` }}
                        >
                          <span
                            className={`text-xs font-bold font-mono select-none drop-shadow-md ${
                              (item.rgb.r * 299 + item.rgb.g * 587 + item.rgb.b * 114) / 1000 > 128
                                ? 'text-black'
                                : 'text-white'
                            }`}
                          >
                            {item.symbol}
                          </span>
                        </div>
                        
                        {/* Name / Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline space-x-1.5">
                            <span className="font-mono text-xs font-bold text-ink">DMC {item.dmcCode}</span>
                            <span className="truncate text-xxs text-ink-secondary">{item.dmcName}</span>
                          </div>
                          <div className="text-xxs text-ink-faint">
                            {item.count} stitches ({item.percentage.toFixed(1)}%)
                          </div>
                        </div>
                      </button>

                      {/* Quick Inventory Actions */}
                      <div className="ml-2 flex items-center space-x-1">
                        {/* Owned Status */}
                        <button
                          type="button"
                          onClick={() => toggleStash(item.dmcCode)}
                          className={`rounded-md border p-1.5 transition-[background-color,border-color,color] ${
                            isOwned
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                              : 'bg-paper border-ink-hairline text-ink-faint hover:text-ink hover:bg-paper-recessed'
                          }`}
                          title={isOwned ? "Owned (Remove from stash)" : "Not owned (Add to stash)"}
                          aria-label={isOwned ? `Remove DMC ${item.dmcCode} from owned threads` : `Mark DMC ${item.dmcCode} as owned`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill={isOwned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>

                        {/* Shopping List Status */}
                        <button
                          type="button"
                          onClick={() => toggleShoppingList(item.dmcCode)}
                          disabled={isOwned}
                          className={`rounded-md border p-1.5 transition-[background-color,border-color,color] ${
                            isOwned
                              ? 'opacity-40 cursor-not-allowed bg-paper-recessed border-transparent text-ink-faint'
                              : inShopping
                              ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                              : 'bg-paper border-ink-hairline text-ink-faint hover:text-ink hover:bg-paper-recessed'
                          }`}
                          title={isOwned ? "Owned (Already in stash)" : inShopping ? "In shopping list (Remove)" : "Add to shopping list"}
                          aria-label={isOwned ? `DMC ${item.dmcCode} is already owned` : inShopping ? `Remove DMC ${item.dmcCode} from shopping list` : `Add DMC ${item.dmcCode} to shopping list`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="9" cy="21" r="1" />
                            <circle cx="20" cy="21" r="1" />
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Print-only Table Legend */}
              <table className="hidden print:table w-full border-collapse mt-4 text-xs font-mono text-black">
                <thead>
                  <tr className="border-b border-black/25">
                    <th className="py-2 text-left w-12">Sym</th>
                    <th className="py-2 text-left">DMC Code</th>
                    <th className="py-2 text-left">Color Name</th>
                    <th className="py-2 text-right">Stitch Count</th>
                    <th className="py-2 text-right">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {legend.map((item) => (
                    <tr key={item.colorId} className="border-b border-black/10">
                      <td className="py-2 font-bold text-center border border-black/15 text-sm" style={{ backgroundColor: `rgb(${item.rgb.r}, ${item.rgb.g}, ${item.rgb.b})`, color: (item.rgb.r * 299 + item.rgb.g * 587 + item.rgb.b * 114) / 1000 > 128 ? '#000000' : '#ffffff' }}>
                        {item.symbol}
                      </td>
                      <td className="py-2 pl-2">DMC {item.dmcCode}</td>
                      <td className="py-2">{item.dmcName}</td>
                      <td className="py-2 text-right">{item.count}</td>
                      <td className="py-2 text-right">{item.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
