'use client'

import { useState } from 'react'
import { PaletteConfig, ShoppingListItem, generateShoppingList } from '@/lib/paletteGenerator'

interface ShoppingListPanelProps {
    image: HTMLImageElement | null
}

export default function ShoppingListPanel({ image }: ShoppingListPanelProps) {
    const [items, setItems] = useState<ShoppingListItem[]>([])
    const [isGenerating, setIsGenerating] = useState(false)
    const [config, setConfig] = useState<PaletteConfig>({
        maxColors: 12,
        detailLevel: 'medium',
        minCoverageThreshold: 0.005 // 0.5%
    })

    // State for alert/notifications
    const [message, setMessage] = useState<string | null>(null)

    const handleGenerate = async () => {
        if (!image) return
        setIsGenerating(true)
        setMessage(null)

        // Give UI a moment to update
        await new Promise(resolve => setTimeout(resolve, 50))

        try {
            const list = await generateShoppingList(image, config)
            setItems(list)
        } catch (error) {
            console.error(error)
            setMessage('Failed to generate list.')
        } finally {
            setIsGenerating(false)
        }
    }

    const copyToClipboard = () => {
        const text = items.map(i => `DMC ${i.dmcCode} (${i.dmcName}): ${Math.round(i.coveragePct)}%`).join('\n')
        navigator.clipboard.writeText(text)
        setMessage('Copied to clipboard!')
        setTimeout(() => setMessage(null), 3000)
    }

    const exportCSV = () => {
        const headers = 'DMC Code,Name,Hex,Coverage %\n'
        const rows = items.map(i => `${i.dmcCode},"${i.dmcName}",${i.dmcHex},${i.coveragePct.toFixed(2)}`).join('\n')
        const blob = new Blob([headers + rows], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'dmc-shopping-list.csv'
        a.click()
    }

    const exportJSON = () => {
        const json = JSON.stringify(items, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'dmc-shopping-list.json'
        a.click()
    }

    if (!image) {
        return (
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 h-full flex items-center justify-center text-gray-500">
                Load an image to generate a shopping list
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-gray-900 border-l border-gray-700">
            <div className="p-4 border-b border-gray-800">
                <h2 className="text-xl font-bold text-gray-100 mb-4">Shopping List</h2>

                {/* Controls */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Max Colors</label>
                        <select
                            value={config.maxColors}
                            onChange={(e) => setConfig({ ...config, maxColors: Number(e.target.value) })}
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-gray-200 focus:border-blue-500 outline-none"
                        >
                            {[8, 12, 16, 20, 32, 40, 50, 80, 100].map(n => (
                                <option key={n} value={n}>{n} colors</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-400 mb-1">Detail</label>
                            <select
                                value={config.detailLevel}
                                onChange={(e) => setConfig({ ...config, detailLevel: e.target.value as any })}
                                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-gray-200 focus:border-blue-500 outline-none"
                            >
                                <option value="low">Low (Fast)</option>
                                <option value="medium">Medium</option>
                                <option value="high">High (Slow)</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-400 mb-1">Min Coverage</label>
                            <select
                                value={config.minCoverageThreshold}
                                onChange={(e) => setConfig({ ...config, minCoverageThreshold: Number(e.target.value) })}
                                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-gray-200 focus:border-blue-500 outline-none"
                            >
                                <option value={0}>None</option>
                                <option value={0.001}>0.1%</option>
                                <option value={0.005}>0.5%</option>
                                <option value={0.01}>1%</option>
                                <option value={0.02}>2%</option>
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className={`w-full py-2 rounded-lg font-medium transition-colors ${isGenerating
                                ? 'bg-blue-800 text-blue-200 cursor-wait'
                                : 'bg-blue-600 hover:bg-blue-500 text-white'
                            }`}
                    >
                        {isGenerating ? 'Analyzing Image...' : 'Generate List'}
                    </button>
                </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {items.length === 0 && !isGenerating && (
                    <div className="text-center text-gray-500 mt-10 text-sm">
                        Ready to generate
                    </div>
                )}

                {items.map((item, idx) => (
                    <div key={`${item.dmcCode}-${idx}`} className="flex items-center gap-3 p-2 bg-gray-800/50 rounded hover:bg-gray-800 transition-colors">
                        <div
                            className="w-8 h-8 rounded border border-gray-600 flex-shrink-0"
                            style={{ backgroundColor: item.dmcHex }}
                            title={item.dmcName}
                        />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between">
                                <span className="font-bold text-gray-200 text-sm">DMC {item.dmcCode}</span>
                                <span className="text-xs font-mono text-gray-400">{Math.round(item.coveragePct)}%</span>
                            </div>
                            <div className="text-xs text-gray-400 truncate">{item.dmcName}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Actions */}
            {items.length > 0 && (
                <div className="p-4 border-t border-gray-800 flex flex-col gap-2">
                    {message && (
                        <div className="text-xs text-green-400 text-center mb-2 animate-pulse">
                            {message}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button onClick={copyToClipboard} className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white">
                            Copy
                        </button>
                        <button onClick={exportCSV} className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white">
                            CSV
                        </button>
                        <button onClick={exportJSON} className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white">
                            JSON
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
