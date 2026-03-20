'use client'

import { type ReactNode } from 'react'
import OverlaySurface from '@/components/ui/Overlay'

interface FullScreenOverlayProps {
  isOpen: boolean
  onClose: () => void
  children?: ReactNode
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
  return (
    <OverlaySurface
      isOpen={isOpen}
      onClose={onClose}
      preset="fullscreen"
      ariaLabel="Full screen preview"
      closeOnBackdrop={false}
      closeOnPanelClick
      rootClassName="fixed inset-0 z-[9999]"
      backdropClassName="absolute inset-0 bg-transparent"
      panelClassName="relative flex h-full w-full items-center justify-center cursor-pointer"
      panelStyle={{ backgroundColor: backgroundColor || 'rgba(0, 0, 0, 0.95)' }}
    >
      {children}
    </OverlaySurface>
  )
}
