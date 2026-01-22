'use client'

/**
 * CheckMyDrawingView - Revised full-screen view for comparing WIP drawing to reference.
 * Features an infinite canvas with pan/zoom and intuitive transform controls.
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import InfiniteCanvas, { SelectedImage, CanvasImageData } from '@/components/drawing/InfiniteCanvas'
import DrawingControlPanel from '@/components/drawing/DrawingControlPanel'
import { useImageTransform } from '@/hooks/useImageTransform'
import { useIsMobile } from '@/hooks/useMediaQuery'

interface CheckMyDrawingViewProps {
    /** The reference image from the main canvas */
    referenceImage: HTMLImageElement | null
    /** Callback to close the view */
    onClose: () => void
}

export default function CheckMyDrawingView({ referenceImage, onClose }: CheckMyDrawingViewProps) {
    const isMobile = useIsMobile()

    // WIP image state
    const [wipImage, setWipImage] = useState<HTMLImageElement | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Selection state
    const [selectedImage, setSelectedImage] = useState<SelectedImage>(null)

    // Grayscale state
    const [isGrayscale, setIsGrayscale] = useState(false)

    // Transform hooks
    const refTransform = useImageTransform({
        isReference: true,
        imageDimensions: referenceImage ? { width: referenceImage.width, height: referenceImage.height } : undefined
    })

    const wipTransform = useImageTransform({
        isReference: false,
        imageDimensions: wipImage ? { width: wipImage.width, height: wipImage.height } : undefined
    })

    // Initialize positions
    useEffect(() => {
        if (referenceImage && refTransform.transform.position.x === 0 && refTransform.transform.position.y === 0) {
            // Initial center position for reference
            refTransform.setPosition({ x: 100, y: 100 })
        }
    }, [referenceImage, refTransform])

    // WIP File Upload
    const handleFileSelect = useCallback((file: File) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
                setWipImage(img)
                // Position WIP slightly offset from reference or matching size
                if (referenceImage) {
                    wipTransform.setPosition({
                        x: refTransform.transform.position.x + 50,
                        y: refTransform.transform.position.y + 50
                    })
                    // Auto-match size on upload
                    const scaleX = referenceImage.width / img.width
                    const scaleY = referenceImage.height / img.height
                    wipTransform.setScale(Math.min(scaleX, scaleY))
                }
                setSelectedImage('wip')
            }
            img.src = e.target?.result as string
        }
        reader.readAsDataURL(file)
    }, [referenceImage, refTransform.transform.position, wipTransform])

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

    // Quick Actions
    const handleMatchSize = useCallback(() => {
        if (referenceImage && wipImage) {
            const scaleX = referenceImage.width / wipImage.width
            const scaleY = referenceImage.height / wipImage.height
            wipTransform.setScale(Math.min(scaleX, scaleY))
            wipTransform.setPosition({ ...refTransform.transform.position })
            wipTransform.setRotation(0)
        }
    }, [referenceImage, wipImage, refTransform.transform.position, wipTransform])

    const handleCenterBoth = useCallback(() => {
        // Since it's an infinite canvas, we just pick a "center"
        const center = { x: 200, y: 200 }
        refTransform.setPosition(center)
        if (wipImage) {
            wipTransform.setPosition(center)
        }
    }, [refTransform, wipTransform, wipImage])

    const handleSideBySide = useCallback(() => {
        if (referenceImage && wipImage) {
            const refT = refTransform.transform
            wipTransform.setPosition({
                x: refT.position.x + (referenceImage.width * refT.scale) + 50,
                y: refT.position.y
            })
            wipTransform.setRotation(0)
        }
    }, [referenceImage, wipImage, refTransform, wipTransform])

    // State assembly for Canvas
    const referenceImageData: CanvasImageData | null = useMemo(() => {
        if (!referenceImage) return null
        return {
            image: referenceImage,
            transform: {
                ...refTransform.transform,
                opacity: 1,
                perspectiveEnabled: false,
                perspectiveCorners: null
            }
        }
    }, [referenceImage, refTransform.transform])

    const wipImageData: CanvasImageData | null = useMemo(() => {
        if (!wipImage) return null
        return {
            image: wipImage,
            transform: wipTransform.transform
        }
    }, [wipImage, wipTransform.transform])

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
            if (e.key.toLowerCase() === 'g') setIsGrayscale(prev => !prev)
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    return (
        <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col md:flex-row overflow-hidden font-sans">
            {/* Main View Area */}
            <div className="flex-1 relative flex flex-col min-w-0">
                {/* Header */}
                <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg transition-all pointer-events-auto shadow-lg backdrop-blur-sm"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        <span className="text-sm font-bold">Close</span>
                    </button>

                    <h1 className="text-lg font-black text-white/90 uppercase tracking-tighter drop-shadow-md hidden sm:block">
                        Check My Drawing
                    </h1>

                    <div className="w-10 h-10" /> {/* Spacer */}
                </header>

                {/* Canvas Workspace */}
                <InfiniteCanvas
                    referenceImage={referenceImageData}
                    wipImage={wipImageData}
                    selectedImage={selectedImage}
                    onSelectImage={setSelectedImage}
                    onReferenceTransformChange={(t) => {
                        if (t.position) refTransform.setPosition(t.position)
                    }}
                    onWipTransformChange={(t) => {
                        if (t.position) wipTransform.setPosition(t.position)
                        if (t.rotation !== undefined) wipTransform.setRotation(t.rotation)
                        if (t.perspectiveCorners) {
                            // Manual update for individual corners if needed, 
                            // but InfiniteCanvas handles the object spread.
                            // We'll just proxy the whole corner set if it comes.
                            Object.entries(t.perspectiveCorners).forEach(([key, val]) => {
                                wipTransform.setPerspectiveCorner(key as any, val)
                            })
                        }
                    }}
                    isGrayscale={isGrayscale}
                >
                    {/* Instructions Overlay */}
                    {wipImage && (
                        <div className="absolute top-20 left-1/2 -translate-x-1/2 text-[10px] text-white/40 uppercase tracking-widest pointer-events-none text-center">
                            Hold Space to pan • Scroll to zoom • Select image to move
                        </div>
                    )}
                </InfiniteCanvas>

                {/* Upload Trigger (when no WIP) */}
                {!wipImage && referenceImage && (
                    <div
                        className="absolute inset-0 flex items-center justify-center p-8 z-20 pointer-events-none"
                    >
                        <div
                            className="bg-gray-800/90 backdrop-blur-xl border-2 border-dashed border-gray-600 rounded-3xl p-12 max-w-sm w-full text-center shadow-2xl pointer-events-auto cursor-pointer hover:border-blue-500 hover:bg-gray-800 transition-all group"
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Check Your WIP</h2>
                            <p className="text-gray-400 text-sm mb-6">
                                Upload a photo of your drawing to overlay it on the reference and check accuracy.
                            </p>
                            <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-600/20">
                                Select Photo
                            </button>
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
            </div>

            {/* Sidebar Controls */}
            {referenceImage && (
                <DrawingControlPanel
                    selectedImage={selectedImage}
                    onSelectImage={setSelectedImage}
                    hasReferenceImage={true}
                    referenceScale={refTransform.transform.scale}
                    onReferenceScaleChange={refTransform.setScale}
                    onResetReference={refTransform.reset}
                    hasWipImage={!!wipImage}
                    wipOpacity={wipTransform.transform.opacity}
                    onWipOpacityChange={wipTransform.setOpacity}
                    wipScale={wipTransform.transform.scale}
                    onWipScaleChange={wipTransform.setScale}
                    wipRotation={wipTransform.transform.rotation}
                    perspectiveEnabled={wipTransform.transform.perspectiveEnabled}
                    onTogglePerspective={wipTransform.togglePerspective}
                    onResetWip={wipTransform.reset}
                    onMatchSize={handleMatchSize}
                    onCenterBoth={handleCenterBoth}
                    onSideBySide={handleSideBySide}
                    onFitToView={handleCenterBoth} // Reuse center for now
                    canvasZoom={1.0} // This should be synced from InfiniteCanvas ideally
                    onResetView={() => { }} // Hooked into InfiniteCanvas
                    isGrayscale={isGrayscale}
                    onToggleGrayscale={() => setIsGrayscale(prev => !prev)}
                    isCompact={isMobile}
                />
            )}
        </div>
    )
}
