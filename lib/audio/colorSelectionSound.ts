// A soft, short tap generated locally; no asset download or audio on page load.
let context: AudioContext | null = null
let lastHitAt = -Infinity

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioContextClass = window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return null
  if (!context || context.state === 'closed') {
    context = new AudioContextClass()
  }
  return context
}

/** Unlock in the original gesture when selecting a demo requires async image loading. */
export function prepareColorSelectionSound(): void {
  try {
    const audio = getContext()
    if (audio && audio.state !== 'running') void audio.resume().catch(() => {})
  } catch {
    // Audio is optional; selecting a color must always remain available.
  }
}

export async function playColorSelectionSound(isEnabled: () => boolean): Promise<void> {
  try {
    if (!isEnabled()) return
    const now = Date.now()
    if (now - lastHitAt < 90) return
    const audio = getContext()
    if (!audio) return
    lastHitAt = now
    if (audio.state !== 'running') await audio.resume()
    if (audio.state !== 'running' || !isEnabled()) return

    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    const start = audio.currentTime
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(980, start)
    oscillator.frequency.exponentialRampToValueAtTime(640, start + 0.06)
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.07, start + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.065)
    gain.gain.linearRampToValueAtTime(0, start + 0.07)
    oscillator.connect(gain)
    gain.connect(audio.destination)
    oscillator.onended = () => {
      oscillator.disconnect()
      gain.disconnect()
    }
    oscillator.start(start)
    oscillator.stop(start + 0.075)
  } catch {
    // Unsupported devices and blocked playback degrade silently.
  }
}
