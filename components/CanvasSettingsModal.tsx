'use client'

import { useState, useCallback, useEffect, useId } from 'react'
import { CanvasSettings } from '@/lib/types/canvas'
import OverlaySurface from '@/components/ui/Overlay'

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
    const titleId = useId()

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

    return (
        <OverlaySurface
            isOpen={isOpen}
            onClose={onClose}
            preset="dialog"
            ariaLabelledBy={titleId}
            rootClassName="fixed inset-0 z-[60] flex items-center justify-center p-4"
            backdropClassName="absolute inset-0 bg-black/70 backdrop-blur-sm"
            panelClassName="w-full max-w-md overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-2xl outline-none"
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
                <h2 id={titleId} className="text-xl font-semibold text-white">Canvas Settings</h2>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-2xl leading-none text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                    aria-label="Close modal"
                >
                    ×
                </button>
            </div>

            {/* Content */}
            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <label className="text-sm font-medium text-gray-200">Enable Real-World Canvas</label>
                        <p className="text-xs text-gray-500">Scale measurements to physical canvas size</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.enabled ? 'bg-blue-600' : 'bg-gray-700'
                            }`}
                        aria-pressed={settings.enabled}
                        aria-label={settings.enabled ? 'Disable real-world canvas' : 'Enable real-world canvas'}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform motion-reduce:transition-none ${settings.enabled ? 'translate-x-6' : 'translate-x-1'
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
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none transition-colors"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Height</label>
                        <input
                            type="number"
                            step="0.1"
                            value={settings.height}
                            onChange={(e) => setSettings(s => ({ ...s, height: parseFloat(e.target.value) || 0 }))}
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none transition-colors"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Units</label>
                    <div className="flex rounded-lg border border-gray-700 bg-gray-800 p-1">
                        <button
                            type="button"
                            onClick={() => setSettings(s => ({ ...s, unit: 'in' }))}
                            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${settings.unit === 'in'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-400 hover:text-white'
                                }`}
                            aria-pressed={settings.unit === 'in'}
                        >
                            Inches
                        </button>
                        <button
                            type="button"
                            onClick={() => setSettings(s => ({ ...s, unit: 'cm' }))}
                            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${settings.unit === 'cm'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-400 hover:text-white'
                                }`}
                            aria-pressed={settings.unit === 'cm'}
                        >
                            Centimeters
                        </button>
                    </div>
                </div>

                <div className="rounded-lg border border-gray-700/50 bg-gray-800/50 p-4">
                    <p className="text-xs leading-relaxed text-gray-400">
                        {settings.enabled
                            ? `All measurements and the ruler grid will now relate to an ${settings.width}x${settings.height} ${settings.unit === 'in' ? 'inch' : 'cm'} canvas, regardless of image resolution.`
                            : "Measurements are currently relative to your screen calibration. Enable the toggle above to use real-world canvas scaling instead."}
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-700 px-6 py-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg bg-gray-700 px-4 py-2 text-white transition-colors hover:bg-gray-600"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleConfirm}
                    className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-500"
                >
                    Save Settings
                </button>
            </div>
        </OverlaySurface>
    )
}
