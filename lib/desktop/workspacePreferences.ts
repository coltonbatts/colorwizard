import { getAppSetting, setAppSetting } from './tauriClient'

export type DesktopWorkspaceAccent = 'umber' | 'sage' | 'cobalt'
export type DesktopWorkspaceDensity = 'comfortable' | 'compact'
export type DesktopWorkspaceStartupBehavior = 'home' | 'resume'

export interface DesktopWorkspacePreferences {
  accent: DesktopWorkspaceAccent
  density: DesktopWorkspaceDensity
  showUtilityPanel: boolean
  startupBehavior: DesktopWorkspaceStartupBehavior
}

const PREFERENCE_KEYS = {
  accent: 'desktop_workspace_accent',
  density: 'desktop_workspace_density',
  showUtilityPanel: 'desktop_workspace_show_utility_panel',
  startupBehavior: 'desktop_workspace_startup_behavior',
} as const

export const DEFAULT_DESKTOP_WORKSPACE_PREFERENCES: DesktopWorkspacePreferences = {
  accent: 'umber',
  density: 'comfortable',
  showUtilityPanel: true,
  startupBehavior: 'home',
}

function parseAccent(value: string | null): DesktopWorkspaceAccent {
  return value === 'sage' || value === 'cobalt' ? value : DEFAULT_DESKTOP_WORKSPACE_PREFERENCES.accent
}

function parseDensity(value: string | null): DesktopWorkspaceDensity {
  return value === 'compact' ? value : DEFAULT_DESKTOP_WORKSPACE_PREFERENCES.density
}

function parseStartupBehavior(value: string | null): DesktopWorkspaceStartupBehavior {
  return value === 'resume' ? value : DEFAULT_DESKTOP_WORKSPACE_PREFERENCES.startupBehavior
}

function parseBoolean(value: string | null, fallback: boolean): boolean {
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

export async function loadDesktopWorkspacePreferences(): Promise<DesktopWorkspacePreferences> {
  const [accent, density, showUtilityPanel, startupBehavior] = await Promise.all([
    getAppSetting(PREFERENCE_KEYS.accent),
    getAppSetting(PREFERENCE_KEYS.density),
    getAppSetting(PREFERENCE_KEYS.showUtilityPanel),
    getAppSetting(PREFERENCE_KEYS.startupBehavior),
  ])

  return {
    accent: parseAccent(accent),
    density: parseDensity(density),
    showUtilityPanel: parseBoolean(
      showUtilityPanel,
      DEFAULT_DESKTOP_WORKSPACE_PREFERENCES.showUtilityPanel,
    ),
    startupBehavior: parseStartupBehavior(startupBehavior),
  }
}

export async function saveDesktopWorkspacePreference<K extends keyof DesktopWorkspacePreferences>(
  key: K,
  value: DesktopWorkspacePreferences[K],
): Promise<void> {
  await setAppSetting(PREFERENCE_KEYS[key], String(value))
}
