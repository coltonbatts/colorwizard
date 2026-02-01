'use client'

import { useRef } from 'react'
import { useStore } from '@/lib/store/useStore'

export default function SurfaceTab() {
    const surfaceImage = useStore(state => state.surfaceImage)
    const setSurfaceImage = useStore(state => state.setSurfaceImage)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (event) => {
                setSurfaceImage(event.target?.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleClear = () => {
        setSurfaceImage(null)
    }

    return (
        <div className="p-4 space-y-6">
            <div className="space-y-2">
                <h3 className="text-lg font-semibold text-ink-secondary">Stage 1: Surface</h3>
                <p className="text-sm text-ink-faint">
                    Capture or import a photo of your real-world surface (canvas, panel, wall).
                </p>
            </div>

            <div className="flex flex-col items-center justify-center border-2 border-dashed border-ink-hairline rounded-xl p-8 bg-paper-elevated hover:border-signal transition-colors">
                {surfaceImage ? (
                    <div className="space-y-4 w-full">
                        <div className="relative aspect-video rounded-lg overflow-hidden border border-ink-hairline shadow-sm bg-paper-recessed">
                            <img
                                src={surfaceImage}
                                alt="Surface"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div className="flex gap-2">
                            <label
                                className="flex-1 py-2 px-4 bg-paper-recessed hover:bg-paper-recessed text-ink-secondary rounded-lg text-sm font-medium transition-colors cursor-pointer text-center"
                            >
                                <span>Change Photo</span>
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="absolute w-1 h-1 opacity-0 pointer-events-none"
                                />
                            </label>
                            <button
                                onClick={handleClear}
                                className="py-2 px-4 bg-signal-muted hover:bg-signal-muted text-signal rounded-lg text-sm font-medium transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-subsignal-muted text-signal rounded-full flex items-center justify-center mx-auto">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-ink-secondary">No surface photo yet</p>
                            <p className="text-xs text-ink-faint">Upload a photo to define your bounds</p>
                        </div>
                        <label
                            className="py-2 px-6 bg-signal hover:bg-signal-hover text-white rounded-lg text-sm font-medium transition-shadow shadow-sm hover:shadow-md cursor-pointer inline-block"
                        >
                            <span>Import Surface</span>
                            <input
                                type="file"
                                onChange={handleFileChange}
                                accept="image/*"
                                className="absolute w-1 h-1 opacity-0 pointer-events-none"
                            />
                        </label>
                    </div>
                )}
            </div>

            {surfaceImage && (
                <div className="bg-subsignal-muted border border-subsignal rounded-lg p-4">
                    <p className="text-xs text-subsignal leading-relaxed italic">
                        <strong>Tip:</strong> Your surface photo is saved locally so you can resume your project later.
                    </p>
                </div>
            )}
        </div>
    )
}
