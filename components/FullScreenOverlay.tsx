'use client'

import { useEffect, useCallback } from 'react'

interface FullScreenOverlayProps {
  isOpen: boolean
  onClose: () => void
  children?: React.ReactNode
  backgroundColor?: string
}

/**
 * FullScreenOverlay - A full-screen overlay component for viewing colors or images.
 * Covers the entire viewport with a high z-index.
 * Closes on click anywhere or ESC key press.
 */
export default function FullScreenOverlay({
  isOpen,
  onClose,
  children,
  backgroundColor
}: FullScreenOverlayProps) {
  
  // Handle ESC key to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll while overlay is open
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer animate-in fade-in duration-200"
      style={{ backgroundColor: backgroundColor || 'rgba(0, 0, 0, 0.95)' }}
    >
      {children}
    </div>
  )
}
