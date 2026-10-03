import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function mockAudio(state = 'running') {
  const parameter = () => ({
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  })
  const oscillator = {
    type: '', frequency: parameter(), connect: vi.fn(), disconnect: vi.fn(),
    start: vi.fn(), stop: vi.fn(), onended: null as (() => void) | null,
  }
  const gain = { gain: parameter(), connect: vi.fn(), disconnect: vi.fn() }
  const audio = {
    state, currentTime: 1, destination: {}, resume: vi.fn(async () => { audio.state = 'running' }),
    createOscillator: vi.fn(() => oscillator), createGain: vi.fn(() => gain),
  }
  const constructor = vi.fn(function () { return audio })
  vi.stubGlobal('window', { AudioContext: constructor })
  return { audio, oscillator, gain, constructor }
}

describe('color selection sound', () => {
  beforeEach(() => { vi.resetModules(); vi.useFakeTimers() })
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

  it('stays silent on the server and when the user disables sound', async () => {
    const { playColorSelectionSound } = await import('./colorSelectionSound')
    await expect(playColorSelectionSound(() => true)).resolves.toBeUndefined()
    const { constructor } = mockAudio()
    await playColorSelectionSound(() => false)
    expect(constructor).not.toHaveBeenCalled()
  })

  it('creates one short hit, reuses its context, and disconnects finished nodes', async () => {
    const { constructor, oscillator, gain } = mockAudio()
    const { playColorSelectionSound } = await import('./colorSelectionSound')
    await playColorSelectionSound(() => true)
    expect(oscillator.start).toHaveBeenCalledWith(1)
    expect(oscillator.stop).toHaveBeenCalledWith(1.075)
    oscillator.onended?.()
    expect(oscillator.disconnect).toHaveBeenCalledOnce()
    expect(gain.disconnect).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(100)
    await playColorSelectionSound(() => true)
    expect(constructor).toHaveBeenCalledOnce()
  })

  it('limits rapid selections to avoid overlapping hits', async () => {
    const { audio } = mockAudio()
    const { playColorSelectionSound } = await import('./colorSelectionSound')
    await playColorSelectionSound(() => true)
    await playColorSelectionSound(() => true)
    expect(audio.createOscillator).toHaveBeenCalledOnce()
  })

  it('does not fail the interaction when playback is blocked or unavailable', async () => {
    const { audio } = mockAudio('suspended')
    audio.resume.mockRejectedValue(new Error('NotAllowedError'))
    const { playColorSelectionSound } = await import('./colorSelectionSound')
    await expect(playColorSelectionSound(() => true)).resolves.toBeUndefined()
    expect(audio.createOscillator).not.toHaveBeenCalled()
    vi.stubGlobal('window', {})
    vi.advanceTimersByTime(100)
    await expect(playColorSelectionSound(() => true)).resolves.toBeUndefined()
  })

  it('checks mute again after resuming a suspended context', async () => {
    const { audio } = mockAudio('suspended')
    let enabled = true
    audio.resume.mockImplementation(async () => { audio.state = 'running'; enabled = false })
    const { playColorSelectionSound } = await import('./colorSelectionSound')
    await playColorSelectionSound(() => enabled)
    expect(audio.createOscillator).not.toHaveBeenCalled()
  })

  it('prepares async demo selection audio during the original gesture', async () => {
    const { audio } = mockAudio('suspended')
    const { prepareColorSelectionSound, playColorSelectionSound } = await import('./colorSelectionSound')
    prepareColorSelectionSound()
    expect(audio.resume).toHaveBeenCalledOnce()
    await playColorSelectionSound(() => true)
    expect(audio.createOscillator).toHaveBeenCalledOnce()
  })
})
