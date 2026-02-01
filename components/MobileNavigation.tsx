'use client'

/**
 * MobileNavigation - Full-screen mobile drawer navigation
 * Provides hamburger menu access to all app tabs on mobile devices
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { TABS, TabType } from './CollapsibleSidebar'

interface MobileNavigationProps {
    activeTab: TabType
    onTabChange: (tab: TabType) => void
    pinnedCount?: number
    onOpenCanvasSettings?: () => void
    onOpenCalibration?: () => void
    showDashboard?: boolean
    onReturnToDashboard?: () => void
    hasImage?: boolean
}

export default function MobileNavigation({
    activeTab,
    onTabChange,
    pinnedCount = 0,
    onOpenCanvasSettings,
    onOpenCalibration,
    showDashboard = true,
    onReturnToDashboard,
    hasImage = false
}: MobileNavigationProps) {
    const [isOpen, setIsOpen] = useState(false)

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

    const handleReturnToDashboard = useCallback(() => {
        if (onReturnToDashboard) {
            onReturnToDashboard()
        }
        setIsOpen(false)
    }, [onReturnToDashboard])

    return (
        <>
            {/* Floating Hamburger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="mobile-nav-hamburger"
                aria-label="Open navigation menu"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M4 6h16" />
                    <path d="M4 12h16" />
                    <path d="M4 18h16" />
                </svg>
            </button>

            {/* Drawer + Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            className="mobile-nav-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Drawer */}
                        <motion.div
                            className="mobile-nav-drawer"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        >
                            {/* Header */}
                            <div className="mobile-nav-header">
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
                                {/* Dashboard Return - shown when browsing tabs */}
                                {hasImage && !showDashboard && (
                                    <div className="mobile-nav-section">
                                        <button
                                            onClick={handleReturnToDashboard}
                                            className="mobile-nav-item mobile-nav-dashboard-btn"
                                        >
                                            <span className="mobile-nav-icon">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="3" width="7" height="9" rx="1" />
                                                    <rect x="14" y="3" width="7" height="5" rx="1" />
                                                    <rect x="14" y="12" width="7" height="9" rx="1" />
                                                    <rect x="3" y="16" width="7" height="5" rx="1" />
                                                </svg>
                                            </span>
                                            <span className="mobile-nav-label">Dashboard</span>
                                            <span className="text-xs text-studio-dim ml-auto">← Back</span>
                                        </button>
                                    </div>
                                )}

                                {/* Main Tabs */}
                                <div className="mobile-nav-section">
                                    <span className="mobile-nav-section-label">Navigation</span>
                                    {TABS.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => handleTabSelect(tab.id)}
                                            className={`mobile-nav-item ${activeTab === tab.id && !showDashboard ? 'active' : ''}`}
                                        >
                                            <span className="mobile-nav-icon">{tab.icon}</span>
                                            <span className="mobile-nav-label">
                                                {tab.id === 'matches' ? 'Threads / DMC' : tab.label}
                                            </span>
                                            {activeTab === tab.id && !showDashboard && (
                                                <span className="mobile-nav-active-indicator" />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Secondary Tabs */}
                                <div className="mobile-nav-section">
                                    <span className="mobile-nav-section-label">Collections</span>
                                    <button
                                        onClick={() => handleTabSelect('pinned')}
                                        className={`mobile-nav-item ${activeTab === 'pinned' ? 'active' : ''}`}
                                    >
                                        <span className="mobile-nav-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M12 17v5" />
                                                <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4.76Z" />
                                            </svg>
                                        </span>
                                        <span className="mobile-nav-label">Pinned Colors</span>
                                        {pinnedCount > 0 && (
                                            <span className="mobile-nav-badge">{pinnedCount > 9 ? '9+' : pinnedCount}</span>
                                        )}
                                        {activeTab === 'pinned' && <span className="mobile-nav-active-indicator" />}
                                    </button>
                                    <button
                                        onClick={() => handleTabSelect('cards')}
                                        className={`mobile-nav-item ${activeTab === 'cards' ? 'active' : ''}`}
                                    >
                                        <span className="mobile-nav-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                <path d="M3 9h18" />
                                            </svg>
                                        </span>
                                        <span className="mobile-nav-label">Color Cards</span>
                                        {activeTab === 'cards' && <span className="mobile-nav-active-indicator" />}
                                    </button>
                                </div>

                                {/* AR Tracing */}
                                <div className="mobile-nav-section">
                                    <span className="mobile-nav-section-label">Tools</span>
                                    <Link
                                        href="/trace"
                                        className="mobile-nav-item"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <span className="mobile-nav-icon">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="1" />
                                                <path d="M12 2v6m0 4v6" />
                                                <path d="M2 12h6m4 0h6" />
                                            </svg>
                                        </span>
                                        <span className="mobile-nav-label">AR Trace</span>
                                    </Link>
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
