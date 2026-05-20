'use client'

interface ArtistLabToggleProps {
  artistMode: boolean
  onArtistModeChange: (artist: boolean) => void
  className?: string
}

/**
 * Artist = simpleMode on (plain fit words). Lab = simpleMode off (metrics + Mix Lab).
 */
export default function ArtistLabToggle({
  artistMode,
  onArtistModeChange,
  className = '',
}: ArtistLabToggleProps) {
  return (
    <div
      className={`inline-flex h-9 items-center rounded-lg border border-ink-hairline bg-paper p-0.5 ${className}`}
      role="group"
      aria-label="Artist or Lab view"
    >
      <button
        type="button"
        onClick={() => onArtistModeChange(true)}
        aria-pressed={artistMode}
        className={`rounded-md px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition-colors ${
          artistMode
            ? 'bg-signal text-white shadow-[0_6px_14px_rgba(200,35,25,0.2)]'
            : 'text-ink-secondary hover:text-ink'
        }`}
      >
        Artist
      </button>
      <button
        type="button"
        onClick={() => onArtistModeChange(false)}
        aria-pressed={!artistMode}
        className={`rounded-md px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition-colors ${
          !artistMode
            ? 'bg-ink text-paper shadow-[0_6px_14px_rgba(33,24,14,0.15)]'
            : 'text-ink-secondary hover:text-ink'
        }`}
      >
        Lab
      </button>
    </div>
  )
}
