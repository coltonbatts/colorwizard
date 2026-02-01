import { useRef } from 'react'
import { useStore } from '@/lib/store/useStore'

export default function ReferenceTab() {
    const referenceImage = useStore(state => state.referenceImage)
    const setReferenceImage = useStore(state => state.setReferenceImage)
    const referenceOpacity = useStore(state => state.referenceOpacity)
    const setReferenceOpacity = useStore(state => state.setReferenceOpacity)
    const referenceLocked = useStore(state => state.referenceLocked)
    const setReferenceLocked = useStore(state => state.setReferenceLocked)
    const referenceTransform = useStore(state => state.referenceTransform)
    const setReferenceTransform = useStore(state => state.setReferenceTransform)
    const resetReferenceTransform = useStore(state => state.resetReferenceTransform)

    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            console.log('[ReferenceTab] File selected:', file.name)
            const reader = new FileReader()
            reader.onload = (event) => {
                setReferenceImage(event.target?.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const updateTransform = (key: keyof typeof referenceTransform, value: number) => {
        setReferenceTransform({
            ...referenceTransform,
            [key]: value
        })
    }

    return (
        <div className="p-4 space-y-6">
            <div className="space-y-4">
                <h3 className="text-xs font-black text-studio-dim uppercase tracking-widest">Reference Image</h3>

                {referenceImage ? (
                    <div className="space-y-4">
                        <div className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                            <img src={referenceImage} alt="Reference" className="w-full h-full object-contain" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <label
                                    className="p-2 bg-white rounded-lg text-studio hover:bg-gray-100 transition-colors cursor-pointer"
                                    title="Change Image"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                        <circle cx="12" cy="13" r="4" />
                                    </svg>
                                    <input
                                        type="file"
                                        className="absolute w-1 h-1 opacity-0 pointer-events-none"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </label>
                                <button
                                    onClick={() => {
                                        console.log('[ReferenceTab] Clearing reference image')
                                        setReferenceImage(null)
                                    }}
                                    className="p-2 bg-white rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                    title="Clear Reference"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            {/* Opacity */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-studio uppercase tracking-wider">Opacity</label>
                                    <span className="text-[10px] font-mono text-studio-dim">{Math.round(referenceOpacity * 100)}%</span>
                                </div>
                                <input
                                    type="range" min="0" max="1" step="0.01"
                                    value={referenceOpacity}
                                    onChange={(e) => setReferenceOpacity(parseFloat(e.target.value))}
                                    className="w-full"
                                />
                            </div>

                            {/* Lock Toggle */}
                            <button
                                onClick={() => setReferenceLocked(!referenceLocked)}
                                className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${referenceLocked
                                        ? 'bg-blue-600 text-white shadow-lg border border-blue-600'
                                        : 'bg-white text-studio hover:bg-gray-50 border border-gray-200 shadow-sm'
                                    }`}
                            >
                                {referenceLocked ? (
                                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> Locked</>
                                ) : (
                                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg> Unlocked</>
                                )}
                            </button>
                        </div>

                        {/* Transform Controls */}
                        <div className="space-y-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-2">
                                <h4 className="text-[10px] font-black text-studio uppercase tracking-widest">Transform</h4>
                                <button
                                    onClick={resetReferenceTransform}
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase"
                                >
                                    Reset
                                </button>
                            </div>

                            {/* Scale */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-studio-dim uppercase tracking-wider">Scale</label>
                                    <span className="text-[10px] font-mono text-studio-dim">{referenceTransform.scale.toFixed(2)}x</span>
                                </div>
                                <input
                                    type="range" min="0.1" max="5" step="0.01"
                                    disabled={referenceLocked}
                                    value={referenceTransform.scale}
                                    onChange={(e) => updateTransform('scale', parseFloat(e.target.value))}
                                    className="w-full disabled:opacity-50"
                                />
                            </div>

                            {/* Rotation */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-studio-dim uppercase tracking-wider">Rotation</label>
                                    <span className="text-[10px] font-mono text-studio-dim">{Math.round(referenceTransform.rotation)}°</span>
                                </div>
                                <input
                                    type="range" min="-180" max="180" step="1"
                                    disabled={referenceLocked}
                                    value={referenceTransform.rotation}
                                    onChange={(e) => updateTransform('rotation', parseFloat(e.target.value))}
                                    className="w-full disabled:opacity-50"
                                />
                            </div>

                            {/* Position X */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-studio-dim uppercase tracking-wider">X Offset</label>
                                    <span className="text-[10px] font-mono text-studio-dim">{Math.round(referenceTransform.x)}px</span>
                                </div>
                                <input
                                    type="range" min="-1000" max="1000" step="1"
                                    disabled={referenceLocked}
                                    value={referenceTransform.x}
                                    onChange={(e) => updateTransform('x', parseFloat(e.target.value))}
                                    className="w-full disabled:opacity-50"
                                />
                            </div>

                            {/* Position Y */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-studio-dim uppercase tracking-wider">Y Offset</label>
                                    <span className="text-[10px] font-mono text-studio-dim">{Math.round(referenceTransform.y)}px</span>
                                </div>
                                <input
                                    type="range" min="-1000" max="1000" step="1"
                                    disabled={referenceLocked}
                                    value={referenceTransform.y}
                                    onChange={(e) => updateTransform('y', parseFloat(e.target.value))}
                                    className="w-full disabled:opacity-50"
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <label
                        className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer flex flex-col items-center justify-center p-6 text-center group"
                    >
                        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-blue-500">
                                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                            </svg>
                        </div>
                        <p className="text-xs font-bold text-studio mb-1">Upload Reference Image</p>
                        <p className="text-[10px] text-studio-dim">Drag and drop or click to browse</p>
                        <input
                            type="file"
                            className="absolute w-1 h-1 opacity-0 pointer-events-none"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </label>
                )}

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-[10px] text-blue-700 leading-relaxed">
                        <strong>Tip:</strong> Use the reference image as an overlay to check your drawing accuracy or value distribution. Lock it to prevent accidental moves.
                    </p>
                </div>
            </div>
        </div>
    )
}