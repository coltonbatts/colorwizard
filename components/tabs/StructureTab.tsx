'use client'

import { useCalibrationStore } from '@/lib/store/useCalibrationStore'

export default function StructureTab() {
    const rulerGridEnabled = useCalibrationStore(state => state.rulerGridEnabled)
    const setRulerGridEnabled = useCalibrationStore(state => state.setRulerGridEnabled)
    const rulerGridSpacing = useCalibrationStore(state => state.rulerGridSpacing)
    const setRulerGridSpacing = useCalibrationStore(state => state.setRulerGridSpacing)
    const gridOpacity = useCalibrationStore(state => state.gridOpacity)
    const setGridOpacity = useCalibrationStore(state => state.setGridOpacity)

    return (
        <div className="p-3">
            <div className="rounded-xl border border-ink-hairline bg-paper-elevated p-3 space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">Grid</p>
                        <p className="mt-1 text-sm font-semibold text-ink">Square</p>
                    </div>
                    <button
                        onClick={() => setRulerGridEnabled(!rulerGridEnabled)}
                        className={`
              w-12 h-6 rounded-full transition-colors relative
              ${rulerGridEnabled ? 'bg-signal' : 'bg-paper-recessed'}
            `}
                    >
                        <div className={`
              absolute top-1 left-1 w-4 h-4 bg-paper-elevated rounded-full transition-transform
              ${rulerGridEnabled ? 'translate-x-6' : 'translate-x-0'}
            `} />
                    </button>
                </div>

                {rulerGridEnabled && (
                    <div className="space-y-4 pt-2 border-t border-ink-hairline animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-ink-faint">
                                <span>Spacing</span>
                                <span className="font-mono">{rulerGridSpacing}&quot;</span>
                            </div>
                            <div className="flex gap-2">
                                {[0.25, 0.5, 1, 2].map(val => (
                                    <button
                                        key={val}
                                        onClick={() => setRulerGridSpacing(val as 0.25 | 0.5 | 1 | 2)}
                                        className={`
                      flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all
                      ${rulerGridSpacing === val
                                                ? 'bg-signal text-white shadow-sm'
                                                : 'bg-paper-recessed text-ink-faint hover:bg-paper-recessed'}
                    `}
                                    >
                                        {val}&quot;
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-ink-faint">
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
                                className="w-full h-1.5 bg-paper-recessed rounded-lg appearance-none cursor-pointer accent-signal"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
