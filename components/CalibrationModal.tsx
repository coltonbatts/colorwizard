'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    CalibrationData,
    CREDIT_CARD_WIDTH_INCHES,
    RULER_REFERENCES,
    createCalibration,
    getZoomFingerprint
} from '@/lib/calibration'

interface CalibrationModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (data: CalibrationData) => void
    initialCalibration?: CalibrationData | null
}

type CalibrationMethod = 'credit_card' | 'ruler'

export default function CalibrationModal({
    isOpen,
    onClose,
    onSave,
    initialCalibration
}: CalibrationModalProps) {
    const [method, setMethod] = useState<CalibrationMethod>('credit_card')

    // Credit card method state
    const [cardWidthPx, setCardWidthPx] = useState(320)

    // Ruler method state
    const [rulerLengthPx, setRulerLengthPx] = useState(192)
    const [rulerReference, setRulerReference] = useState(0) // index into RULER_REFERENCES

    // Initialize from existing calibration
    useEffect(() => {
        if (initialCalibration) {
            setMethod(initialCalibration.method)
            if (initialCalibration.method === 'credit_card') {
                setCardWidthPx(initialCalibration.pxPerInch * CREDIT_CARD_WIDTH_INCHES)
            } else {
                const refIndex = RULER_REFERENCES.findIndex(
                    r => Math.abs(r.inches - initialCalibration.referenceInches) < 0.01
                )
                if (refIndex >= 0) {
                    setRulerReference(refIndex)
                    setRulerLengthPx(initialCalibration.pxPerInch * initialCalibration.referenceInches)
                }
            }
        }
    }, [initialCalibration])

    const handleConfirm = useCallback(() => {
        let pxPerInch: number
        let referenceInches: number

        if (method === 'credit_card') {
            referenceInches = CREDIT_CARD_WIDTH_INCHES
            pxPerInch = cardWidthPx / referenceInches
        } else {
            referenceInches = RULER_REFERENCES[rulerReference].inches
            pxPerInch = rulerLengthPx / referenceInches
        }

        const calibration = createCalibration(pxPerInch, method, referenceInches)
        onSave(calibration)
        onClose()
    }, [method, cardWidthPx, rulerLengthPx, rulerReference, onSave, onClose])

    const adjustValue = (delta: number, isCard: boolean) => {
        if (isCard) {
            setCardWidthPx(prev => Math.max(50, Math.min(800, prev + delta)))
        } else {
            setRulerLengthPx(prev => Math.max(50, Math.min(600, prev + delta)))
        }
    }

    // Calculate preview pxPerInch
    const previewPxPerInch = method === 'credit_card'
        ? cardWidthPx / CREDIT_CARD_WIDTH_INCHES
        : rulerLengthPx / RULER_REFERENCES[rulerReference].inches

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white">Screen Calibration</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Method Tabs */}
                    <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
                        <button
                            onClick={() => setMethod('credit_card')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${method === 'credit_card'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            💳 Credit Card
                        </button>
                        <button
                            onClick={() => setMethod('ruler')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${method === 'ruler'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            📏 Ruler
                        </button>
                    </div>

                    {/* Instructions */}
                    <p className="text-gray-400 text-sm mb-4">
                        {method === 'credit_card'
                            ? 'Hold a credit card against your screen and adjust the rectangle below until it matches the card width exactly.'
                            : 'Hold a ruler against your screen and adjust the line below until it matches the selected length.'}
                    </p>

                    {/* Calibration Visual */}
                    <div className="bg-gray-800 rounded-lg p-6 mb-4 flex flex-col items-center">
                        {method === 'credit_card' ? (
                            <>
                                {/* Credit Card Rectangle */}
                                <div
                                    className="border-2 border-blue-500 rounded-lg bg-blue-500/10 flex items-center justify-center transition-all"
                                    style={{
                                        width: `${cardWidthPx}px`,
                                        height: `${cardWidthPx * 0.63}px`, // Credit card aspect ratio
                                    }}
                                >
                                    <span className="text-blue-400 text-sm font-mono">
                                        {cardWidthPx}px × {Math.round(cardWidthPx * 0.63)}px
                                    </span>
                                </div>
                                <p className="text-gray-500 text-xs mt-3">
                                    Standard credit card width: 3.370&quot; (85.6mm)
                                </p>
                            </>
                        ) : (
                            <>
                                {/* Ruler Line */}
                                <div className="relative">
                                    <div
                                        className="h-1 bg-blue-500 rounded-full transition-all"
                                        style={{ width: `${rulerLengthPx}px` }}
                                    />
                                    {/* Tick marks */}
                                    <div className="absolute left-0 top-0 w-0.5 h-3 bg-blue-500 -translate-y-1" />
                                    <div className="absolute right-0 top-0 w-0.5 h-3 bg-blue-500 -translate-y-1" />
                                </div>
                                <p className="text-blue-400 text-sm font-mono mt-3">
                                    {rulerLengthPx}px
                                </p>

                                {/* Reference selector */}
                                <div className="flex gap-4 mt-4">
                                    {RULER_REFERENCES.map((ref, i) => (
                                        <button
                                            key={ref.label}
                                            onClick={() => setRulerReference(i)}
                                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${rulerReference === i
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                }`}
                                        >
                                            {ref.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Adjustment Controls */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <button
                            onClick={() => adjustValue(-10, method === 'credit_card')}
                            className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold transition-colors"
                        >
                            −10
                        </button>
                        <button
                            onClick={() => adjustValue(-1, method === 'credit_card')}
                            className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold transition-colors"
                        >
                            −1
                        </button>

                        <input
                            type="range"
                            min={50}
                            max={method === 'credit_card' ? 800 : 600}
                            value={method === 'credit_card' ? cardWidthPx : rulerLengthPx}
                            onChange={(e) => {
                                const val = Number(e.target.value)
                                if (method === 'credit_card') {
                                    setCardWidthPx(val)
                                } else {
                                    setRulerLengthPx(val)
                                }
                            }}
                            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />

                        <button
                            onClick={() => adjustValue(1, method === 'credit_card')}
                            className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold transition-colors"
                        >
                            +1
                        </button>
                        <button
                            onClick={() => adjustValue(10, method === 'credit_card')}
                            className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold transition-colors"
                        >
                            +10
                        </button>
                    </div>

                    {/* Preview Info */}
                    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <p className="text-gray-400 text-sm">
                            Calculated: <span className="text-white font-mono">{previewPxPerInch.toFixed(1)}</span> pixels per inch
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
                        Confirm Calibration
                    </button>
                </div>
            </div>
        </div>
    )
}
