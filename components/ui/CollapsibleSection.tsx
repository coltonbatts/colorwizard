'use client'

import { useState, ReactNode } from 'react'

interface CollapsibleSectionProps {
  title: string
  icon?: string
  accentColor?: string
  defaultOpen?: boolean
  isOpen?: boolean
  onToggle?: () => void
  children: ReactNode
}

export default function CollapsibleSection({
  title,
  icon,
  accentColor = 'blue',
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onToggle,
  children
}: CollapsibleSectionProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen)

  // Support both controlled and uncontrolled modes
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  const handleToggle = () => {
    if (onToggle) {
      onToggle()
    } else {
      setInternalIsOpen(!internalIsOpen)
    }
  }

  const accentClasses: Record<string, { border: string; text: string; bg: string }> = {
    blue: { border: 'border-blue-500/30', text: 'text-blue-500', bg: 'bg-blue-500/5' },
    purple: { border: 'border-purple-500/30', text: 'text-purple-500', bg: 'bg-purple-500/5' },
    teal: { border: 'border-teal-500/30', text: 'text-teal-500', bg: 'bg-teal-500/5' },
    yellow: { border: 'border-yellow-500/30', text: 'text-yellow-500', bg: 'bg-yellow-500/5' },
    gray: { border: 'border-gray-300', text: 'text-gray-600', bg: 'bg-gray-50' },
  }

  const accent = accentClasses[accentColor] || accentClasses.blue

  return (
    <div className={`rounded-xl border ${isOpen ? accent.border : 'border-gray-100'} overflow-hidden transition-all duration-200`}>
      <button
        onClick={handleToggle}
        className={`w-full flex items-center justify-between px-4 py-3 ${isOpen ? accent.bg : 'bg-gray-50/50 hover:bg-gray-50'} transition-colors`}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-base">{icon}</span>}
          <span className={`text-sm font-bold uppercase tracking-wide ${isOpen ? accent.text : 'text-gray-600'}`}>
            {title}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`transition-all duration-200 ease-in-out ${
          isOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden`}
      >
        <div className="p-3">
          {children}
        </div>
      </div>
    </div>
  )
}
