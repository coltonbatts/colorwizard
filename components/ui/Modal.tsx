'use client'

import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type RefObject,
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AnimatePresence, motion, useReducedMotion, type Easing, type Variants } from 'framer-motion'
import { createPortal } from 'react-dom'

type ModalSize = 'sm' | 'md' | 'lg'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  size?: ModalSize
  dismissible?: boolean
  role?: 'dialog' | 'alertdialog'
  ariaLabel?: string
  ariaLabelledBy?: string
  ariaDescribedBy?: string
  initialFocusRef?: RefObject<HTMLElement | null>
  className?: string
  panelClassName?: string
}

type ModalSlotProps = ComponentPropsWithoutRef<'div'>

interface ModalCloseProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label?: string
}

interface ModalContextValue {
  dismissible: boolean
  onClose: () => void
}

type OverlayStyles = {
  overflow: string
  paddingRight: string
  overscrollBehavior: string
}

const ModalContext = createContext<ModalContextValue | null>(null)

let scrollLockCount = 0
let originalBodyStyles: OverlayStyles | null = null
const modalStack: string[] = []

const ROOT_STYLE: CSSProperties = {
  backgroundColor: 'var(--overlay-backdrop)',
}

const PANEL_STYLE: CSSProperties = {
  backgroundColor: 'var(--paper)',
  color: 'var(--ink)',
  borderColor: 'var(--linen)',
  borderRadius: 'var(--radius-2xl)',
  boxShadow: 'var(--shadow-floating)',
}

const HEADER_STYLE: CSSProperties = {
  backgroundColor: 'var(--paper-elevated)',
  borderColor: 'var(--linen)',
}

const BODY_STYLE: CSSProperties = {
  backgroundColor: 'var(--paper)',
}

const FOOTER_STYLE: CSSProperties = {
  backgroundColor: 'var(--paper-elevated)',
  borderColor: 'var(--linen)',
}

const CLOSE_STYLE: CSSProperties = {
  backgroundColor: 'var(--paper-elevated)',
  borderColor: 'var(--linen)',
  color: 'var(--graphite)',
  boxShadow: 'var(--shadow-sm)',
  borderRadius: 'var(--radius-lg)',
  transitionDuration: 'var(--duration-fast)',
  transitionTimingFunction: 'var(--ease-out)',
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

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

function registerModal(id: string) {
  modalStack.push(id)
}

function unregisterModal(id: string) {
  const index = modalStack.lastIndexOf(id)
  if (index >= 0) {
    modalStack.splice(index, 1)
  }
}

function isTopModal(id: string) {
  return modalStack[modalStack.length - 1] === id
}

function parseSeconds(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return 0
  }

  if (trimmed.endsWith('ms')) {
    return Number.parseFloat(trimmed) / 1000
  }

  if (trimmed.endsWith('s')) {
    return Number.parseFloat(trimmed)
  }

  return Number.parseFloat(trimmed) / 1000
}

function parseNumber(value: string) {
  const parsed = Number.parseFloat(value.trim())
  return Number.isFinite(parsed) ? parsed : 0
}

function parseEase(value: string): Easing | undefined {
  const match = value.trim().match(/^cubic-bezier\(([^)]+)\)$/)
  if (!match) {
    return undefined
  }

  const points = match[1]
    .split(',')
    .map((point) => Number.parseFloat(point.trim()))

  if (points.length !== 4 || points.some((point) => !Number.isFinite(point))) {
    return undefined
  }

  return points as [number, number, number, number]
}

function getMotionTokens() {
  if (typeof document === 'undefined') {
    return null
  }

  const styles = getComputedStyle(document.documentElement)

  return {
    fadeDuration: parseSeconds(styles.getPropertyValue('--overlay-fade-duration')),
    stiffness: parseNumber(styles.getPropertyValue('--dialog-spring-stiffness')),
    damping: parseNumber(styles.getPropertyValue('--dialog-spring-damping')),
    ease: parseEase(styles.getPropertyValue('--ease-out')),
  }
}

function getDialogVariants(reducedMotion: boolean, motionTokens: ReturnType<typeof getMotionTokens>): Variants {
  if (reducedMotion || !motionTokens) {
    return {
      closed: { opacity: 0 },
      open: { opacity: 1 },
    }
  }

  return {
    closed: {
      opacity: 0,
      y: 8,
      scale: 0.99,
      transition: {
        duration: motionTokens.fadeDuration,
        ease: motionTokens.ease,
      },
    },
    open: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: motionTokens.stiffness,
        damping: motionTokens.damping,
      },
    },
  }
}

function getBackdropVariants(reducedMotion: boolean, motionTokens: ReturnType<typeof getMotionTokens>): Variants {
  if (reducedMotion || !motionTokens) {
    return {
      closed: { opacity: 0 },
      open: { opacity: 1 },
    }
  }

  return {
    closed: {
      opacity: 0,
      transition: {
        duration: motionTokens.fadeDuration,
        ease: motionTokens.ease,
      },
    },
    open: {
      opacity: 1,
      transition: {
        duration: motionTokens.fadeDuration,
        ease: motionTokens.ease,
      },
    },
  }
}

function ModalRoot({
  isOpen,
  onClose,
  children,
  size = 'md',
  dismissible = true,
  role = 'dialog',
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  initialFocusRef,
  className,
  panelClassName,
}: ModalProps) {
  const modalId = useId()
  const reducedMotion = useReducedMotion() ?? false
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const isOpenRef = useRef(isOpen)
  const [isMounted, setIsMounted] = useState(false)
  const motionTokens = useMemo(() => getMotionTokens(), [])
  const dialogVariants = useMemo(
    () => getDialogVariants(reducedMotion, motionTokens),
    [motionTokens, reducedMotion],
  )
  const backdropVariants = useMemo(
    () => getBackdropVariants(reducedMotion, motionTokens),
    [motionTokens, reducedMotion],
  )

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
    registerModal(modalId)
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null

    const focusFirstElement = () => {
      const panel = panelRef.current
      if (!panel) {
        return
      }

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
        if (!dismissible || !isTopModal(modalId)) {
          return
        }

        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !isTopModal(modalId)) {
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
      unregisterModal(modalId)
      unlockDocumentScroll()

      const previous = previouslyFocusedRef.current
      if (previous && document.contains(previous)) {
        previous.focus({ preventScroll: true })
      }
    }
  }, [dismissible, initialFocusRef, isMounted, modalId, onClose])

  if (typeof document === 'undefined' || (!isMounted && !isOpen)) {
    return null
  }

  return createPortal(
    <AnimatePresence
      onExitComplete={() => {
        if (!isOpenRef.current) {
          setIsMounted(false)
        }
      }}
    >
      {isOpen && (
        <div className={cx('fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6', className)}>
          <motion.div
            aria-hidden="true"
            className="absolute inset-0"
            style={ROOT_STYLE}
            initial="closed"
            animate="open"
            exit="closed"
            variants={backdropVariants}
            onPointerDown={dismissible ? onClose : undefined}
          />

          <ModalContext.Provider value={{ dismissible, onClose }}>
            <motion.div
              ref={panelRef}
              role={role}
              tabIndex={-1}
              aria-modal="true"
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledBy}
              aria-describedby={ariaDescribedBy}
              className={cx(
                'relative z-10 flex max-h-[calc(100dvh-var(--space-8))] min-h-0 w-full flex-col overflow-hidden border outline-none',
                sizeClasses[size],
                panelClassName,
              )}
              style={PANEL_STYLE}
              initial="closed"
              animate="open"
              exit="closed"
              variants={dialogVariants}
            >
              {children}
            </motion.div>
          </ModalContext.Provider>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function ModalHeader({ className, style, ...props }: ModalSlotProps) {
  return (
    <div
      className={cx('flex items-start justify-between gap-4 border-b px-6 py-5', className)}
      style={{ ...HEADER_STYLE, ...style }}
      {...props}
    />
  )
}

function ModalBody({ className, style, ...props }: ModalSlotProps) {
  return (
    <div
      className={cx('min-h-0 flex-1 overflow-y-auto px-6 py-5', className)}
      style={{ ...BODY_STYLE, ...style }}
      {...props}
    />
  )
}

function ModalFooter({ className, style, ...props }: ModalSlotProps) {
  return (
    <div
      className={cx('flex shrink-0 items-center justify-end gap-3 border-t px-6 py-4', className)}
      style={{ ...FOOTER_STYLE, ...style }}
      {...props}
    />
  )
}

function ModalClose({
  type = 'button',
  className,
  style,
  label = 'Close modal',
  onClick,
  ...props
}: ModalCloseProps) {
  const context = useContext(ModalContext)

  if (!context) {
    throw new Error('Modal.Close must be used inside Modal')
  }

  if (!context.dismissible) {
    return null
  }

  return (
    <button
      type={type}
      aria-label={label}
      className={cx(
        'inline-flex h-10 w-10 shrink-0 items-center justify-center border text-[1.4rem] leading-none transition-[background-color,border-color,color,box-shadow,transform] hover:translate-y-[-1px] hover:bg-[var(--paper-shell)] hover:text-ink hover:shadow-[var(--shadow-md)] active:translate-y-0',
        className,
      )}
      style={{ ...CLOSE_STYLE, ...style }}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          context.onClose()
        }
      }}
      {...props}
    >
      <span aria-hidden="true">×</span>
    </button>
  )
}

const Modal = Object.assign(ModalRoot, {
  Header: ModalHeader,
  Body: ModalBody,
  Footer: ModalFooter,
  Close: ModalClose,
})

export type { ModalProps, ModalSize }
export default Modal
