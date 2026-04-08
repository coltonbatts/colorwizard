/**
 * Stable import path for canvas/shared code: IPC + image URL helpers.
 * Implementation lives under lib/desktop/ (ColorWizard Pro boundary).
 */
'use client'

export { isDesktopApp } from './desktop/detect'
export * from './desktop/tauriClient'
