/**
 * ColorWizard Pro — Tauri v2 IPC and file URL helpers.
 * Do not import from shared UI except via @/lib/tauri (compat) or from components/desktop/*.
 */
'use client'

import { convertFileSrc } from '@tauri-apps/api/core'
import { isDesktopApp } from './detect'

function isRemoteHttpUrl(src: string): boolean {
  return /^https?:\/\//i.test(src)
}

/** @deprecated Prefer isDesktopApp() in new code; kept for @/lib/tauri compatibility. */
export function isTauri(): boolean {
  return isDesktopApp()
}

export function sanitizeDesktopProjectImageSrc(src: string | null | undefined): string | null {
  if (!src) return null
  if (!isDesktopApp()) return src

  if (isRemoteHttpUrl(src) || src.startsWith('blob:')) {
    return null
  }

  return src
}

function fileUrlToPath(src: string): string | null {
  try {
    const url = new URL(src)
    if (url.protocol !== 'file:') return null

    const decodedPath = decodeURIComponent(url.pathname)

    if (/^\/[A-Za-z]:\//.test(decodedPath)) {
      return decodedPath.slice(1)
    }

    return decodedPath
  } catch {
    return null
  }
}

export function resolveTauriImageSrc(src: string | null | undefined): string | null {
  const sanitizedSrc = sanitizeDesktopProjectImageSrc(src)
  if (!sanitizedSrc) return null
  if (!isDesktopApp()) return sanitizedSrc

  if (
    sanitizedSrc.startsWith('data:') ||
    sanitizedSrc.startsWith('blob:') ||
    sanitizedSrc.startsWith('asset:')
  ) {
    return sanitizedSrc
  }

  if (sanitizedSrc.startsWith('file://')) {
    const filePath = fileUrlToPath(sanitizedSrc)
    return filePath ? convertFileSrc(filePath) : sanitizedSrc
  }

  if (sanitizedSrc.startsWith('/') || /^[A-Za-z]:[\\/]/.test(sanitizedSrc)) {
    return convertFileSrc(sanitizedSrc)
  }

  return sanitizedSrc
}

function invoke(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error(`Tauri invoke not available. Command: ${cmd}`))
  }
  const w = window as {
    __TAURI__?: { core?: { invoke?: (c: string, a?: Record<string, unknown>) => Promise<unknown> } }
    __TAURI_INTERNALS__?: { invoke?: (c: string, a?: Record<string, unknown>) => Promise<unknown> }
  }
  const fn = w.__TAURI__?.core?.invoke ?? w.__TAURI_INTERNALS__?.invoke
  if (!fn) return Promise.reject(new Error(`Tauri invoke not available. Command: ${cmd}`))
  return fn(cmd, args)
}

function withProjectId(projectId: number): Record<string, unknown> {
  return { projectId, project_id: projectId }
}

export async function initDatabase(): Promise<string> {
  return invoke('cw_init_database') as Promise<string>
}

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
  return invoke('cw_get_project', withProjectId(projectId)) as Promise<ProjectInfo>
}

export async function updateProject(id: number, name?: string, thumbnail?: string): Promise<ProjectInfo> {
  return invoke('cw_update_project', {
    update: { id, ...(name && { name }), ...(thumbnail && { thumbnail }) },
  }) as Promise<ProjectInfo>
}

export async function deleteProject(projectId: number): Promise<string> {
  return invoke('cw_delete_project', withProjectId(projectId)) as Promise<string>
}

export async function savePalettes(projectId: number, palettes: unknown[]): Promise<string> {
  const palettesJson = JSON.stringify(palettes)
  return invoke('cw_save_palettes', {
    ...withProjectId(projectId),
    palettesJson,
    palettes_json: palettesJson,
  }) as Promise<string>
}

export async function loadPalettes(projectId: number): Promise<unknown[]> {
  const result = await invoke('cw_load_palettes', withProjectId(projectId)) as string
  try { return JSON.parse(result) } catch { return [] }
}

export async function savePinnedColors(projectId: number, colors: unknown[]): Promise<string> {
  const pinnedColorsJson = JSON.stringify(colors)
  return invoke('cw_save_pinned_colors', {
    ...withProjectId(projectId),
    pinnedColorsJson,
    pinned_colors_json: pinnedColorsJson,
  }) as Promise<string>
}

export async function loadPinnedColors(projectId: number): Promise<unknown[]> {
  const result = await invoke('cw_load_pinned_colors', withProjectId(projectId)) as string
  try { return JSON.parse(result) } catch { return [] }
}

export async function setAppSetting(key: string, value: string): Promise<string> {
  return invoke('cw_set_app_setting', { key, value }) as Promise<string>
}

export async function getAppSetting(key: string): Promise<string | null> {
  return invoke('cw_get_app_setting', { key }) as Promise<string | null>
}

export async function validateLicenseKey(key: string): Promise<boolean> {
  return invoke('cw_validate_license_key', { key }) as Promise<boolean>
}

export async function setLicenseKey(key: string): Promise<string> {
  return invoke('cw_set_license_key', { key }) as Promise<string>
}

export async function getLicenseKey(): Promise<string | null> {
  return invoke('cw_get_license_key') as Promise<string | null>
}

/** Native image file picker (Tauri dialog). Returns an absolute file path, or null if cancelled. */
export async function pickImagePath(): Promise<string | null> {
  if (!isDesktopApp()) return null
  const { open } = await import('@tauri-apps/plugin-dialog')
  const selected = await open({
    multiple: false,
    title: 'Open image',
    filters: [
      {
        name: 'Images',
        extensions: [
          'png',
          'jpg',
          'jpeg',
          'webp',
          'heic',
          'heif',
          'tif',
          'tiff',
          'bmp',
          'avif',
        ],
      },
    ],
  })
  if (selected === null || Array.isArray(selected)) return null
  return selected
}
