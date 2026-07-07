'use client'

import { useMemo } from 'react'

interface DMCSkeinProps {
  hex: string
  number: string
  name: string
  size?: 'sm' | 'md' | 'lg' | 'hero'
  selected?: boolean
  onClick?: () => void
}

export default function DMCSkein({
  hex,
  number,
  name,
  size = 'md',
  selected = false,
  onClick,
}: DMCSkeinProps) {
  // Flat dimension maps for the swatch card layout
  const dims = useMemo(() => {
    switch (size) {
      case 'hero':
        return {
          container: 'w-24 h-32 sm:w-28 sm:h-36',
          numSize: 'text-sm font-black',
          nameSize: 'text-[10px] text-gray-500 truncate block mt-0.5',
        }
      case 'lg':
        return {
          container: 'w-18 h-26',
          numSize: 'text-xs font-black',
          nameSize: 'text-[9px] text-gray-500 truncate block',
        }
      case 'sm':
        return {
          container: 'w-12 h-16',
          numSize: 'text-[10px] font-black',
          nameSize: 'hidden',
        }
      case 'md':
      default:
        return {
          container: 'w-16 h-22',
          numSize: 'text-xs font-black',
          nameSize: 'text-[9px] text-gray-500 truncate block',
        }
    }
  }, [size])

  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-950 transition-all duration-200 cursor-pointer shadow-sm ${
        dims.container
      } ${
        selected
          ? 'ring-2 ring-pink-600 dark:ring-pink-500 scale-[1.02] shadow-md border-pink-300 dark:border-pink-900'
          : 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700'
      }`}
      role="button"
      aria-label={`View DMC color ${number} ${name}`}
    >
      {/* Solid Color Area */}
      <div
        className="w-full flex-1 relative"
        style={{ backgroundColor: hex }}
      >
        {/* Subtle reflection overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent pointer-events-none" />
      </div>

      {/* Swatch Metadata bottom bar */}
      <div className="w-full bg-gray-50 dark:bg-gray-900 border-t border-gray-150 dark:border-gray-800 py-1.5 px-2 text-center leading-none">
        <span className={`font-mono text-gray-900 dark:text-gray-100 ${dims.numSize}`}>
          {number}
        </span>
        {size !== 'sm' && (
          <span className={dims.nameSize}>
            {name}
          </span>
        )}
      </div>
    </div>
  )
}
