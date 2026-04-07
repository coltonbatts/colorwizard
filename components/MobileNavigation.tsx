'use client'

/**
 * MobileNavigation - Full-screen mobile drawer navigation
 * Provides hamburger menu access to all app tabs on mobile devices
 */

import Link from 'next/link'
import { TabType } from './CollapsibleSidebar'
import OverlaySurface from '@/components/ui/Overlay'
import {
    DeckWorkbenchIcon,
    SampleWorkbenchIcon,
    ThreadsWorkbenchIcon,
} from './workbenchIcons'

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

    const handleTabSelect = (tab: TabType) => {
        onTabChange(tab)
        setIsOpen(false)
    }

    const handleAction = (action: () => void) => {
        action()
        setIsOpen(false)
    }

    const CanvasSettingsIcon = () => (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M4 21v-7" />
            <path d="M4 10V3" />
            <path d="M12 21v-9" />
            <path d="M12 8V3" />
            <path d="M20 21v-5" />
            <path d="M20 12V3" />
            <path d="M2 14h4" />
            <path d="M10 10h4" />
            <path d="M18 14h4" />
        </svg>
    )

    const CalibrationIcon = () => (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M3 7h18" />
            <path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
            <rect x="4" y="7" width="16" height="13" rx="2" />
        </svg>
    )

    return (
        <OverlaySurface
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            preset="drawer"
            ariaLabel="Mobile navigation"
            rootClassName="fixed inset-0 z-[80]"
            backdropClassName="mobile-nav-backdrop"
            panelClassName="mobile-nav-drawer safe-area-bottom"
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
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="mobile-nav-close"
                    aria-label="Close navigation"
                >
                    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
                        type="button"
                        onClick={() => handleTabSelect('sample')}
                        className={`mobile-nav-item ${activeTab === 'sample' ? 'active' : ''}`}
                        aria-pressed={activeTab === 'sample'}
                    >
                        <span className="mobile-nav-icon">
                            <SampleWorkbenchIcon />
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
                        type="button"
                        onClick={() => handleTabSelect('matches')}
                        className={`mobile-nav-item ${activeTab === 'matches' ? 'active' : ''}`}
                        aria-pressed={activeTab === 'matches'}
                    >
                        <span className="mobile-nav-icon">
                            <ThreadsWorkbenchIcon />
                        </span>
                        <span className="mobile-nav-label">DMC Threads</span>
                        {activeTab === 'matches' && (
                            <span className="mobile-nav-active-indicator" />
                        )}
                    </button>
                </div>

                <div className="mobile-nav-section">
                    <span className="mobile-nav-section-label">Organize Saved Cards</span>
                    <button
                        type="button"
                        onClick={() => handleTabSelect('deck')}
                        className={`mobile-nav-item ${activeTab === 'deck' ? 'active' : ''}`}
                        aria-pressed={activeTab === 'deck'}
                    >
                        <span className="mobile-nav-icon">
                            <DeckWorkbenchIcon />
                        </span>
                        <span className="mobile-nav-label">Card Deck</span>
                        {activeTab === 'deck' && (
                            <span className="mobile-nav-active-indicator" />
                        )}
                    </button>
                </div>

                {/* Settings */}
                <div className="mobile-nav-section">
                    <span className="mobile-nav-section-label">Settings</span>
                    {onOpenCanvasSettings && (
                        <button
                            type="button"
                            onClick={() => handleAction(onOpenCanvasSettings)}
                            className="mobile-nav-item"
                        >
                            <span className="mobile-nav-icon">
                                <CanvasSettingsIcon />
                            </span>
                            <span className="mobile-nav-label">Canvas Settings</span>
                        </button>
                    )}
                    {onOpenCalibration && (
                        <button
                            type="button"
                            onClick={() => handleAction(onOpenCalibration)}
                            className="mobile-nav-item"
                        >
                            <span className="mobile-nav-icon">
                                <CalibrationIcon />
                            </span>
                            <span className="mobile-nav-label">Calibration</span>
                        </button>
                    )}
                </div>
            </nav>
        </OverlaySurface>
    )
}
