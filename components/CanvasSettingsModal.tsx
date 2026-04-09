'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import Modal from '@/components/ui/Modal'
import { CanvasSettings } from '@/lib/types/canvas'

interface CanvasSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (settings: CanvasSettings) => void
  initialSettings: CanvasSettings
}

const CONTROL_TRANSITION_STYLE = {
  transitionDuration: 'var(--duration-fast)',
  transitionTimingFunction: 'var(--ease-out)',
} as const

const SEGMENT_BASE_CLASS =
  'flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-[background-color,border-color,color,box-shadow]'

const INPUT_CLASS =
  'w-full rounded-xl border bg-[var(--paper-elevated)] px-4 py-3 text-sm text-ink transition-[background-color,border-color,box-shadow] focus:bg-[var(--paper)] focus:border-[var(--graphite-muted)] focus:outline-none'

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

export default function CanvasSettingsModal({
  isOpen,
  onClose,
  onSave,
  initialSettings,
}: CanvasSettingsModalProps) {
  const [settings, setSettings] = useState<CanvasSettings>(initialSettings)
  const titleId = useId()

  useEffect(() => {
    if (isOpen) {
      setSettings(initialSettings)
    }
  }, [initialSettings, isOpen])

  const handleConfirm = useCallback(() => {
    onSave(settings)
    onClose()
  }, [onClose, onSave, settings])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      ariaLabelledBy={titleId}
    >
      <Modal.Header>
        <div>
          <p className="text-section">Canvas Setup</p>
          <h2 id={titleId} className="mt-1 font-display text-2xl tracking-tight text-ink">
            Canvas Settings
          </h2>
        </div>
        <Modal.Close />
      </Modal.Header>

      <Modal.Body className="space-y-5">
        <section className="paper-panel-raised p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="pr-2">
              <p className="text-sm font-semibold text-ink">Enable Real-World Canvas</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
                Scale measurements and the ruler grid to the physical canvas instead of the display.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSettings((current) => ({ ...current, enabled: !current.enabled }))}
              aria-pressed={settings.enabled}
              aria-label={settings.enabled ? 'Disable real-world canvas' : 'Enable real-world canvas'}
              className="relative inline-flex h-8 w-14 shrink-0 rounded-full border transition-[background-color,border-color,box-shadow]"
              style={{
                ...CONTROL_TRANSITION_STYLE,
                backgroundColor: settings.enabled ? 'var(--subsignal-muted)' : 'var(--paper-shell)',
                borderColor: settings.enabled ? 'var(--subsignal)' : 'var(--linen)',
                boxShadow: settings.enabled ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <span
                className="absolute left-1 top-1 block h-6 w-6 rounded-full border transition-[background-color,border-color,transform]"
                style={{
                  ...CONTROL_TRANSITION_STYLE,
                  backgroundColor: settings.enabled ? 'var(--subsignal)' : 'var(--paper-elevated)',
                  borderColor: settings.enabled ? 'var(--subsignal)' : 'var(--linen)',
                  boxShadow: 'var(--shadow-sm)',
                  transform: settings.enabled ? 'translateX(24px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-section">Width</label>
            <input
              type="number"
              step="0.1"
              value={settings.width}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  width: Number.parseFloat(event.target.value) || 0,
                }))
              }
              className={INPUT_CLASS}
              style={{
                ...CONTROL_TRANSITION_STYLE,
                borderColor: 'var(--linen)',
              }}
            />
          </div>

          <div>
            <label className="mb-2 block text-section">Height</label>
            <input
              type="number"
              step="0.1"
              value={settings.height}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  height: Number.parseFloat(event.target.value) || 0,
                }))
              }
              className={INPUT_CLASS}
              style={{
                ...CONTROL_TRANSITION_STYLE,
                borderColor: 'var(--linen)',
              }}
            />
          </div>
        </section>

        <section>
          <label className="mb-2 block text-section">Units</label>
          <div className="paper-well flex gap-1 p-1">
            <button
              type="button"
              onClick={() => setSettings((current) => ({ ...current, unit: 'in' }))}
              className={getSegmentClass(settings.unit === 'in')}
              style={CONTROL_TRANSITION_STYLE}
              aria-pressed={settings.unit === 'in'}
            >
              Inches
            </button>
            <button
              type="button"
              onClick={() => setSettings((current) => ({ ...current, unit: 'cm' }))}
              className={getSegmentClass(settings.unit === 'cm')}
              style={CONTROL_TRANSITION_STYLE}
              aria-pressed={settings.unit === 'cm'}
            >
              Centimeters
            </button>
          </div>
        </section>

        <section className="paper-well p-4">
          <p className="text-section">Workbench Note</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
            {settings.enabled
              ? `Measurements will now map to a ${settings.width} × ${settings.height} ${
                  settings.unit === 'in' ? 'inch' : 'centimeter'
                } canvas regardless of image resolution.`
              : 'Measurements currently follow screen calibration. Enable real-world canvas to work against physical canvas dimensions.'}
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
          Save Settings
        </button>
      </Modal.Footer>
    </Modal>
  )
}
