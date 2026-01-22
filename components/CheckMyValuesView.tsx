'use client'

/**
 * CheckMyValuesView - Full-screen view for comparing value (lightness/darkness) 
 * between reference and WIP images.
 * Displays both images side-by-side in grayscale with optional zebra stripe overlay
 * highlighting areas where values differ.
 */

import { useState, useEffect, useCallback } from 'react'
import ValueCompareCanvas from '@/components/ValueCompareCanvas'
import { compareValues, ComparisonResult } from '@/lib/valueComparison'

interface CheckMyValuesViewProps {
    /** The reference image from the main canvas */
    referenceImage: HTMLImageElement | null
    /** Callback to close the view */
    onClose: () => void
}

export default function CheckMyValuesView({ referenceImage, onClose }: CheckMyValuesViewProps) {
    // WIP image state (local, not in global store)
    const [wipImage, setWipImage] = useState<HTMLImageElement | null>(null)

    // Controls
    const [showProblemAreas, setShowProblemAreas] = useState(false)
    const [threshold, setThreshold] = useState(25)

    // Comparison result
    const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null)

    // Compute comparison when both images are present
    useEffect(() => {
        if (referenceImage && wipImage) {
            const result = compareValues(referenceImage, wipImage, threshold)
            setComparisonResult(result)
        } else {
            setComparisonResult(null)
        }
    }, [referenceImage, wipImage, threshold])

    // Clear WIP image
    const handleClearWip = useCallback(() => {
        setWipImage(null)
        setComparisonResult(null)
    }, [])

    // Handle escape key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    // Format percentage
    const formatPercent = (value: number) => `${value.toFixed(1)}%`

    return (
        <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        <span className="text-sm font-medium">Back to Canvas</span>
                    </button>
                    <div className="w-px h-6 bg-gray-700" />
                    <h1 className="text-lg font-bold text-white">Check My Values</h1>
                </div>

                <div className="flex items-center gap-6">
                    {/* Show Problem Areas Toggle */}
                    <label className="flex items-center gap-3 cursor-pointer">
                        <span className="text-sm font-medium text-gray-300">Show Problem Areas</span>
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={showProblemAreas}
                                onChange={(e) => setShowProblemAreas(e.target.checked)}
                                className="sr-only"
                                disabled={!comparisonResult}
                            />
                            <div className={`w-12 h-6 rounded-full transition-colors ${showProblemAreas ? 'bg-blue-600' : 'bg-gray-600'
                                } ${!comparisonResult ? 'opacity-50' : ''}`}>
                                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${showProblemAreas ? 'translate-x-6' : ''
                                    }`} />
                            </div>
                        </div>
                    </label>

                    {/* Threshold Slider */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400">Threshold</span>
                        <input
                            type="range"
                            min="5"
                            max="50"
                            value={threshold}
                            onChange={(e) => setThreshold(Number(e.target.value))}
                            className="w-32 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-sm text-gray-300 w-8 text-right">{threshold}</span>
                    </div>

                    {/* Stats */}
                    {comparisonResult && (
                        <>
                            <div className="w-px h-6 bg-gray-700" />
                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <span className="text-gray-300">Too Dark: {formatPercent(comparisonResult.stats.tooDarkPercentage)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                                    <span className="text-gray-300">Too Light: {formatPercent(comparisonResult.stats.tooLightPercentage)}</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Clear WIP */}
                    {wipImage && (
                        <>
                            <div className="w-px h-6 bg-gray-700" />
                            <button
                                onClick={handleClearWip}
                                className="text-sm text-red-400 hover:text-red-300 transition-colors"
                            >
                                Clear WIP
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* Main Content */}
            {!referenceImage ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center p-8">
                        <svg className="w-20 h-20 mx-auto text-gray-600 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <h2 className="text-xl font-semibold text-gray-400 mb-2">No Reference Image</h2>
                        <p className="text-gray-500 mb-6">
                            Upload an image in the main canvas first, then return here to compare values.
                        </p>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                        >
                            Go to Canvas
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col md:flex-row min-h-0">
                    {/* Reference Canvas */}
                    <div className="flex-1 min-h-[300px] md:min-h-0 border-b md:border-b-0 md:border-r border-gray-700">
                        <ValueCompareCanvas
                            image={referenceImage}
                            label="Reference (Grayscale)"
                            isReference={true}
                            comparisonResult={comparisonResult}
                            showProblemAreas={showProblemAreas}
                        />
                    </div>

                    {/* WIP Canvas */}
                    <div className="flex-1 min-h-[300px] md:min-h-0">
                        <ValueCompareCanvas
                            image={wipImage}
                            label="Work in Progress"
                            onImageLoad={setWipImage}
                            showUpload={true}
                            isReference={false}
                            comparisonResult={comparisonResult}
                            showProblemAreas={showProblemAreas}
                        />
                    </div>
                </div>
            )}

            {/* Legend Footer */}
            {showProblemAreas && comparisonResult && (
                <div className="flex items-center justify-center gap-8 py-3 bg-gray-800 border-t border-gray-700">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-4" style={{
                            background: 'repeating-linear-gradient(45deg, #EF4444, #EF4444 5px, transparent 5px, transparent 10px)'
                        }} />
                        <span className="text-sm text-gray-300">WIP is too dark</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-4" style={{
                            background: 'repeating-linear-gradient(45deg, #3B82F6, #3B82F6 5px, transparent 5px, transparent 10px)'
                        }} />
                        <span className="text-sm text-gray-300">WIP is too light</span>
                    </div>
                </div>
            )}
        </div>
    )
}
