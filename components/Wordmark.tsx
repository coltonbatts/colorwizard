/** ColorWizard wordmark — chromatic aperture instrument identity. */

'use client'

import Link from 'next/link'

interface WordmarkProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'hero'
  /** Show optional color bar accent */
  showColorBar?: boolean
  /** Link to home when clicked */
  asLink?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Classic Apple-inspired color bar
 * 6 colors from the original Apple logo, restrained and flat
 * Used sparingly as a structural marker
 */
const ChromaticAperture = ({ className = '' }: { className?: string }) => (
  <span className={`wordmark-aperture ${className}`} aria-hidden="true" />
)

const sizeClasses = {
  sm: 'text-lg',      // 18px
  md: 'text-xl',      // 22px
  lg: 'text-2xl',     // 28px
  hero: 'text-3xl md:text-4xl lg:text-5xl', // 36px -> 48px
}

export default function Wordmark({
  size = 'md',
  showColorBar = false,
  asLink = true,
  className = '',
}: WordmarkProps) {
  const wordmarkContent = (
    <span
      className={`
        font-wordmark
        text-ink
        tracking-tight
        select-none
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <ChromaticAperture />
      <span>ColorWizard</span>
    </span>
  )

  const content = showColorBar ? (
    <div className="inline-flex flex-col gap-1">
      {wordmarkContent}
      <ChromaticAperture className="wordmark-aperture--bar" />
    </div>
  ) : (
    wordmarkContent
  )

  if (asLink) {
    return (
      <Link
        href="/"
        className="inline-flex min-h-11 items-center transition-opacity duration-fast hover:opacity-80"
      >
        {content}
      </Link>
    )
  }

  return content
}

/**
 * Hero wordmark for landing pages and empty states
 * Larger, more prominent, with optional tagline
 */
export function WordmarkHero({
  showColorBar = true,
  tagline,
  className = '',
}: {
  showColorBar?: boolean
  tagline?: string
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <span className="font-wordmark-hero text-ink tracking-tight select-none">
        <ChromaticAperture />
        <span>ColorWizard</span>
      </span>

      {showColorBar && (
        <ChromaticAperture className="wordmark-aperture--bar mt-3" />
      )}

      {tagline && (
        <p className="mt-4 text-sm text-ink-muted font-ui tracking-wide uppercase">
          {tagline}
        </p>
      )}
    </div>
  )
}

/**
 * Compact wordmark for toolbars and headers
 * Just the text, minimal styling
 */
export function WordmarkCompact({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`
        inline-flex
        min-h-11
        items-center
        font-wordmark
        text-lg
        text-ink
        tracking-tight
        hover:opacity-80
        transition-opacity
        duration-fast
        ${className}
      `}
    >
      <ChromaticAperture />
      <span>ColorWizard</span>
    </Link>
  )
}
