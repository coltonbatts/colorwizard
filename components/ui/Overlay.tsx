'use client'

import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AnimatePresence, motion, useReducedMotion, type Transition } from 'framer-motion'
import { createPortal } from 'react-dom'

type OverlayPreset = 'dialog' | 'drawer' | 'fullscreen'

interface OverlaySurfaceProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  preset?: OverlayPreset
  rootClassName?: string
  backdropClassName?: string
  panelClassName?: string
  panelStyle?: CSSProperties
  role?: 'dialog' | 'alertdialog'
  ariaLabel?: string
  ariaLabelledBy?: string
  ariaDescribedBy?: string
  initialFocusRef?: RefObject<HTMLElement | null>
  closeOnBackdrop?: boolean
  closeOnPanelClick?: boolean
  trapFocus?: boolean
  restoreFocus?: boolean
}

type OverlayStyles = {
  overflow: string
  paddingRight: string
  overscrollBehavior: string
}

let scrollLockCount = 0
let originalBodyStyles: OverlayStyles | null = null
const overlayStack: string[] = []

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]',
      ].join(', '),
    ),
  ).filter((element) => !element.hasAttribute('disabled') && !element.getAttribute('aria-hidden'))
}

function lockDocumentScroll() {
  if (typeof document === 'undefined') {
    return
  }

  if (scrollLockCount === 0) {
    originalBodyStyles = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
      overscrollBehavior: document.body.style.overscrollBehavior,
    }

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'contain'
  }

  scrollLockCount += 1
}

function unlockDocumentScroll() {
  if (typeof document === 'undefined' || scrollLockCount === 0) {
    return
  }

  scrollLockCount -= 1

  if (scrollLockCount === 0 && originalBodyStyles) {
    document.body.style.overflow = originalBodyStyles.overflow
    document.body.style.paddingRight = originalBodyStyles.paddingRight
    document.body.style.overscrollBehavior = originalBodyStyles.overscrollBehavior
    originalBodyStyles = null
  }
}

function registerOverlay(id: string) {
  overlayStack.push(id)
}

function unregisterOverlay(id: string) {
  const index = overlayStack.lastIndexOf(id)
  if (index >= 0) {
    overlayStack.splice(index, 1)
  }
}

function isTopOverlay(id: string) {
  return overlayStack[overlayStack.length - 1] === id
}

function getPresetVariants(preset: OverlayPreset, reducedMotion: boolean) {
  switch (preset) {
    case 'drawer':
      return {
        panelInitial: reducedMotion ? { opacity: 0 } : { x: '100%' },
        panelAnimate: { opacity: 1, x: 0 },
        panelExit: reducedMotion ? { opacity: 0 } : { x: '100%' },
        panelTransition: (reducedMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 320, damping: 34 }) as Transition,
      }
    case 'fullscreen':
      return {
        panelInitial: { opacity: 0 },
        panelAnimate: { opacity: 1 },
        panelExit: { opacity: 0 },
        panelTransition: { duration: reducedMotion ? 0 : 0.16, ease: 'easeOut' } as Transition,
      }
    case 'dialog':
    default:
      return {
        panelInitial: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 10 },
        panelAnimate: { opacity: 1, scale: 1, y: 0 },
        panelExit: reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 10 },
        panelTransition: (reducedMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 360, damping: 32 }) as Transition,
      }
  }
}

export default function OverlaySurface({
  isOpen,
  onClose,
  children,
  preset = 'dialog',
  rootClassName,
  backdropClassName,
  panelClassName,
  panelStyle,
  role = 'dialog',
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  initialFocusRef,
  closeOnBackdrop = true,
  closeOnPanelClick = false,
  trapFocus = true,
  restoreFocus = true,
}: OverlaySurfaceProps) {
  const overlayId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const isOpenRef = useRef(isOpen)
  const reducedMotion = useReducedMotion() ?? false
  const [isMounted, setIsMounted] = useState(false)

  const variants = useMemo(() => getPresetVariants(preset, reducedMotion), [preset, reducedMotion])

  useEffect(() => {
    isOpenRef.current = isOpen
    if (isOpen) {
      setIsMounted(true)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isMounted) {
      return
    }

    lockDocumentScroll()
    registerOverlay(overlayId)

    if (restoreFocus) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    }

    const focusFirstElement = () => {
      const panel = panelRef.current
      if (!panel) return

      const autofocusElement = panel.querySelector<HTMLElement>('[autofocus]')
      const focusTarget =
        initialFocusRef?.current ??
        autofocusElement ??
        getFocusableElements(panel)[0] ??
        panel

      focusTarget.focus({ preventScroll: true })
    }

    const frame = window.requestAnimationFrame(focusFirstElement)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!isTopOverlay(overlayId)) return
        event.preventDefault()
        onClose()
        return
      }

      if (!trapFocus || event.key !== 'Tab' || !isTopOverlay(overlayId)) {
        return
      }

      const panel = panelRef.current
      if (!panel) {
        return
      }

      const focusableElements = getFocusableElements(panel)
      if (focusableElements.length === 0) {
        event.preventDefault()
        panel.focus({ preventScroll: true })
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const currentElement = document.activeElement as HTMLElement | null

      if (event.shiftKey) {
        if (currentElement === firstElement || !panel.contains(currentElement)) {
          event.preventDefault()
          lastElement.focus({ preventScroll: true })
        }
      } else if (currentElement === lastElement) {
        event.preventDefault()
        firstElement.focus({ preventScroll: true })
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      unregisterOverlay(overlayId)
      unlockDocumentScroll()

      if (restoreFocus) {
        const previous = previouslyFocusedRef.current
        if (previous && document.contains(previous)) {
          previous.focus({ preventScroll: true })
        }
      }
    }
  }, [isMounted, onClose, overlayId, restoreFocus, trapFocus, initialFocusRef])

  if (typeof document === 'undefined' || (!isMounted && !isOpen)) {
    return null
  }

  return createPortal(
    <AnimatePresence onExitComplete={() => {
      if (!isOpenRef.current) {
        setIsMounted(false)
      }
    }}>
      {isOpen && (
        <div className={rootClassName ?? 'fixed inset-0 z-[1000]'}>
          <motion.div
            aria-hidden="true"
            className={backdropClassName ?? 'absolute inset-0 bg-black/60 backdrop-blur-sm'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
            onPointerDown={closeOnBackdrop ? onClose : undefined}
          />

          <motion.div
            ref={panelRef}
            role={role}
            tabIndex={-1}
            aria-modal="true"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            aria-describedby={ariaDescribedBy}
            className={panelClassName}
            style={panelStyle}
            initial={variants.panelInitial}
            animate={variants.panelAnimate}
            exit={variants.panelExit}
            transition={variants.panelTransition}
            onPointerDown={
              closeOnPanelClick
                ? (event) => {
                    if (event.currentTarget === event.target) {
                      onClose()
                    }
                  }
                : undefined
            }
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
