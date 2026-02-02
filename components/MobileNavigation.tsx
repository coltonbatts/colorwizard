'use client'

/**
 * MobileNavigation - Full-screen mobile drawer navigation
 * Provides hamburger menu access to all app tabs on mobile devices
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { TabType } from './CollapsibleSidebar'

interface MobileNavigationProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    activeTab: TabType
    onTabChange: (tab: TabType) => void
    onOpenCanvasSettings?: () => void
    onOpenCalibration?: () => void
}

export default function MobileNavigation({
    isOpen,
    onOpenChange,
    activeTab,
    onTabChange,
    onOpenCanvasSettings,
    onOpenCalibration,
}: MobileNavigationProps) {
    const setIsOpen = (open: boolean) => onOpenChange(open)

    // Close drawer on escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen])

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    const handleTabSelect = useCallback((tab: TabType) => {
        onTabChange(tab)
        setIsOpen(false)
    }, [onTabChange])

    const handleAction = useCallback((action: () => void) => {
        action()
        setIsOpen(false)
    }, [])

    return (
        <>
            {/* Drawer + Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            className="mobile-nav-backdrop backdrop-blur-md bg-paper/40"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Drawer */}
                        <motion.div
                            className="mobile-nav-drawer safe-area-bottom"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        >
                            {/* Header */}
                            <div className="mobile-nav-header safe-area-top">
                                <Link
                                    href="/"
                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <h2 className="text-xl font-bold text-studio">Color Wizard</h2>
                                </Link>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="mobile-nav-close"
                                    aria-label="Close navigation"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                        <path d="M18 6L6 18" />
                                        <path d="M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Navigation Items */}
                            <nav className="mobile-nav-items">
                                {/* Main Tabs - Thin Core: Pick Color & Match DMC */}
                                <div className="mobile-nav-section">
                                    <span className="mobile-nav-section-label">Pick a Color</span>
                                    <button
                                        onClick={() => handleTabSelect('sample')}
                                        className={`mobile-nav-item ${activeTab === 'sample' ? 'active' : ''}`}
                                    >
                                        <span className="mobile-nav-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="m12 19-7-7 7-7" />
                                                <path d="M19 12H5" />
                                                <path d="M19 12c0 3.866-3.134 7-7 7" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        </span>
                                        <span className="mobile-nav-label">Sample Color</span>
                                        {activeTab === 'sample' && (
                                            <span className="mobile-nav-active-indicator" />
                                        )}
                                    </button>
                                </div>

                                <div className="mobile-nav-section">
                                    <span className="mobile-nav-section-label">Match Your DMC Color</span>
                                    <button
                                        onClick={() => handleTabSelect('matches')}
                                        className={`mobile-nav-item ${activeTab === 'matches' ? 'active' : ''}`}
                                    >
                                        <span className="mobile-nav-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M19.5 4.5 L6.5 17.5" strokeWidth="2" />
                                                <circle cx="20.5" cy="3.5" r="1.5" />
                                                <path d="M20.5 3.5 C22 2 23 4 21 6 C18 9 15 8 13 11 C11 14 12 17 9 19 C7 21 4 20 3 18" />
                                            </svg>
                                        </span>
                                        <span className="mobile-nav-label">DMC Threads</span>
                                        {activeTab === 'matches' && (
                                            <span className="mobile-nav-active-indicator" />
                                        )}
                                    </button>
                                </div>

                                {/* Settings */}
                                <div className="mobile-nav-section">
                                    <span className="mobile-nav-section-label">Settings</span>
                                    {onOpenCanvasSettings && (
                                        <button
                                            onClick={() => handleAction(onOpenCanvasSettings)}
                                            className="mobile-nav-item"
                                        >
                                            <span className="mobile-nav-icon">🖼️</span>
                                            <span className="mobile-nav-label">Canvas Settings</span>
                                        </button>
                                    )}
                                    {onOpenCalibration && (
                                        <button
                                            onClick={() => handleAction(onOpenCalibration)}
                                            className="mobile-nav-item"
                                        >
                                            <span className="mobile-nav-icon">📐</span>
                                            <span className="mobile-nav-label">Calibration</span>
                                        </button>
                                    )}
                                </div>
                            </nav>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}
