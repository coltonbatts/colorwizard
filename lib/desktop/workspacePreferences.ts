import { getAppSetting, setAppSetting } from './tauriClient'

export type DesktopWorkspaceStartupBehavior = 'home' | 'resume'

export interface DesktopWorkspacePreferences {
  startupBehavior: DesktopWorkspaceStartupBehavior
}

const PREFERENCE_KEYS = {
  startupBehavior: 'desktop_workspace_startup_behavior',
} as const

export const DEFAULT_DESKTOP_WORKSPACE_PREFERENCES: DesktopWorkspacePreferences = {
  startupBehavior: 'home',
}

function parseStartupBehavior(value: string | null): DesktopWorkspaceStartupBehavior {
  return value === 'resume' ? value : DEFAULT_DESKTOP_WORKSPACE_PREFERENCES.startupBehavior
}

export async function loadDesktopWorkspacePreferences(): Promise<DesktopWorkspacePreferences> {
  const startupBehavior = await getAppSetting(PREFERENCE_KEYS.startupBehavior)

  return {
    startupBehavior: parseStartupBehavior(startupBehavior),
  }
}

export async function saveDesktopWorkspacePreference<K extends keyof DesktopWorkspacePreferences>(
  key: K,
  value: DesktopWorkspacePreferences[K],
): Promise<void> {
  await setAppSetting(PREFERENCE_KEYS[key], String(value))
}
