/**
 * ColorWizard Pro — runtime detection only.
 * No @tauri-apps imports: safe for shared hooks and tree-shaking on web.
 */

interface WindowWithTauri {
  __TAURI__?: { core?: { invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> } }
  __TAURI_INTERNALS__?: { invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> }
}

function getInvoke(): null | ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) {
  if (typeof window === 'undefined') return null
  const w = window as WindowWithTauri
  return w.__TAURI__?.core?.invoke ?? w.__TAURI_INTERNALS__?.invoke ?? null
}

/** True when running inside the Tauri desktop shell (ColorWizard Pro). */
export function isDesktopApp(): boolean {
  return getInvoke() !== null
}
