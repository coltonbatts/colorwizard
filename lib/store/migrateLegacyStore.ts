'use client'

type LegacyStoreState = {
    pinnedColors?: unknown
    palettes?: unknown
    valueScaleSettings?: unknown
    sidebarCollapsed?: unknown
    compactMode?: unknown
    sidebarWidth?: unknown
    simpleMode?: unknown
    canvasSettings?: unknown
    debugModeEnabled?: unknown
    rulerGridEnabled?: unknown
    rulerGridSpacing?: unknown
    breakdownValue?: unknown
    valueModeEnabled?: unknown
    valueModeSteps?: unknown
    surfaceImage?: unknown
    surfaceBounds?: unknown
}

const LEGACY_STORAGE_KEY = 'colorwizard-storage'

const KEY_MAP: Array<{ key: string; state: (legacy: LegacyStoreState) => Record<string, unknown> }> = [
    {
        key: 'colorwizard-session',
        state: (legacy) => ({
            pinnedColors: legacy.pinnedColors ?? [],
            valueModeEnabled: legacy.valueModeEnabled ?? false,
            valueModeSteps: legacy.valueModeSteps ?? 9,
        }),
    },
    {
        key: 'colorwizard-palettes',
        state: (legacy) => ({
            palettes: legacy.palettes ?? [],
        }),
    },
    {
        key: 'colorwizard-layout',
        state: (legacy) => ({
            sidebarCollapsed: legacy.sidebarCollapsed ?? false,
            compactMode: legacy.compactMode ?? false,
            sidebarWidth: legacy.sidebarWidth ?? 400,
            simpleMode: legacy.simpleMode ?? true,
        }),
    },
    {
        key: 'colorwizard-canvas',
        state: (legacy) => ({
            canvasSettings: legacy.canvasSettings ?? undefined,
            valueScaleSettings: legacy.valueScaleSettings ?? undefined,
            surfaceImage: legacy.surfaceImage ?? null,
            surfaceBounds: legacy.surfaceBounds ?? null,
        }),
    },
    {
        key: 'colorwizard-calibration-ui',
        state: (legacy) => ({
            rulerGridEnabled: legacy.rulerGridEnabled ?? false,
            rulerGridSpacing: legacy.rulerGridSpacing ?? 1,
            gridOpacity: 0.3,
        }),
    },
]

let didMigrate = false

export function migrateLegacyStore() {
    if (didMigrate || typeof window === 'undefined') return
    didMigrate = true

    try {
        const rawLegacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
        if (!rawLegacy) return

        const parsed = JSON.parse(rawLegacy) as { state?: LegacyStoreState } | null
        const legacyState = parsed?.state
        if (!legacyState) return

        let wroteAny = false

        for (const entry of KEY_MAP) {
            if (window.localStorage.getItem(entry.key)) continue

            const slice = entry.state(legacyState)
            window.localStorage.setItem(entry.key, JSON.stringify({ state: slice, version: 0 }))
            wroteAny = true
        }

        if (wroteAny) {
            window.localStorage.removeItem(LEGACY_STORAGE_KEY)
        }
    } catch {
        // Ignore malformed legacy storage and let the new stores start cleanly.
    }
}

