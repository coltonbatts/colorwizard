/**
 * Tauri v2 command wrappers for ColorWizard Desktop.
 * All functions are safe for SSR - they check for window existence.
 */
'use client'

interface WindowWithTauri {
    __TAURI__?: { core?: { invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> } }
    __TAURI_INTERNALS__?: { invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> }
}

function getInvoke(): null | ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) {
    if (typeof window === 'undefined') return null
    const w = window as WindowWithTauri
    return w.__TAURI__?.core?.invoke ?? w.__TAURI_INTERNALS__?.invoke ?? null
}

export function isTauri(): boolean {
    return getInvoke() !== null
}

function invoke(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
    const fn = getInvoke()
    if (!fn) return Promise.reject(new Error(`Tauri invoke not available. Command: ${cmd}`))
    return fn(cmd, args)
}

// ─── Database ───

export async function initDatabase(): Promise<string> {
    return invoke('cw_init_database') as Promise<string>
}

// ─── Projects ───

export interface ProjectInfo {
    id: number
    name: string
    created_at: string
    modified_at: string
    thumbnail: string | null
}

export async function createProject(name: string): Promise<ProjectInfo> {
    return invoke('cw_create_project', { project: { name } }) as Promise<ProjectInfo>
}

export async function listProjects(): Promise<ProjectInfo[]> {
    const result = await invoke('cw_list_projects')
    return (result as ProjectInfo[]) || []
}

export async function getProject(projectId: number): Promise<ProjectInfo> {
    return invoke('cw_get_project', { project_id: projectId }) as Promise<ProjectInfo>
}

export async function updateProject(id: number, name?: string, thumbnail?: string): Promise<ProjectInfo> {
    return invoke('cw_update_project', {
        update: { id, ...(name && { name }), ...(thumbnail && { thumbnail }) },
    }) as Promise<ProjectInfo>
}

export async function deleteProject(projectId: number): Promise<string> {
    return invoke('cw_delete_project', { project_id: projectId }) as Promise<string>
}

// ─── Palettes ───

export async function savePalettes(projectId: number, palettes: unknown[]): Promise<string> {
    return invoke('cw_save_palettes', { project_id: projectId, palettes_json: JSON.stringify(palettes) }) as Promise<string>
}

export async function loadPalettes(projectId: number): Promise<unknown[]> {
    const result = await invoke('cw_load_palettes', { project_id: projectId }) as string
    try { return JSON.parse(result) } catch { return [] }
}

// ─── Pinned Colors ───

export async function savePinnedColors(projectId: number, colors: unknown[]): Promise<string> {
    return invoke('cw_save_pinned_colors', { project_id: projectId, pinned_colors_json: JSON.stringify(colors) }) as Promise<string>
}

export async function loadPinnedColors(projectId: number): Promise<unknown[]> {
    const result = await invoke('cw_load_pinned_colors', { project_id: projectId }) as string
    try { return JSON.parse(result) } catch { return [] }
}

// ─── App Settings ───

export async function setAppSetting(key: string, value: string): Promise<string> {
    return invoke('cw_set_app_setting', { key, value }) as Promise<string>
}

export async function getAppSetting(key: string): Promise<string | null> {
    return invoke('cw_get_app_setting', { key }) as Promise<string | null>
}

// ─── License Key ───

export async function validateLicenseKey(key: string): Promise<boolean> {
    return invoke('cw_validate_license_key', { key }) as Promise<boolean>
}

export async function setLicenseKey(key: string): Promise<string> {
    return invoke('cw_set_license_key', { key }) as Promise<string>
}

export async function getLicenseKey(): Promise<string | null> {
    return invoke('cw_get_license_key') as Promise<string | null>
}
