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
      className={`inline-flex min-h-11 items-center rounded-lg border border-ink-hairline bg-paper p-0.5 ${className}`}
      role="group"
      aria-label="Artist or Lab view"
    >
      <button
        type="button"
        onClick={() => onArtistModeChange(true)}
        aria-pressed={artistMode}
        className={`min-h-10 rounded-md px-3 py-1.5 text-xs font-medium uppercase tracking-[0.08em] transition-colors ${
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
        className={`min-h-10 rounded-md px-3 py-1.5 text-xs font-medium uppercase tracking-[0.08em] transition-colors ${
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
