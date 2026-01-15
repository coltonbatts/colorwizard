'use client'

import { useState, useCallback, useEffect } from 'react'
import { CanvasSettings } from '@/lib/types/canvas'

interface CanvasSettingsModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (settings: CanvasSettings) => void
    initialSettings: CanvasSettings
}

export default function CanvasSettingsModal({
    isOpen,
    onClose,
    onSave,
    initialSettings
}: CanvasSettingsModalProps) {
    const [settings, setSettings] = useState<CanvasSettings>(initialSettings)

    // Sync with initial settings when modal opens
    useEffect(() => {
        if (isOpen) {
            setSettings(initialSettings)
        }
    }, [isOpen, initialSettings])

    const handleConfirm = useCallback(() => {
        onSave(settings)
        onClose()
    }, [settings, onSave, onClose])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white">Canvas Settings</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-gray-200">Enable Real-World Canvas</label>
                            <p className="text-xs text-gray-500">Scale measurements to physical canvas size</p>
                        </div>
                        <button
                            onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.enabled ? 'bg-blue-600' : 'bg-gray-700'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.enabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Width</label>
                            <input
                                type="number"
                                step="0.1"
                                value={settings.width}
                                onChange={(e) => setSettings(s => ({ ...s, width: parseFloat(e.target.value) || 0 }))}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Height</label>
                            <input
                                type="number"
                                step="0.1"
                                value={settings.height}
                                onChange={(e) => setSettings(s => ({ ...s, height: parseFloat(e.target.value) || 0 }))}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Units</label>
                        <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
                            <button
                                onClick={() => setSettings(s => ({ ...s, unit: 'in' }))}
                                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${settings.unit === 'in'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Inches
                            </button>
                            <button
                                onClick={() => setSettings(s => ({ ...s, unit: 'cm' }))}
                                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${settings.unit === 'cm'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Centimeters
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                        <p className="text-xs text-gray-400 leading-relaxed">
                            {settings.enabled
                                ? `All measurements and the ruler grid will now relate to an ${settings.width}x${settings.height} ${settings.unit === 'in' ? 'inch' : 'cm'} canvas, regardless of image resolution.`
                                : "Measurements are currently relative to your screen calibration. Enable the toggle above to use real-world canvas scaling instead."}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors"
                    >
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    )
}
