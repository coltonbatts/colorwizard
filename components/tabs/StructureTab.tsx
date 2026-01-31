'use client'

import { useStore } from '@/lib/store/useStore'

export default function StructureTab() {
    const rulerGridEnabled = useStore(state => state.rulerGridEnabled)
    const setRulerGridEnabled = useStore(state => state.setRulerGridEnabled)
    const rulerGridSpacing = useStore(state => state.rulerGridSpacing)
    const setRulerGridSpacing = useStore(state => state.setRulerGridSpacing)
    const gridOpacity = useStore(state => state.gridOpacity)
    const setGridOpacity = useStore(state => state.setGridOpacity)

    return (
        <div className="p-4 space-y-6">
            <div className="space-y-2">
                <h3 className="text-lg font-semibold text-studio-secondary">Stage 2: Structure</h3>
                <p className="text-sm text-studio-dim">
                    Overlay a grid or guides to help you transfer and map your composition.
                </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-6">
                {/* Grid Toggle */}
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <p className="text-sm font-medium text-studio-secondary">Square Grid</p>
                        <p className="text-xs text-studio-dim">Overlay a uniform grid</p>
                    </div>
                    <button
                        onClick={() => setRulerGridEnabled(!rulerGridEnabled)}
                        className={`
              w-12 h-6 rounded-full transition-colors relative
              ${rulerGridEnabled ? 'bg-blue-600' : 'bg-gray-200'}
            `}
                    >
                        <div className={`
              absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform
              ${rulerGridEnabled ? 'translate-x-6' : 'translate-x-0'}
            `} />
                    </button>
                </div>

                {rulerGridEnabled && (
                    <div className="space-y-4 pt-2 border-t border-gray-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Spacing */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-studio-dim">
                                <span>Spacing (inches)</span>
                                <span className="font-mono">{rulerGridSpacing}"</span>
                            </div>
                            <div className="flex gap-2">
                                {[0.25, 0.5, 1, 2].map(val => (
                                    <button
                                        key={val}
                                        onClick={() => setRulerGridSpacing(val as 0.25 | 0.5 | 1 | 2)}
                                        className={`
                      flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all
                      ${rulerGridSpacing === val
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'bg-gray-50 text-studio-dim hover:bg-gray-100'}
                    `}
                                    >
                                        {val}"
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Opacity */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-studio-dim">
                                <span>Opacity</span>
                                <span className="font-mono">{Math.round(gridOpacity * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0.1"
                                max="1.0"
                                step="0.05"
                                value={gridOpacity}
                                onChange={(e) => setGridOpacity(parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                <h4 className="text-xs font-semibold text-amber-900 mb-1 flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Calibration Required
                </h4>
                <p className="text-[10px] text-amber-800 leading-relaxed italic">
                    To ensure grid accuracy, calibrate your device scale in the toolbar at the top.
                </p>
            </div>
        </div>
    )
}
