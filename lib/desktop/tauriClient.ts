/**
 * ColorWizard Pro — Tauri v2 IPC and file URL helpers.
 * Do not import from shared UI except via @/lib/tauri (compat) or from components/desktop/*.
 */
'use client'

import { convertFileSrc } from '@tauri-apps/api/core'
import { isDesktopApp } from './detect'

interface WindowWithTauriFileSrc {
  __TAURI_INTERNALS__?: {
    convertFileSrc?: (filePath: string, protocol?: string) => string
  }
}

function isRemoteHttpUrl(src: string): boolean {
  return /^https?:\/\//i.test(src)
}

function hasTauriFileSrcConverter(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as WindowWithTauriFileSrc
  return typeof w.__TAURI_INTERNALS__?.convertFileSrc === 'function'
}

/**
 * Tauri 2 may persist local files as `asset://localhost/%2FUsers%2F...`.
 * Normalize to an absolute filesystem path for storage and for convertFileSrc.
 */
function assetUrlToFsPath(src: string): string | null {
  try {
    const url = new URL(src)
    if (url.protocol !== 'asset:') return null

    let path = decodeURIComponent(url.pathname)
    // Encoded Unix absolute path: "/%2FUsers%2F..." → "//Users/..."
    if (path.startsWith('//') && path.length > 2 && path[2] !== ':') {
      path = path.slice(1)
    }

    if (path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path)) {
      return path
    }
    return null
  } catch {
    return null
  }
}

/** @deprecated Prefer isDesktopApp() in new code; kept for @/lib/tauri compatibility. */
export function isTauri(): boolean {
  return isDesktopApp()
}

export function sanitizeDesktopProjectImageSrc(src: string | null | undefined): string | null {
  if (!src) return null

  if (src.startsWith('blob:')) {
    return null
  }

  if (src.startsWith('asset:')) {
    return assetUrlToFsPath(src)
  }

  if (isRemoteHttpUrl(src)) {
    return null
  }

  if (src.startsWith('file://')) {
    return fileUrlToPath(src) ?? src
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

  if (sanitizedSrc.startsWith('data:') || sanitizedSrc.startsWith('blob:')) {
    return sanitizedSrc
  }

  const canConvertFileSrc = hasTauriFileSrcConverter() || isDesktopApp()

  if (sanitizedSrc.startsWith('file://')) {
    const filePath = fileUrlToPath(sanitizedSrc)
    return filePath && canConvertFileSrc ? convertFileSrc(filePath) : filePath ?? sanitizedSrc
  }

  if (sanitizedSrc.startsWith('/') || /^[A-Za-z]:[\\/]/.test(sanitizedSrc)) {
    return canConvertFileSrc ? convertFileSrc(sanitizedSrc) : sanitizedSrc
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
  return Promise.resolve().then(() => fn(cmd, args))
}

function withProjectId(projectId: number): Record<string, unknown> {
  return { projectId, project_id: projectId }
}

export async function initDatabase(): Promise<string> {
  return invoke('cw_init_database') as Promise<string>
}

export async function resolveTauriCanvasImageSrc(src: string | null | undefined): Promise<string | null> {
  const sanitizedSrc = sanitizeDesktopProjectImageSrc(src)
  if (!sanitizedSrc) return null

  if (
    sanitizedSrc.startsWith('data:') ||
    sanitizedSrc.startsWith('blob:') ||
    isRemoteHttpUrl(sanitizedSrc)
  ) {
    return sanitizedSrc
  }

  if (sanitizedSrc.startsWith('/') || /^[A-Za-z]:[\\/]/.test(sanitizedSrc)) {
    const resolvedSrc = resolveTauriImageSrc(sanitizedSrc)
    if (!isDesktopApp() || !resolvedSrc) {
      return resolvedSrc
    }

    try {
      const response = await fetch(resolvedSrc)
      if (!response.ok) {
        throw new Error(`fetch failed with status ${response.status}`)
      }
      const blob = await response.blob()
      return URL.createObjectURL(blob)
    } catch (error) {
      console.warn('[Tauri] Falling back to native image read for canvas load:', error)
      return invoke('cw_read_file_as_data_url', { path: sanitizedSrc }) as Promise<string>
    }
  }

  return resolveTauriImageSrc(sanitizedSrc)
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

export async function updateProject(
  id: number,
  name?: string,
  thumbnail?: string | null,
): Promise<ProjectInfo> {
  const update: Record<string, unknown> = { id }
  if (name !== undefined) update.name = name
  if (thumbnail !== undefined) update.thumbnail = thumbnail ?? ''

  return invoke('cw_update_project', {
    update,
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
