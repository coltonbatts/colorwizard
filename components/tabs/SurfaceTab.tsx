'use client'

import { useCanvasStore } from '@/lib/store/useCanvasStore'
import { resolveTauriImageSrc } from '@/lib/tauri'

export default function SurfaceTab() {
    const surfaceImage = useCanvasStore(state => state.surfaceImage)
    const setSurfaceImage = useCanvasStore(state => state.setSurfaceImage)
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
        <div className="p-3 space-y-4">
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-hairline bg-paper-elevated p-6 transition-colors hover:border-signal">
                {surfaceImage ? (
                    <div className="space-y-4 w-full">
                        <div className="relative aspect-video rounded-lg overflow-hidden border border-ink-hairline shadow-sm bg-paper-recessed">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={resolveTauriImageSrc(surfaceImage) ?? surfaceImage}
                                alt="Surface"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div className="flex gap-2">
                            <label
                                className="flex-1 rounded-lg bg-paper-recessed px-4 py-2 text-center text-sm font-medium text-ink-secondary transition-colors hover:bg-paper-recessed cursor-pointer"
                            >
                                <span>Change</span>
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
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-subsignal-muted text-signal">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-faint">Surface</p>
                        <label
                            className="inline-block rounded-lg bg-signal px-5 py-2 text-sm font-medium text-white transition-shadow shadow-sm hover:bg-signal-hover hover:shadow-md cursor-pointer"
                        >
                            <span>Load image</span>
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
        </div>
    )
}
