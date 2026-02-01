'use client'

import { ReactNode } from 'react'
import { useStore } from '@/lib/store/useStore'

// New tab type matching the store
// New tab type matching the store
type TabType = 'surface' | 'structure' | 'reference' | 'sample' | 'oilmix' | 'palette' | 'matches' | 'advanced' | 'pinned' | 'cards' | 'library'

// Tabs visible in simple mode (core functionality)
const SIMPLE_MODE_TABS: TabType[] = ['surface', 'structure', 'reference', 'sample', 'oilmix', 'matches', 'pinned']

interface CollapsibleSidebarProps {
    collapsed: boolean
    onToggle: () => void
    children: ReactNode
    activeTab?: TabType
    onTabChange?: (tab: TabType) => void
    pinnedCount?: number
    width?: number
    className?: string
}

// Tab configuration with icons
const TABS: { id: TabType; label: string; tooltip: string; icon: JSX.Element }[] = [
    {
        id: 'surface',
        label: 'Surface',
        tooltip: 'Surface / Canvas',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
            </svg>
        )
    },
    {
        id: 'structure',
        label: 'Structure',
        tooltip: 'Grid & Guides',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18" />
                <path d="M3 15h18" />
                <path d="M9 3v18" />
                <path d="M15 3v18" />
            </svg>
        )
    },
    {
        id: 'reference',
        label: 'Reference',
        tooltip: 'Reference Overlay',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
        )
    },
    {
        id: 'sample',
        label: 'Sample',
        tooltip: 'Sample Color',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
                <path d="M19 12c0 3.866-3.134 7-7 7" />
                <circle cx="12" cy="12" r="3" />
            </svg>
        )
    },
    {
        id: 'oilmix',
        label: 'Mix',
        tooltip: 'Oil Mix Recipe',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20" />
                <path d="m4.93 4.93 14.14 14.14" />
                <path d="m4.93 19.07 14.14-14.14" />
                <circle cx="12" cy="12" r="9" />
            </svg>
        )
    },
    {
        id: 'palette',
        label: 'Palette',
        tooltip: 'Your Palette',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.7 1.7-1.7h2c3 0 5.5-2.5 5.5-5.5C22 6 17.5 2 12 2z" />
            </svg>
        )
    },
    {
        id: 'matches',
        label: 'Threads',
        tooltip: 'DMC Floss Matches',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                {/* Needle */}
                <path d="M19.5 4.5 L6.5 17.5" strokeWidth="2" />
                <circle cx="20.5" cy="3.5" r="1.5" />
                {/* Thread */}
                <path d="M20.5 3.5 C22 2 23 4 21 6 C18 9 15 8 13 11 C11 14 12 17 9 19 C7 21 4 20 3 18" />
            </svg>
        )
    },
    {
        id: 'advanced',
        label: 'Lab',
        tooltip: 'Advanced Tools',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2" />
                <path d="M7 3v4" />
                <path d="M17 3v4" />
                <path d="M3 11h18" />
                <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
                <path d="M10 15h4" />
            </svg>
        )
    },
    {
        id: 'library',
        label: 'Library',
        tooltip: 'Paint Library',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M7 3v18" />
                <path d="M3 7h18" />
                <path d="M3 12h18" />
                <path d="M3 17h18" />
            </svg>
        )
    },
]

/**
 * Collapsible sidebar wrapper with icon bar and smooth transitions
 */
export default function CollapsibleSidebar({
    collapsed,
    onToggle,
    children,
    activeTab = 'sample',
    onTabChange,
    pinnedCount = 0,
    width = 400,
    className = ''
}: CollapsibleSidebarProps) {
    const { simpleMode } = useStore()

    // Filter tabs based on mode
    const visibleTabs = simpleMode
        ? TABS.filter(tab => SIMPLE_MODE_TABS.includes(tab.id))
        : TABS

    return (
        <div
            className={`
                relative flex flex-col h-full bg-white border-l border-gray-100 shadow-xl z-10
                sidebar-collapsible
                ${collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}
                ${className}
            `}
            style={{
                '--computed-sidebar-width': `${width}px`
            } as React.CSSProperties}
        >
            {/* Toggle Button */}
            <button
                onClick={onToggle}
                className="sidebar-toggle"
                title={collapsed ? 'Expand panel ([)' : 'Collapse panel (])'}
            >
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="currentColor"
                    style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }}
                >
                    <path d="M8 1L3 6l5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {/* Collapsed Icon Bar */}
            {collapsed && (
                <div className="sidebar-icon-bar pt-4">
                    {visibleTabs.map((tab, index) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                onTabChange?.(tab.id)
                                onToggle()
                            }}
                            className={`sidebar-icon-btn tooltip-wrapper ${activeTab === tab.id ? 'active' : ''}`}
                            data-tooltip={`${tab.tooltip} (${index + 1})`}
                        >
                            {tab.icon}
                        </button>
                    ))}

                    <div className="w-6 h-px bg-gray-200 my-2" />

                    {/* Pinned - only if not already in visible tabs */}
                    {!simpleMode && (
                        <button
                            onClick={() => {
                                onTabChange?.('pinned')
                                onToggle()
                            }}
                            className={`sidebar-icon-btn tooltip-wrapper relative ${activeTab === 'pinned' ? 'active' : ''}`}
                            data-tooltip={`Pinned Colors (${pinnedCount})`}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 17v5" />
                                <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4.76Z" />
                            </svg>
                            {pinnedCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                                    {pinnedCount > 9 ? '9+' : pinnedCount}
                                </span>
                            )}
                        </button>
                    )}

                    {/* Cards - only in Pro mode */}
                    {!simpleMode && (
                        <button
                            onClick={() => {
                                onTabChange?.('cards')
                                onToggle()
                            }}
                            className={`sidebar-icon-btn tooltip-wrapper ${activeTab === 'cards' ? 'active' : ''}`}
                            data-tooltip="Color Cards"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <path d="M3 9h18" />
                            </svg>
                        </button>
                    )}

                    <div className="w-6 h-px bg-gray-200 my-2" />

                    {/* Expand */}
                    <button
                        onClick={onToggle}
                        className="sidebar-icon-btn tooltip-wrapper"
                        data-tooltip="Expand Panel"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 3h6v6" />
                            <path d="M9 21H3v-6" />
                            <path d="M21 3 14 10" />
                            <path d="M3 21l7-7" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Full Sidebar Content */}
            <div className={`sidebar-content flex flex-col flex-1 min-h-0 overflow-hidden ${collapsed ? 'hidden' : ''}`}>
                {children}
            </div>
        </div>
    )
}

// Export TABS for use in other components
export { TABS, type TabType }
