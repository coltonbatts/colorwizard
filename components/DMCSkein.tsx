'use client'

import { useMemo, useState } from 'react'
import { useDmcStore } from '@/lib/store/useDmcStore'

interface DMCSkeinProps {
  hex: string
  number: string
  name: string
  size?: 'sm' | 'md' | 'lg' | 'hero'
  selected?: boolean
  onClick?: () => void
  showActions?: boolean
  simple?: boolean // Kept for API compatibility, not needed for texturing now
}

export default function DMCSkein({
  hex,
  number,
  name,
  size = 'md',
  selected = false,
  onClick,
  showActions = true,
}: DMCSkeinProps) {
  const { stash, shoppingList, toggleStash, toggleShoppingList } = useDmcStore()
  const [isHovered, setIsHovered] = useState(false)

  const inStash = stash.includes(number.trim())
  const onList = shoppingList.includes(number.trim())

  // Flat dimension maps for the swatch card layout
  const dims = useMemo(() => {
    switch (size) {
      case 'hero':
        return {
          container: 'w-24 h-36 sm:w-28 sm:h-40',
          numSize: 'text-sm font-black',
          nameSize: 'text-[10px] text-gray-500 truncate block mt-0.5',
          btnSize: 'p-1.5',
          iconSize: '14',
        }
      case 'lg':
        return {
          container: 'w-18 h-28',
          numSize: 'text-xs font-black',
          nameSize: 'text-[9px] text-gray-500 truncate block',
          btnSize: 'p-1',
          iconSize: '12',
        }
      case 'sm':
        return {
          container: 'w-12 h-18',
          numSize: 'text-[10px] font-black',
          nameSize: 'hidden',
          btnSize: 'p-0.5',
          iconSize: '10',
        }
      case 'md':
      default:
        return {
          container: 'w-16 h-24',
          numSize: 'text-xs font-black',
          nameSize: 'text-[9px] text-gray-500 truncate block',
          btnSize: 'p-1',
          iconSize: '12',
        }
    }
  }, [size])

  return (
    <div
      className="flex flex-col items-center select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Flat Swatch Card */}
      <div
        onClick={onClick}
        className={`relative flex flex-col border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-950 transition-all duration-200 cursor-pointer shadow-sm ${
          dims.container
        } ${
          selected
            ? 'ring-2 ring-pink-600 dark:ring-ring-pink-500 scale-[1.03] shadow-md border-pink-300 dark:border-pink-900'
            : 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700'
        }`}
        role="button"
        aria-label={`View DMC color ${number} ${name}`}
      >
        {/* Solid Color Area */}
        <div
          className="w-full flex-1 relative transition-colors duration-350"
          style={{ backgroundColor: hex }}
        >
          {/* Subtle reflection overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent pointer-events-none" />

          {/* Quick Actions (Hover overlay on color block) */}
          {showActions && (isHovered || size === 'hero' || size === 'lg') && (
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center gap-1.5 animate-in fade-in duration-150">
              {/* Stash checkbox toggle */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleStash(number)
                }}
                className={`${dims.btnSize} rounded-full shadow-sm transition-colors ${
                  inStash
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-white/90 text-gray-700 hover:bg-white dark:bg-gray-900/90 dark:text-gray-200'
                }`}
                title={inStash ? 'In Stash (Click to remove)' : 'Add to Stash'}
                aria-label={inStash ? 'Remove from Stash' : 'Add to Stash'}
              >
                <svg
                  width={dims.iconSize}
                  height={dims.iconSize}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </button>

              {/* Wishlist toggle */}
              {!inStash && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleShoppingList(number)
                  }}
                  className={`${dims.btnSize} rounded-full shadow-sm transition-colors ${
                    onList
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-white/90 text-gray-700 hover:bg-white dark:bg-gray-900/90 dark:text-gray-200'
                  }`}
                  title={onList ? 'On Wishlist (Click to remove)' : 'Add to Wishlist'}
                  aria-label={onList ? 'Remove from Wishlist' : 'Add to Wishlist'}
                >
                  <svg
                    width={dims.iconSize}
                    height={dims.iconSize}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {onList ? (
                      <path d="M18 6 6 18M6 6l12 12" />
                    ) : (
                      <>
                        <circle cx="8" cy="21" r="1" />
                        <circle cx="19" cy="21" r="1" />
                        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                      </>
                    )}
                  </svg>
                </button>
              )}
            </div>
          )}
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

      {/* Badges under swatch */}
      {inStash && size === 'hero' && (
        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-1.5 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-950">
          Stashed
        </span>
      )}
      {onList && size === 'hero' && (
        <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mt-1.5 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-950">
          Wishlist
        </span>
      )}
    </div>
  )
}
