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

  // Dynamic styling for texture matching the thread color
  const threadStyle = useMemo(() => {
    return {
      backgroundColor: hex,
      backgroundImage: `
        repeating-linear-gradient(82deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px),
        linear-gradient(90deg, rgba(0,0,0,0.25) 0%, rgba(255,255,255,0.2) 20%, rgba(0,0,0,0.02) 50%, rgba(255,255,255,0.15) 80%, rgba(0,0,0,0.3) 100%)
      `,
    }
  }, [hex])

  // Dimensions based on size
  const dims = useMemo(() => {
    switch (size) {
      case 'hero':
        return {
          container: 'w-24 h-64 sm:w-28 sm:h-72',
          threadBody: 'w-10 sm:w-12 h-full rounded-2xl',
          mainBand: 'h-14 w-12 sm:w-14 top-[30%]',
          codeBand: 'h-10 w-11 sm:w-13 top-[70%]',
          textSize: 'text-[9px] sm:text-[10px]',
          numSize: 'text-sm sm:text-base font-black',
        }
      case 'lg':
        return {
          container: 'w-16 h-48',
          threadBody: 'w-8 h-full rounded-xl',
          mainBand: 'h-10 w-10 top-[28%]',
          codeBand: 'h-8 w-9 top-[68%]',
          textSize: 'text-[7px]',
          numSize: 'text-xs font-black',
        }
      case 'sm':
        return {
          container: 'w-12 h-32',
          threadBody: 'w-6 h-full rounded-lg',
          mainBand: 'h-7 w-7 top-[25%]',
          codeBand: 'h-6 w-[26px] top-[65%]',
          textSize: 'text-[5px]',
          numSize: 'text-[10px] font-black',
        }
      case 'md':
      default:
        return {
          container: 'w-14 h-40',
          threadBody: 'w-7 h-full rounded-xl',
          mainBand: 'h-9 w-9 top-[25%]',
          codeBand: 'h-7 w-8 top-[65%]',
          textSize: 'text-[6px]',
          numSize: 'text-xs font-black',
        }
    }
  }, [size])

  // Gold Horse Head SVG (DMC Logo asset)
  const GoldHorseHead = () => (
    <svg
      viewBox="0 0 100 100"
      className="w-4 h-4 text-[#d4af37] fill-current"
      aria-hidden="true"
    >
      <path d="M45,15 C52,15 65,22 70,30 C75,38 72,50 68,55 C65,58 60,60 58,63 C56,66 57,75 50,78 C43,81 35,78 30,73 C25,68 20,55 22,45 C24,35 30,25 38,18 C40,16 42,15 45,15 Z M42,32 C40,32 38,34 38,36 C38,38 40,40 42,40 C44,40 46,38 46,36 C46,34 44,32 42,32 Z" />
    </svg>
  )

  return (
    <div
      className="flex flex-col items-center select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Physical Skein Body wrapper */}
      <div className={`relative flex justify-center ${dims.container}`}>
        {/* Thread Strand Container */}
        <div
          onClick={onClick}
          style={threadStyle}
          className={`relative cursor-pointer transition-all duration-300 shadow-md ${dims.threadBody} ${
            selected
              ? 'ring-4 ring-amber-500/80 ring-offset-2 ring-offset-white dark:ring-offset-gray-950 scale-105 shadow-xl'
              : 'hover:shadow-lg'
          }`}
          role="button"
          aria-label={`View DMC thread ${number} ${name}`}
        >
          {/* Stranded cotton highlights - wavy lines */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/25 rounded-inherit pointer-events-none" />

          {/* SKEIN PARTS: Loop visual splits */}
          {/* Top Loop Shadow */}
          <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/20 to-transparent rounded-t-inherit pointer-events-none" />
          {/* Bottom Loop Shadow */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/35 to-transparent rounded-b-inherit pointer-events-none" />

          {/* Loose thread tail at the very bottom */}
          <div
            className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-1.5 h-4 opacity-80 rounded-full"
            style={{
              backgroundColor: hex,
              backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.3) 0%, rgba(255,255,255,0.2) 50%, rgba(0,0,0,0.4) 100%)',
            }}
          />

          {/* Central Navy Wrapper Band */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 bg-[#0c1328] border-y-[1.5px] border-[#cda250] shadow-[0_2px_4px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center pointer-events-none ${dims.mainBand}`}
          >
            {/* Gold trim lines inside */}
            <div className="absolute inset-x-0 top-0.5 bottom-0.5 border-y-[0.5px] border-[#cda250]/40" />

            <span
              className={`font-serif text-[#cda250] font-semibold tracking-widest leading-none ${dims.textSize}`}
              style={{ fontFamily: "'EB Garamond', serif" }}
            >
              D·M·C
            </span>
            <div className="scale-75 my-0.5">
              <GoldHorseHead />
            </div>
            {size !== 'sm' && (
              <span className="text-[4px] text-[#cda250]/80 tracking-[0.15em] uppercase font-mono leading-none">
                Mouliné
              </span>
            )}
          </div>

          {/* Lower White Code Band */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 bg-[#fafafa] border border-gray-300 text-gray-900 shadow-[0_2px_4px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center pointer-events-none ${dims.codeBand}`}
          >
            {/* Mini Barcode lines */}
            {size !== 'sm' && (
              <div className="flex gap-[1px] h-2 w-full justify-center px-1 opacity-70 mb-0.5">
                <div className="w-[1.5px] bg-black h-full" />
                <div className="w-[0.5px] bg-black h-full" />
                <div className="w-[1.5px] bg-black h-full" />
                <div className="w-[1px] bg-black h-full" />
                <div className="w-[0.5px] bg-black h-full" />
                <div className="w-[2px] bg-black h-full" />
              </div>
            )}
            {/* Color Number */}
            <span className={`font-mono font-black text-black leading-none select-text ${dims.numSize}`}>
              {number}
            </span>
          </div>
        </div>
      </div>

      {/* Thread Metadata label underneath */}
      {size !== 'sm' && (
        <div className="text-center mt-2.5 max-w-[120px]">
          <p className="font-mono text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
            {number}
          </p>
          <p className="text-[10px] text-gray-500 truncate font-medium">
            {name}
          </p>
        </div>
      )}

      {/* Actions overlay panel (bobbin checklist and list shopping cart) */}
      {showActions && (size === 'hero' || size === 'lg' || (size === 'md' && isHovered)) && (
        <div className="flex items-center gap-2 mt-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-full px-2.5 py-1 shadow-sm transition-all animate-in fade-in duration-200">
          {/* Stash toggle button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleStash(number)
            }}
            className={`p-1.5 rounded-full transition-colors ${
              inStash
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900'
            }`}
            title={inStash ? 'In your stash (Click to remove)' : 'Add to stash'}
            aria-label={inStash ? 'Remove from stash' : 'Add to stash'}
          >
            {/* Bobbin or thread spooled checkmark icon */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {inStash ? (
                <path d="M20 6 9 17l-5-5" />
              ) : (
                <>
                  <path d="M12 2v20" />
                  <path d="M17 5H7" />
                  <path d="M19 12H5" />
                  <path d="M17 19H7" />
                </>
              )}
            </svg>
          </button>

          {/* Shopping list toggle button */}
          {!inStash && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toggleShoppingList(number)
              }}
              className={`p-1.5 rounded-full transition-colors ${
                onList
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900'
              }`}
              title={onList ? 'On shopping list (Click to remove)' : 'Add to shopping list'}
              aria-label={onList ? 'Remove from shopping list' : 'Add to shopping list'}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
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

          {/* Stash label */}
          {inStash && size === 'hero' && (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider pr-1">
              Stashed
            </span>
          )}
          {onList && size === 'hero' && (
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider pr-1">
              Wanted
            </span>
          )}
        </div>
      )}
    </div>
  )
}
