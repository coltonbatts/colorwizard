'use client'

/**
 * Compact status and actions for the active paint palette.
 */

import { usePaintPaletteStore } from '@/lib/store/usePaintPaletteStore'

interface PaletteIndicatorProps {
    onSave: () => void
    onSwitchClick: () => void
}

function PaletteMark() {
    return (
        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 grid-cols-2 gap-0.5 rounded-md border border-linen bg-paper-elevated p-1">
            <span className="rounded-sm bg-[#d77b5c]" />
            <span className="rounded-sm bg-[#d6ad48]" />
            <span className="rounded-sm bg-[#5d9486]" />
            <span className="rounded-sm bg-[#697d9d]" />
        </span>
    )
}

export default function PaletteIndicator({ onSave, onSwitchClick }: PaletteIndicatorProps) {
    const {
        selectedPaintIds,
        getActivePalette,
        clearSelection,
        isDirty,
    } = usePaintPaletteStore()

    const activePalette = getActivePalette()
    const count = selectedPaintIds.length

    if (count === 0) {
        return (
            <section className="border-b border-ink-hairline bg-paper-recessed px-4 py-3" aria-label="Paint palette status">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <PaletteMark />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink">No paints selected</p>
                            <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">Choose paints below to build a working palette.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onSwitchClick}
                        className="min-h-9 shrink-0 rounded-md border border-linen-strong bg-paper-elevated px-3 text-[11px] font-semibold text-ink transition-colors hover:border-ink-muted hover:bg-paper"
                    >
                        Load palette
                    </button>
                </div>
            </section>
        )
    }

    return (
        <section className="border-b border-ink-hairline bg-paper-recessed px-4 py-3" aria-label="Paint palette status">
            <div className="flex items-center gap-3">
                <PaletteMark />
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="truncate text-sm font-semibold text-ink">
                            {activePalette ? activePalette.name : 'Unsaved palette'}
                        </p>
                        <span className="rounded-sm border border-linen bg-paper-elevated px-1.5 py-0.5 text-[11px] font-medium text-ink-secondary">
                            {count} paint{count !== 1 ? 's' : ''}
                        </span>
                        {isDirty && activePalette && (
                            <span className="text-[11px] font-semibold text-warning">Modified</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
                <button
                    type="button"
                    onClick={onSave}
                    className="min-h-9 rounded-md bg-ink px-3 text-[11px] font-semibold text-paper-elevated transition-colors hover:bg-graphite"
                >
                    {activePalette && !isDirty ? 'Rename' : 'Save palette'}
                </button>
                <button
                    type="button"
                    onClick={onSwitchClick}
                    className="min-h-9 rounded-md border border-linen-strong bg-paper-elevated px-3 text-[11px] font-semibold text-ink transition-colors hover:border-ink-muted hover:bg-paper"
                >
                    Switch
                </button>
                <button
                    type="button"
                    onClick={clearSelection}
                    className="min-h-9 rounded-md px-3 text-[11px] font-semibold text-danger transition-colors hover:bg-danger/10"
                >
                    Clear
                </button>
            </div>
        </section>
    )
}
