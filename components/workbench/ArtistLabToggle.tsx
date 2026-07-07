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
        className={`rounded-md px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] transition-colors ${
          artistMode
            ? 'bg-ink text-paper'
            : 'text-ink-secondary hover:text-ink'
        }`}
      >
        Artist
      </button>
      <button
        type="button"
        onClick={() => onArtistModeChange(false)}
        aria-pressed={!artistMode}
        className={`rounded-md px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] transition-colors ${
          !artistMode
            ? 'bg-ink text-paper'
            : 'text-ink-secondary hover:text-ink'
        }`}
      >
        Lab
      </button>
    </div>
  )
}
