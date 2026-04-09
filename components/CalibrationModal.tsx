'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import Modal from '@/components/ui/Modal'
import {
  CalibrationData,
  CREDIT_CARD_WIDTH_INCHES,
  RULER_REFERENCES,
  createCalibration,
} from '@/lib/calibration'

interface CalibrationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CalibrationData) => void
  initialCalibration?: CalibrationData | null
}

type CalibrationMethod = 'credit_card' | 'ruler'

const CONTROL_TRANSITION_STYLE = {
  transitionDuration: 'var(--duration-fast)',
  transitionTimingFunction: 'var(--ease-out)',
} as const

const SEGMENT_BASE_CLASS =
  'flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-[background-color,border-color,color,box-shadow]'

const STEP_BUTTON_CLASS =
  'inline-flex h-10 min-w-[3.5rem] items-center justify-center rounded-xl border bg-[var(--paper-elevated)] px-3 font-mono text-sm font-semibold text-ink transition-[background-color,border-color,color,box-shadow] hover:bg-[var(--paper-shell)] hover:shadow-[var(--shadow-sm)]'

const FOOTER_BUTTON_BASE_CLASS =
  'inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] hover:translate-y-[-1px] active:translate-y-0'

const GHOST_BUTTON_CLASS =
  `${FOOTER_BUTTON_BASE_CLASS} hover:bg-[var(--paper-shell)] hover:shadow-[var(--shadow-sm)]`

const ACTION_BUTTON_CLASS =
  `${FOOTER_BUTTON_BASE_CLASS} hover:bg-[var(--signal-hover)] hover:shadow-[var(--shadow-md)]`

function getSegmentClass(active: boolean) {
  return [
    SEGMENT_BASE_CLASS,
    active
      ? 'border border-transparent bg-[var(--subsignal-muted)] text-[var(--subsignal)] shadow-[var(--shadow-sm)]'
      : 'border border-transparent bg-transparent text-ink-secondary hover:bg-[var(--paper-shell)] hover:text-ink',
  ].join(' ')
}

function getReferenceClass(active: boolean) {
  return [
    'rounded-xl border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow]',
    active
      ? 'border-[var(--subsignal)] bg-[var(--subsignal-muted)] text-[var(--subsignal)] shadow-[var(--shadow-sm)]'
      : 'border-[var(--linen)] bg-[var(--paper-elevated)] text-ink-secondary hover:bg-[var(--paper-shell)] hover:text-ink',
  ].join(' ')
}

export default function CalibrationModal({
  isOpen,
  onClose,
  onSave,
  initialCalibration,
}: CalibrationModalProps) {
  const [method, setMethod] = useState<CalibrationMethod>('credit_card')
  const [cardWidthPx, setCardWidthPx] = useState(320)
  const [rulerLengthPx, setRulerLengthPx] = useState(192)
  const [rulerReference, setRulerReference] = useState(0)
  const titleId = useId()

  useEffect(() => {
    if (initialCalibration) {
      setMethod(initialCalibration.method)

      if (initialCalibration.method === 'credit_card') {
        setCardWidthPx(initialCalibration.pxPerInch * CREDIT_CARD_WIDTH_INCHES)
      } else {
        const referenceIndex = RULER_REFERENCES.findIndex(
          (reference) => Math.abs(reference.inches - initialCalibration.referenceInches) < 0.01,
        )

        if (referenceIndex >= 0) {
          setRulerReference(referenceIndex)
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

    onSave(createCalibration(pxPerInch, method, referenceInches))
    onClose()
  }, [cardWidthPx, method, onClose, onSave, rulerLengthPx, rulerReference])

  const adjustValue = (delta: number, isCard: boolean) => {
    if (isCard) {
      setCardWidthPx((current) => Math.max(50, Math.min(800, current + delta)))
      return
    }

    setRulerLengthPx((current) => Math.max(50, Math.min(600, current + delta)))
  }

  const previewPxPerInch =
    method === 'credit_card'
      ? cardWidthPx / CREDIT_CARD_WIDTH_INCHES
      : rulerLengthPx / RULER_REFERENCES[rulerReference].inches

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      ariaLabelledBy={titleId}
    >
      <Modal.Header>
        <div>
          <p className="text-section">Screen Setup</p>
          <h2 id={titleId} className="mt-1 font-display text-2xl tracking-tight text-ink">
            Screen Calibration
          </h2>
        </div>
        <Modal.Close />
      </Modal.Header>

      <Modal.Body className="space-y-5">
        <section>
          <div className="paper-well flex gap-1 p-1">
            <button
              type="button"
              onClick={() => setMethod('credit_card')}
              className={getSegmentClass(method === 'credit_card')}
              style={CONTROL_TRANSITION_STYLE}
              aria-pressed={method === 'credit_card'}
            >
              Credit Card
            </button>
            <button
              type="button"
              onClick={() => setMethod('ruler')}
              className={getSegmentClass(method === 'ruler')}
              style={CONTROL_TRANSITION_STYLE}
              aria-pressed={method === 'ruler'}
            >
              Ruler
            </button>
          </div>
        </section>

        <section className="paper-panel-raised p-4">
          <p className="text-section">Instructions</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
            {method === 'credit_card'
              ? 'Hold a credit card against the screen and adjust the paper card until it matches the real edge exactly.'
              : 'Hold a ruler against the screen and adjust the line until it matches the selected physical length.'}
          </p>
        </section>

        <section className="paper-panel-raised flex flex-col gap-4 p-6">
          <div className="w-full overflow-x-auto">
            <div className="flex min-w-max justify-center">
              {method === 'credit_card' ? (
                <div className="flex flex-col items-center">
                  <div
                    className="flex items-center justify-center border-2 px-4 text-center"
                    style={{
                      width: `${cardWidthPx}px`,
                      height: `${cardWidthPx * 0.63}px`,
                      backgroundColor: 'var(--subsignal-muted)',
                      borderColor: 'var(--subsignal)',
                      borderRadius: 'var(--radius-xl)',
                    }}
                  >
                    <span className="font-mono text-sm font-medium text-[var(--subsignal)]">
                      {cardWidthPx}px × {Math.round(cardWidthPx * 0.63)}px
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-ink-secondary">
                    Standard card width: <span className="font-mono text-ink">3.370&quot;</span> (85.6mm)
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="relative px-1 py-2">
                    <div
                      className="h-1 rounded-full"
                      style={{
                        width: `${rulerLengthPx}px`,
                        backgroundColor: 'var(--subsignal)',
                      }}
                    />
                    <div
                      className="absolute left-0 top-0 h-5 w-px"
                      style={{ backgroundColor: 'var(--subsignal)' }}
                    />
                    <div
                      className="absolute right-0 top-0 h-5 w-px"
                      style={{ backgroundColor: 'var(--subsignal)' }}
                    />
                  </div>
                  <p className="mt-3 font-mono text-sm font-medium text-[var(--subsignal)]">
                    {rulerLengthPx}px
                  </p>
                </div>
              )}
            </div>
          </div>

          {method === 'ruler' && (
            <div className="flex flex-wrap justify-center gap-2">
              {RULER_REFERENCES.map((reference, index) => (
                <button
                  key={reference.label}
                  type="button"
                  onClick={() => setRulerReference(index)}
                  className={getReferenceClass(rulerReference === index)}
                  style={CONTROL_TRANSITION_STYLE}
                  aria-pressed={rulerReference === index}
                >
                  {reference.label}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="paper-panel-raised p-4">
          <p className="text-section">Adjustment</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => adjustValue(-10, method === 'credit_card')}
              className={STEP_BUTTON_CLASS}
              style={{
                ...CONTROL_TRANSITION_STYLE,
                borderColor: 'var(--linen)',
              }}
            >
              −10
            </button>
            <button
              type="button"
              onClick={() => adjustValue(-1, method === 'credit_card')}
              className={STEP_BUTTON_CLASS}
              style={{
                ...CONTROL_TRANSITION_STYLE,
                borderColor: 'var(--linen)',
              }}
            >
              −1
            </button>

            <input
              type="range"
              min={50}
              max={method === 'credit_card' ? 800 : 600}
              value={method === 'credit_card' ? cardWidthPx : rulerLengthPx}
              onChange={(event) => {
                const value = Number(event.target.value)
                if (method === 'credit_card') {
                  setCardWidthPx(value)
                } else {
                  setRulerLengthPx(value)
                }
              }}
              className="h-2 min-w-[16rem] flex-1 cursor-pointer appearance-none rounded-full bg-[var(--paper-shell)]"
              style={{ accentColor: 'var(--subsignal)' }}
            />

            <button
              type="button"
              onClick={() => adjustValue(1, method === 'credit_card')}
              className={STEP_BUTTON_CLASS}
              style={{
                ...CONTROL_TRANSITION_STYLE,
                borderColor: 'var(--linen)',
              }}
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => adjustValue(10, method === 'credit_card')}
              className={STEP_BUTTON_CLASS}
              style={{
                ...CONTROL_TRANSITION_STYLE,
                borderColor: 'var(--linen)',
              }}
            >
              +10
            </button>
          </div>
        </section>

        <section className="paper-well p-4 text-center">
          <p className="text-section">Calculated Scale</p>
          <p className="mt-2 text-sm text-ink-secondary">
            <span className="font-mono text-base font-semibold text-ink">
              {previewPxPerInch.toFixed(1)}
            </span>{' '}
            pixels per inch
          </p>
        </section>
      </Modal.Body>

      <Modal.Footer>
        <button
          type="button"
          onClick={onClose}
          className={GHOST_BUTTON_CLASS}
          style={{
            ...CONTROL_TRANSITION_STYLE,
            backgroundColor: 'var(--paper-elevated)',
            borderColor: 'var(--linen)',
            color: 'var(--ink)',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className={ACTION_BUTTON_CLASS}
          style={{
            ...CONTROL_TRANSITION_STYLE,
            backgroundColor: 'var(--signal)',
            borderColor: 'var(--signal)',
            color: 'var(--paper-elevated)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          Confirm Calibration
        </button>
      </Modal.Footer>
    </Modal>
  )
}
