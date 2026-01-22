'use client'

/**
 * CheckMyValuesTab - Compare value (lightness/darkness) between reference and WIP images.
 * Displays both images side-by-side in grayscale with optional zebra stripe overlay
 * highlighting areas where values differ.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import ValueCompareCanvas from '@/components/ValueCompareCanvas'
import { compareValues, ComparisonResult } from '@/lib/valueComparison'

interface CheckMyValuesTabProps {
    /** The reference image from the main canvas */
    referenceImage: HTMLImageElement | null
}

export default function CheckMyValuesTab({ referenceImage }: CheckMyValuesTabProps) {
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

    // Format percentage
    const formatPercent = (value: number) => `${value.toFixed(1)}%`

    return (
        <div className="flex flex-col h-full">
            {/* Controls Header */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-white border-b border-gray-100">
                {/* Show Problem Areas Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                    <div className="relative">
                        <input
                            type="checkbox"
                            checked={showProblemAreas}
                            onChange={(e) => setShowProblemAreas(e.target.checked)}
                            className="sr-only"
                            disabled={!comparisonResult}
                        />
                        <div className={`w-10 h-5 rounded-full transition-colors ${showProblemAreas ? 'bg-blue-600' : 'bg-gray-300'
                            } ${!comparisonResult ? 'opacity-50' : ''}`}>
                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showProblemAreas ? 'translate-x-5' : ''
                                }`} />
                        </div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Show Problem Areas</span>
                </label>

                {/* Threshold Slider */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Threshold</span>
                    <input
                        type="range"
                        min="5"
                        max="50"
                        value={threshold}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                        className="w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <span className="text-xs text-gray-600 w-6">{threshold}</span>
                </div>

                {/* Stats (when comparison exists) */}
                {comparisonResult && (
                    <div className="flex items-center gap-4 ml-auto text-xs">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-gray-600">Too Dark: {formatPercent(comparisonResult.stats.tooDarkPercentage)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-gray-600">Too Light: {formatPercent(comparisonResult.stats.tooLightPercentage)}</span>
                        </div>
                    </div>
                )}

                {/* Clear WIP button */}
                {wipImage && (
                    <button
                        onClick={handleClearWip}
                        className="text-xs text-red-500 hover:text-red-600 transition-colors"
                    >
                        Clear WIP
                    </button>
                )}
            </div>

            {/* No Reference Image State */}
            {!referenceImage ? (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                    <div className="text-center p-8">
                        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">No Reference Image</h3>
                        <p className="text-sm text-gray-500">
                            Upload an image in the main canvas first, then return here to compare values.
                        </p>
                    </div>
                </div>
            ) : (
                /* Dual Canvas Layout */
                <div className="flex-1 flex flex-col md:flex-row min-h-0">
                    {/* Reference Canvas */}
                    <div className="flex-1 min-h-[200px] md:min-h-0 border-b md:border-b-0 md:border-r border-gray-200">
                        <ValueCompareCanvas
                            image={referenceImage}
                            label="Reference (Grayscale)"
                            isReference={true}
                            comparisonResult={comparisonResult}
                            showProblemAreas={showProblemAreas}
                        />
                    </div>

                    {/* WIP Canvas */}
                    <div className="flex-1 min-h-[200px] md:min-h-0">
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

            {/* Legend */}
            {showProblemAreas && comparisonResult && (
                <div className="flex items-center justify-center gap-6 p-3 bg-gray-800 text-white text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-3 bg-red-500" style={{
                            background: 'repeating-linear-gradient(45deg, #EF4444, #EF4444 5px, transparent 5px, transparent 10px)'
                        }} />
                        <span>WIP is too dark</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-3 bg-blue-500" style={{
                            background: 'repeating-linear-gradient(45deg, #3B82F6, #3B82F6 5px, transparent 5px, transparent 10px)'
                        }} />
                        <span>WIP is too light</span>
                    </div>
                </div>
            )}
        </div>
    )
}
