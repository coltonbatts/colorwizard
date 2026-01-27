'use client'

import { useStore } from '@/lib/store/useStore'

export default function HighlightControls() {
    const activeHighlightColor = useStore(state => state.activeHighlightColor)
    const setActiveHighlightColor = useStore(state => state.setActiveHighlightColor)
    const highlightTolerance = useStore(state => state.highlightTolerance)
    const setHighlightTolerance = useStore(state => state.setHighlightTolerance)
    const highlightMode = useStore(state => state.highlightMode)
    const setHighlightMode = useStore(state => state.setHighlightMode)

    if (!activeHighlightColor) return null

    return (
        <div className="mb-4 p-4 bg-white rounded-2xl flex items-center gap-6 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-studio-dim uppercase tracking-widest">Highlight Mode</span>
                <div className="flex bg-gray-50 rounded-xl p-1 border border-gray-100 shadow-inner">
                    <button
                        onClick={() => setHighlightMode('solid')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${highlightMode === 'solid' ? 'bg-white text-blue-600 shadow-sm' : 'text-studio-dim hover:text-studio-secondary'}`}
                    >
                        Solid
                    </button>
                    <button
                        onClick={() => setHighlightMode('heatmap')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${highlightMode === 'heatmap' ? 'bg-white text-blue-600 shadow-sm' : 'text-studio-dim hover:text-studio-secondary'}`}
                    >
                        Heatmap
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4 flex-1">
                <span className="text-[10px] font-black text-studio-dim uppercase tracking-widest whitespace-nowrap">Tolerance ({highlightTolerance})</span>
                <input
                    type="range"
                    min="1"
                    max="60"
                    value={highlightTolerance}
                    onChange={(e) => setHighlightTolerance(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
            </div>

            <button
                onClick={() => setActiveHighlightColor(null)}
                className="ml-auto px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
                Clear
            </button>
        </div>
    )
}
