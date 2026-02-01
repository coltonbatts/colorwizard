/**
 * ColorWizard Wordmark — Editorial Modernism
 *
 * Typography: Apple Garamond inspired (EB Garamond)
 * Period included for editorial finality
 * Minimal, confident, quiet
 *
 * Optional: Subtle reference to classic Apple color bar
 * (old-school, restrained, flat)
 *
 * The mark should feel like it belongs on:
 * - A printed manual
 * - A reference book
 * - A professional tool
 */

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
const AppleColorBar = ({ className = '' }: { className?: string }) => (
  <div className={`flex ${className}`} aria-hidden="true">
    <div className="h-[3px] flex-1 bg-[#61BB46]" /> {/* Green */}
    <div className="h-[3px] flex-1 bg-[#FDB827]" /> {/* Yellow */}
    <div className="h-[3px] flex-1 bg-[#F5821F]" /> {/* Orange */}
    <div className="h-[3px] flex-1 bg-[#E03A3E]" /> {/* Red */}
    <div className="h-[3px] flex-1 bg-[#963D97]" /> {/* Purple */}
    <div className="h-[3px] flex-1 bg-[#009DDC]" /> {/* Blue */}
  </div>
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
      ColorWizard<span className="text-ink-muted">.</span>
    </span>
  )

  const content = showColorBar ? (
    <div className="inline-flex flex-col gap-1">
      {wordmarkContent}
      <AppleColorBar className="w-full max-w-[120px]" />
    </div>
  ) : (
    wordmarkContent
  )

  if (asLink) {
    return (
      <Link
        href="/"
        className="inline-block hover:opacity-80 transition-opacity duration-fast"
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
        ColorWizard<span className="text-ink-muted">.</span>
      </span>

      {showColorBar && (
        <AppleColorBar className="w-full max-w-[200px] mt-3" />
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
      ColorWizard<span className="text-ink-muted">.</span>
    </Link>
  )
}
