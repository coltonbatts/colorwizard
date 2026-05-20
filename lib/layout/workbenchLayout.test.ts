import { describe, expect, it } from 'vitest'
import { getWorkbenchLayoutMode } from './workbenchLayout'

describe('getWorkbenchLayoutMode', () => {
  it('uses the wide layout for large desktop shells', () => {
    expect(getWorkbenchLayoutMode(1600, 900)).toBe('wide')
  })

  it('uses the medium layout for tighter but still roomy desktops', () => {
    expect(getWorkbenchLayoutMode(1366, 820)).toBe('medium')
  })

  it('uses the medium layout for common laptop sizes', () => {
    expect(getWorkbenchLayoutMode(1280, 720)).toBe('medium')
    expect(getWorkbenchLayoutMode(1180, 800)).toBe('medium')
  })

  it('uses the narrow layout when the shell becomes constrained', () => {
    expect(getWorkbenchLayoutMode(1100, 700)).toBe('narrow')
  })
})

