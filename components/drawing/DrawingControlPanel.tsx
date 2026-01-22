'use client'

/**
 * DrawingControlPanel - Control panel for Check My Drawing feature.
 * Contains image selector, transform controls, quick actions, and canvas controls.
 */

import { useCallback } from 'react'
import type { SelectedImage } from './InfiniteCanvas'

interface DrawingControlPanelProps {
    /** Currently selected image */
    selectedImage: SelectedImage
    /** Callback to select image */
    onSelectImage: (image: SelectedImage) => void

    // Reference image controls
    /** Reference image exists */
    hasReferenceImage: boolean
    /** Reference scale (0.5 - 2.0) */
    referenceScale: number
    /** Callback to change reference scale */
    onReferenceScaleChange: (scale: number) => void
    /** Reset reference transform */
    onResetReference: () => void

    // WIP image controls
    /** WIP image exists */
    hasWipImage: boolean
    /** WIP opacity (0 - 1) */
    wipOpacity: number
    /** Callback to change WIP opacity */
    onWipOpacityChange: (opacity: number) => void
    /** WIP scale (0.25 - 3.0) */
    wipScale: number
    /** Callback to change WIP scale */
    onWipScaleChange: (scale: number) => void
    /** WIP rotation (0 - 360) */
    wipRotation: number
    /** Whether perspective mode is enabled */
    perspectiveEnabled: boolean
    /** Toggle perspective mode */
    onTogglePerspective: () => void
    /** Reset WIP transform */
    onResetWip: () => void

    // Quick actions
    /** Match WIP size to reference */
    onMatchSize: () => void
    /** Center both images */
    onCenterBoth: () => void
    /** Position images side by side */
    onSideBySide: () => void
    /** Fit both images to view */
    onFitToView: () => void

    // Canvas controls
    /** Current zoom level (0.25 - 4.0) */
    canvasZoom: number
    /** Reset canvas view */
    onResetView: () => void

    // Grayscale
    /** Whether grayscale mode is enabled */
    isGrayscale: boolean
    /** Toggle grayscale */
    onToggleGrayscale: () => void

    // Layout
    /** Whether to show as compact (mobile) */
    isCompact?: boolean
}

export default function DrawingControlPanel({
    selectedImage,
    onSelectImage,
    hasReferenceImage,
    referenceScale,
    onReferenceScaleChange,
    onResetReference,
    hasWipImage,
    wipOpacity,
    onWipOpacityChange,
    wipScale,
    onWipScaleChange,
    wipRotation,
    perspectiveEnabled,
    onTogglePerspective,
    onResetWip,
    onMatchSize,
    onCenterBoth,
    onSideBySide,
    onFitToView,
    canvasZoom,
    onResetView,
    isGrayscale,
    onToggleGrayscale,
    isCompact = false
}: DrawingControlPanelProps) {

    // Slider component for consistency
    const Slider = ({
        label,
        value,
        min,
        max,
        step = 0.01,
        onChange,
        displayValue,
        disabled = false
    }: {
        label: string
        value: number
        min: number
        max: number
        step?: number
        onChange: (value: number) => void
        displayValue?: string
        disabled?: boolean
    }) => (
        <div className={`flex items-center gap-3 ${disabled ? 'opacity-50' : ''}`}>
            <span className="text-xs font-medium text-gray-400 w-16 shrink-0">{label}</span>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                disabled={disabled}
                className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:cursor-not-allowed"
            />
            <span className="text-xs font-mono text-gray-400 w-12 text-right">
                {displayValue ?? value.toFixed(0)}
            </span>
        </div>
    )

    // Quick action button
    const QuickButton = ({
        onClick,
        disabled = false,
        children
    }: {
        onClick: () => void
        disabled?: boolean
        children: React.ReactNode
    }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className="px-3 py-2 text-xs font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
            {children}
        </button>
    )

    const panelClasses = isCompact
        ? 'bg-gray-800 border-t border-gray-700 p-4 space-y-4'
        : 'bg-gray-800 border-l border-gray-700 p-4 space-y-6 w-72 shrink-0 overflow-y-auto'

    return (
        <div className={panelClasses}>
            {/* Image Selector */}
            <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Image</h3>
                <div className="flex bg-gray-700/50 rounded-lg p-1">
                    <button
                        onClick={() => onSelectImage('reference')}
                        disabled={!hasReferenceImage}
                        className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${selectedImage === 'reference'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
                            }`}
                    >
                        Reference
                    </button>
                    <button
                        onClick={() => onSelectImage('wip')}
                        disabled={!hasWipImage}
                        className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all ${selectedImage === 'wip'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
                            }`}
                    >
                        WIP
                    </button>
                </div>
            </div>

            {/* Reference Controls */}
            {selectedImage === 'reference' && hasReferenceImage && (
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reference Controls</h3>
                    <Slider
                        label="Scale"
                        value={referenceScale * 100}
                        min={50}
                        max={200}
                        step={1}
                        onChange={(v) => onReferenceScaleChange(v / 100)}
                        displayValue={`${Math.round(referenceScale * 100)}%`}
                    />
                    <button
                        onClick={onResetReference}
                        className="w-full py-2 text-xs font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Reset Reference
                    </button>
                </div>
            )}

            {/* WIP Controls */}
            {selectedImage === 'wip' && hasWipImage && (
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">WIP Controls</h3>

                    {/* Opacity - hero control */}
                    <div className="bg-gray-700/30 p-3 rounded-lg">
                        <Slider
                            label="Opacity"
                            value={wipOpacity * 100}
                            min={0}
                            max={100}
                            step={1}
                            onChange={(v) => onWipOpacityChange(v / 100)}
                            displayValue={`${Math.round(wipOpacity * 100)}%`}
                        />
                    </div>

                    {/* Scale */}
                    <Slider
                        label="Scale"
                        value={wipScale * 100}
                        min={25}
                        max={300}
                        step={1}
                        onChange={(v) => onWipScaleChange(v / 100)}
                        displayValue={`${Math.round(wipScale * 100)}%`}
                    />

                    {/* Rotation display */}
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Rotation</span>
                        <span className="font-mono text-gray-300">{Math.round(wipRotation)}°</span>
                    </div>
                    <p className="text-xs text-gray-500">Use the rotation handle above the image to rotate</p>

                    {/* Perspective toggle */}
                    <div className="flex items-center justify-between py-2">
                        <span className="text-xs font-medium text-gray-400">Perspective Warp</span>
                        <button
                            onClick={onTogglePerspective}
                            className={`relative w-10 h-5 rounded-full transition-colors ${perspectiveEnabled ? 'bg-blue-600' : 'bg-gray-600'
                                }`}
                        >
                            <div
                                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${perspectiveEnabled ? 'translate-x-5' : ''
                                    }`}
                            />
                        </button>
                    </div>
                    {perspectiveEnabled && (
                        <p className="text-xs text-gray-500">Drag corners to adjust perspective</p>
                    )}

                    <button
                        onClick={onResetWip}
                        className="w-full py-2 text-xs font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Reset WIP Transform
                    </button>
                </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                    <QuickButton onClick={onMatchSize} disabled={!hasWipImage || !hasReferenceImage}>
                        Match Size
                    </QuickButton>
                    <QuickButton onClick={onCenterBoth} disabled={!hasReferenceImage}>
                        Center Both
                    </QuickButton>
                    <QuickButton onClick={onSideBySide} disabled={!hasWipImage || !hasReferenceImage}>
                        Side by Side
                    </QuickButton>
                    <QuickButton onClick={onFitToView} disabled={!hasReferenceImage}>
                        Fit to View
                    </QuickButton>
                </div>
            </div>

            {/* Canvas Controls */}
            <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Canvas</h3>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Zoom</span>
                    <span className="text-xs font-mono text-gray-300">{Math.round(canvasZoom * 100)}%</span>
                </div>
                <button
                    onClick={onResetView}
                    className="w-full py-2 text-xs font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                >
                    Reset View
                </button>
            </div>

            {/* Grayscale Toggle */}
            <div className="pt-2 border-t border-gray-700">
                <div className="flex items-center justify-between py-2">
                    <span className="text-xs font-medium text-gray-400">Grayscale Mode</span>
                    <button
                        onClick={onToggleGrayscale}
                        className={`relative w-10 h-5 rounded-full transition-colors ${isGrayscale ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                    >
                        <div
                            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isGrayscale ? 'translate-x-5' : ''
                                }`}
                        />
                    </button>
                </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="pt-2 border-t border-gray-700 text-xs text-gray-500 space-y-1">
                <p><kbd className="px-1 bg-gray-700 rounded">Space</kbd> + drag = pan</p>
                <p><kbd className="px-1 bg-gray-700 rounded">Scroll</kbd> = zoom</p>
                <p><kbd className="px-1 bg-gray-700 rounded">G</kbd> = grayscale</p>
                <p><kbd className="px-1 bg-gray-700 rounded">Esc</kbd> = close</p>
            </div>
        </div>
    )
}
