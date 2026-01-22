'use client'

/**
 * CheckMyDrawingView - Full-screen view for comparing WIP drawing to reference.
 * Provides perspective warp overlay with draggable corner handles,
 * opacity control, grayscale toggle, and undo support for drawing accuracy checking.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import CheckMyDrawingCanvas from '@/components/CheckMyDrawingCanvas'
import PerspectiveHandles from '@/components/PerspectiveHandles'
import OpacitySlider from '@/components/ui/OpacitySlider'
import { CornerPoints, getDefaultCorners } from '@/lib/perspectiveWarp'

interface CheckMyDrawingViewProps {
    /** The reference image from the main canvas */
    referenceImage: HTMLImageElement | null
    /** Callback to close the view */
    onClose: () => void
}

// Maximum undo history size
const MAX_HISTORY = 50

export default function CheckMyDrawingView({ referenceImage, onClose }: CheckMyDrawingViewProps) {
    // WIP image state
    const [wipImage, setWipImage] = useState<HTMLImageElement | null>(null)

    // Controls state
    const [opacity, setOpacity] = useState(50)
    const [isGrayscale, setIsGrayscale] = useState(false)

    // Container size for responsive layout
    const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })
    const containerRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Corner positions for perspective warp
    const [cornerPositions, setCornerPositions] = useState<CornerPoints>(() =>
        getDefaultCorners(800, 600)
    )

    // Undo history
    const [history, setHistory] = useState<CornerPoints[]>([])
    const [historyIndex, setHistoryIndex] = useState(-1)

    // Helper to get initial corners based on current container/image
    const getInitialCorners = useCallback((): CornerPoints | null => {
        if (!referenceImage || containerSize.width <= 0 || containerSize.height <= 0) return null

        const scaleX = containerSize.width / referenceImage.width
        const scaleY = containerSize.height / referenceImage.height
        const scale = Math.min(scaleX, scaleY, 1)

        const scaledWidth = referenceImage.width * scale
        const scaledHeight = referenceImage.height * scale
        const offsetX = (containerSize.width - scaledWidth) / 2
        const offsetY = (containerSize.height - scaledHeight) / 2

        return {
            topLeft: { x: offsetX, y: offsetY },
            topRight: { x: offsetX + scaledWidth, y: offsetY },
            bottomLeft: { x: offsetX, y: offsetY + scaledHeight },
            bottomRight: { x: offsetX + scaledWidth, y: offsetY + scaledHeight }
        }
    }, [referenceImage, containerSize])

    // Update container size on resize
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect()
                setContainerSize({ width: rect.width, height: rect.height })
            }
        }

        updateSize()
        window.addEventListener('resize', updateSize)
        return () => window.removeEventListener('resize', updateSize)
    }, [])

    // Initialize corner positions when reference image loads or container resizes
    useEffect(() => {
        const initial = getInitialCorners()
        if (initial) {
            setCornerPositions(initial)
            // Initialize history with initial position
            setHistory([initial])
            setHistoryIndex(0)
        }
    }, [getInitialCorners])

    // Handle corner change with optional history tracking
    const handleCornerChange = useCallback((newCorners: CornerPoints, addToHistory: boolean = false) => {
        setCornerPositions(newCorners)

        if (addToHistory) {
            setHistory(prev => {
                // Remove any redo states if we're not at the end
                const newHistory = prev.slice(0, historyIndex + 1)
                // Add new state
                newHistory.push(newCorners)
                // Limit history size
                if (newHistory.length > MAX_HISTORY) {
                    newHistory.shift()
                }
                return newHistory
            })
            setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1))
        }
    }, [historyIndex])

    // Undo function
    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1
            setHistoryIndex(newIndex)
            setCornerPositions(history[newIndex])
        }
    }, [history, historyIndex])

    // Redo function
    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1
            setHistoryIndex(newIndex)
            setCornerPositions(history[newIndex])
        }
    }, [history, historyIndex])

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Close on Escape
            if (e.key === 'Escape') {
                onClose()
                return
            }

            // Undo: Cmd+Z (Mac) or Ctrl+Z (Windows)
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault()
                handleUndo()
                return
            }

            // Redo: Cmd+Shift+Z (Mac) or Ctrl+Y (Windows)
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault()
                handleRedo()
                return
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'y') {
                e.preventDefault()
                handleRedo()
                return
            }

            // Reset: R (without modifiers)
            if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey) {
                handleReset()
                return
            }

            // Grayscale toggle: G (without modifiers)
            if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey) {
                setIsGrayscale(prev => !prev)
                return
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose, handleUndo, handleRedo])

    // Reset corners to default position
    const handleReset = useCallback(() => {
        const initial = getInitialCorners()
        if (initial) {
            handleCornerChange(initial, true)
        }
    }, [getInitialCorners, handleCornerChange])

    // Clear WIP image
    const handleClearWip = useCallback(() => {
        setWipImage(null)
        handleReset()
    }, [handleReset])

    // File upload handlers
    const handleFileSelect = useCallback((file: File) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
                setWipImage(img)
            }
            img.src = e.target?.result as string
        }
        reader.readAsDataURL(file)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file && file.type.startsWith('image/')) {
            handleFileSelect(file)
        }
    }, [handleFileSelect])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
    }, [])

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleFileSelect(file)
        }
    }, [handleFileSelect])

    const canUndo = historyIndex > 0
    const canRedo = historyIndex < history.length - 1

    return (
        <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
            {/* Header */}
            <header className="flex flex-wrap items-center justify-between gap-4 px-4 md:px-6 py-4 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        <span className="text-sm font-medium hidden sm:inline">Back to Canvas</span>
                    </button>
                    <div className="w-px h-6 bg-gray-700 hidden sm:block" />
                    <h1 className="text-lg font-bold text-white">Check My Drawing</h1>
                </div>

                <div className="flex flex-wrap items-center gap-3 md:gap-5">
                    {/* Undo/Redo Buttons */}
                    {wipImage && (
                        <>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleUndo}
                                    disabled={!canUndo}
                                    className={`p-2 rounded-lg transition-colors ${canUndo
                                            ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                                            : 'text-gray-600 cursor-not-allowed'
                                        }`}
                                    title="Undo (⌘Z)"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 7v6h6" />
                                        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                                    </svg>
                                </button>
                                <button
                                    onClick={handleRedo}
                                    disabled={!canRedo}
                                    className={`p-2 rounded-lg transition-colors ${canRedo
                                            ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                                            : 'text-gray-600 cursor-not-allowed'
                                        }`}
                                    title="Redo (⌘⇧Z)"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 7v6h-6" />
                                        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
                                    </svg>
                                </button>
                            </div>
                            <div className="w-px h-6 bg-gray-700" />
                        </>
                    )}

                    {/* Opacity Slider */}
                    <OpacitySlider
                        value={opacity}
                        onChange={setOpacity}
                        label="WIP Opacity"
                    />

                    {/* Grayscale Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={isGrayscale}
                                onChange={(e) => setIsGrayscale(e.target.checked)}
                                className="sr-only"
                            />
                            <div className={`w-10 h-5 rounded-full transition-colors ${isGrayscale ? 'bg-blue-600' : 'bg-gray-600'
                                }`}>
                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isGrayscale ? 'translate-x-5' : ''
                                    }`} />
                            </div>
                        </div>
                        <span className="text-xs text-gray-300 font-medium">Grayscale</span>
                    </label>

                    {/* Reset Button */}
                    {wipImage && (
                        <>
                            <div className="w-px h-6 bg-gray-700" />
                            <button
                                onClick={handleReset}
                                className="px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                                title="Reset transform (R)"
                            >
                                Reset
                            </button>
                        </>
                    )}

                    {/* Clear WIP Button */}
                    {wipImage && (
                        <button
                            onClick={handleClearWip}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                            Clear WIP
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 relative min-h-0" ref={containerRef}>
                {!referenceImage ? (
                    /* No reference image state */
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center p-8">
                            <svg className="w-20 h-20 mx-auto text-gray-600 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                            <h2 className="text-xl font-semibold text-gray-400 mb-2">No Reference Image</h2>
                            <p className="text-gray-500 mb-6">
                                Upload an image in the main canvas first, then return here to check your drawing.
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
                    <>
                        {/* Canvas with both layers */}
                        <CheckMyDrawingCanvas
                            referenceImage={referenceImage}
                            wipImage={wipImage}
                            opacity={opacity}
                            isGrayscale={isGrayscale}
                            cornerPositions={cornerPositions}
                            containerSize={containerSize}
                        />

                        {/* Perspective Handles (only when WIP is present) */}
                        <PerspectiveHandles
                            corners={cornerPositions}
                            onChange={handleCornerChange}
                            containerRef={containerRef}
                            visible={!!wipImage}
                        />

                        {/* WIP Upload Dropzone (when no WIP) */}
                        {!wipImage && (
                            <div
                                className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm"
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                            >
                                <div
                                    className="flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-600 rounded-2xl p-12 m-8 cursor-pointer hover:border-gray-400 hover:bg-gray-800/50 transition-all"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    <span className="mt-4 text-lg font-medium">Upload WIP Photo</span>
                                    <span className="mt-2 text-sm text-gray-500">
                                        Drag and drop or click to browse
                                    </span>
                                    <span className="mt-4 text-xs text-gray-600">
                                        Photo will overlay on reference for comparison
                                    </span>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer Instructions */}
            {wipImage && (
                <div className="flex items-center justify-center gap-6 py-3 px-4 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 flex-wrap">
                    <span>Drag corners for perspective • Center to move • Green handle to scale</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">
                        <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">⌘Z</kbd> Undo
                    </span>
                    <span className="hidden sm:inline">
                        <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">R</kbd> Reset
                    </span>
                    <span className="hidden sm:inline">
                        <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">G</kbd> Grayscale
                    </span>
                    <span className="hidden sm:inline">
                        <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">Esc</kbd> Close
                    </span>
                </div>
            )}
        </div>
    )
}
