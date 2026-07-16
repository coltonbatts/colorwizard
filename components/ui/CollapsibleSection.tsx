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
  accentColor,
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onToggle,
  children
}: CollapsibleSectionProps) {
  void accentColor
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

  return (
    <section className={`overflow-hidden rounded-lg border bg-paper-elevated transition-[border-color,box-shadow] duration-200 ${isOpen ? 'border-ink-muted shadow-sm' : 'border-ink-hairline'}`}>
      <button
        type="button"
        onClick={handleToggle}
        className={`flex min-h-11 w-full items-center justify-between px-4 py-3 text-left transition-colors ${isOpen ? 'bg-paper-recessed' : 'bg-paper-elevated hover:bg-paper-recessed'}`}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-base">{icon}</span>}
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-secondary">
            {title}
          </span>
        </div>
        <svg
          aria-hidden="true"
          className={`h-4 w-4 text-ink-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div hidden={!isOpen}>
        <div className="border-t border-ink-hairline p-3">
          {children}
        </div>
      </div>
    </section>
  )
}
