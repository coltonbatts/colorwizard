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

/**
 * True when running inside the Tauri desktop shell (ColorWizard Pro).
 * Must stay aligned with the `runtime-detect` inline script in `app/layout.tsx` (dataset.runtime),
 * or the web marketing shell can flash in Pro.
 */
export function isDesktopApp(): boolean {
  if (typeof window === 'undefined') return false
  // Tauri v2 sets `globalThis.isTauri` (see @tauri-apps/api `isTauri()`). Prefer it so we
  // match the runtime even if `invoke` is not yet exposed on `__TAURI__` / `__TAURI_INTERNALS__`.
  try {
    if ((globalThis as unknown as { isTauri?: boolean }).isTauri === true) return true
  } catch {
    /* ignore */
  }
  return getInvoke() !== null
}
