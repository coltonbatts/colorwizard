'use client'

import { stepToGray } from '@/lib/valueScale'

interface ValueStepBarProps {
  steps: number
  selectedBandIndex: number
  onSelectBand: (bandIndex: number) => void
  className?: string
}

export default function ValueStepBar({
  steps,
  selectedBandIndex,
  onSelectBand,
  className = '',
}: ValueStepBarProps) {
  const safeSteps = Math.max(1, Math.floor(steps))
  const selectedDisplayIndex = Math.min(
    safeSteps - 1,
    Math.max(0, safeSteps - 1 - selectedBandIndex)
  )

  return (
    <div
      className={`pointer-events-auto rounded-[24px] border border-ink-hairline bg-[rgba(255,252,247,0.92)] p-2 shadow-[0_16px_34px_rgba(33,24,14,0.16)] backdrop-blur-md ${className}`}
      aria-label="Value steps"
      role="radiogroup"
    >
      <div className="relative">
        <div
          className="pointer-events-none absolute bottom-1 top-1 z-10 rounded-[16px] border border-[rgba(58,43,31,0.72)] shadow-[0_8px_18px_rgba(33,24,14,0.18)] transition-transform duration-200 ease-out"
          style={{
            width: `calc((100% - ${(safeSteps - 1) * 2}px) / ${safeSteps})`,
            transform: `translateX(calc(${selectedDisplayIndex} * (100% + 2px)))`,
          }}
        >
          <div className="absolute left-1/2 top-[-8px] h-3 w-3 -translate-x-1/2 rotate-45 rounded-[3px] border border-[rgba(58,43,31,0.78)] bg-paper shadow-[0_6px_12px_rgba(33,24,14,0.16)]" />
        </div>

        <div className="flex gap-[2px] overflow-hidden rounded-[18px] border border-[rgba(58,43,31,0.12)] bg-[rgba(58,43,31,0.08)] p-[2px]">
          {Array.from({ length: safeSteps }, (_, displayIndex) => {
            const bandIndex = safeSteps - 1 - displayIndex
            const gray = stepToGray(bandIndex, safeSteps)
            const backgroundColor = `rgb(${gray}, ${gray}, ${gray})`
            const isActive = displayIndex === selectedDisplayIndex

            return (
              <button
                key={bandIndex}
                type="button"
                role="radio"
                aria-checked={isActive}
                aria-label={`Select value band ${bandIndex + 1} of ${safeSteps}`}
                onClick={() => onSelectBand(bandIndex)}
                className="relative h-10 flex-1 transition-transform duration-150 hover:scale-[0.985] focus:outline-none focus-visible:ring-2 focus-visible:ring-signal/65"
                style={{ backgroundColor }}
              >
                <span className="sr-only">{`Value band ${bandIndex + 1}`}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
