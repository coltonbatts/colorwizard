'use client'

import { useState, useEffect, useCallback, useId } from 'react'
import {
    CalibrationData,
    CREDIT_CARD_WIDTH_INCHES,
    RULER_REFERENCES,
    createCalibration,
} from '@/lib/calibration'
import OverlaySurface from '@/components/ui/Overlay'

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
    const titleId = useId()

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

    return (
        <OverlaySurface
            isOpen={isOpen}
            onClose={onClose}
            preset="dialog"
            ariaLabelledBy={titleId}
            rootClassName="fixed inset-0 z-50 flex items-center justify-center p-4"
            backdropClassName="absolute inset-0 bg-black/70 backdrop-blur-sm"
            panelClassName="w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-2xl outline-none"
        >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-700 bg-gray-900 px-6 py-4">
                <h2 id={titleId} className="text-xl font-semibold text-white">Screen Calibration</h2>
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
            <div className="p-6">
                {/* Method Tabs */}
                <div className="mb-6 flex rounded-lg bg-gray-800 p-1">
                    <button
                        type="button"
                        onClick={() => setMethod('credit_card')}
                        className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${method === 'credit_card'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-white'
                            }`}
                        aria-pressed={method === 'credit_card'}
                    >
                        💳 Credit Card
                    </button>
                    <button
                        type="button"
                        onClick={() => setMethod('ruler')}
                        className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${method === 'ruler'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-white'
                            }`}
                        aria-pressed={method === 'ruler'}
                    >
                        📏 Ruler
                    </button>
                </div>

                {/* Instructions */}
                <p className="mb-4 text-sm text-gray-400">
                    {method === 'credit_card'
                        ? 'Hold a credit card against your screen and adjust the rectangle below until it matches the card width exactly.'
                        : 'Hold a ruler against your screen and adjust the line below until it matches the selected length.'}
                </p>

                {/* Calibration Visual */}
                <div className="mb-4 flex flex-col items-center rounded-lg bg-gray-800 p-6">
                    {method === 'credit_card' ? (
                        <>
                            {/* Credit Card Rectangle */}
                            <div
                                className="flex items-center justify-center rounded-lg border-2 border-blue-500 bg-blue-500/10 transition-[width,height] motion-reduce:transition-none"
                                style={{
                                    width: `${cardWidthPx}px`,
                                    height: `${cardWidthPx * 0.63}px`, // Credit card aspect ratio
                                }}
                            >
                                <span className="text-sm font-mono text-blue-400">
                                    {cardWidthPx}px × {Math.round(cardWidthPx * 0.63)}px
                                </span>
                            </div>
                            <p className="mt-3 text-xs text-gray-500">
                                Standard credit card width: 3.370&quot; (85.6mm)
                            </p>
                        </>
                    ) : (
                        <>
                            {/* Ruler Line */}
                            <div className="relative">
                                <div
                                    className="h-1 rounded-full bg-blue-500 transition-[width] motion-reduce:transition-none"
                                    style={{ width: `${rulerLengthPx}px` }}
                                />
                                {/* Tick marks */}
                                <div className="absolute left-0 top-0 h-3 w-0.5 -translate-y-1 bg-blue-500" />
                                <div className="absolute right-0 top-0 h-3 w-0.5 -translate-y-1 bg-blue-500" />
                            </div>
                            <p className="mt-3 text-sm font-mono text-blue-400">
                                {rulerLengthPx}px
                            </p>

                            {/* Reference selector */}
                            <div className="mt-4 flex gap-4">
                                {RULER_REFERENCES.map((ref, i) => (
                                    <button
                                        key={ref.label}
                                        type="button"
                                        onClick={() => setRulerReference(i)}
                                        className={`rounded-lg px-4 py-2 text-sm transition-colors ${rulerReference === i
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                        aria-pressed={rulerReference === i}
                                    >
                                        {ref.label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Adjustment Controls */}
                <div className="mb-4 flex items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => adjustValue(-10, method === 'credit_card')}
                        className="h-10 w-10 rounded-lg bg-gray-700 font-bold text-white transition-colors hover:bg-gray-600"
                    >
                        −10
                    </button>
                    <button
                        type="button"
                        onClick={() => adjustValue(-1, method === 'credit_card')}
                        className="h-10 w-10 rounded-lg bg-gray-700 font-bold text-white transition-colors hover:bg-gray-600"
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
                        className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-700 accent-blue-500"
                    />

                    <button
                        type="button"
                        onClick={() => adjustValue(1, method === 'credit_card')}
                        className="h-10 w-10 rounded-lg bg-gray-700 font-bold text-white transition-colors hover:bg-gray-600"
                    >
                        +1
                    </button>
                    <button
                        type="button"
                        onClick={() => adjustValue(10, method === 'credit_card')}
                        className="h-10 w-10 rounded-lg bg-gray-700 font-bold text-white transition-colors hover:bg-gray-600"
                    >
                        +10
                    </button>
                </div>

                {/* Preview Info */}
                <div className="rounded-lg bg-gray-800/50 p-3 text-center">
                    <p className="text-sm text-gray-400">
                        Calculated: <span className="font-mono text-white">{previewPxPerInch.toFixed(1)}</span> pixels per inch
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
                    Confirm Calibration
                </button>
            </div>
        </OverlaySurface>
    )
}
