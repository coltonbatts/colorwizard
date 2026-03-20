'use client'

import { ReactNode } from 'react'

// Thin Core: Sample, matches, and deck tabs
type TabType = 'sample' | 'matches' | 'deck'

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

// Tab configuration with icons - Thin Core only
const TABS: { id: TabType; label: string; tooltip: string; icon: JSX.Element }[] = [
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
        id: 'deck',
        label: 'Deck',
        tooltip: 'Saved Card Deck',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="5" width="16" height="14" rx="3" />
                <path d="M7 9h10" />
                <path d="M7 13h6" />
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
    // Thin Core: Always show all tabs (sample + matches + deck)
    const visibleTabs = TABS

    return (
        <div
            className={`
                relative flex flex-col h-full bg-paper-elevated border-l border-ink-hairline z-10
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
                type="button"
                onClick={onToggle}
                className="sidebar-toggle"
                aria-label={`${collapsed ? 'Expand panel' : 'Collapse panel'}${pinnedCount ? `, ${pinnedCount} pinned colors` : ''}`}
                title={`${collapsed ? 'Expand panel ([)' : 'Collapse panel (])'}${pinnedCount ? ` · ${pinnedCount} pinned colors` : ''}`}
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
                            type="button"
                            key={tab.id}
                            onClick={() => {
                                onTabChange?.(tab.id)
                                onToggle()
                            }}
                            className={`sidebar-icon-btn tooltip-wrapper ${activeTab === tab.id ? 'active' : ''}`}
                            data-tooltip={`${tab.tooltip} (${index + 1})`}
                            aria-label={tab.tooltip}
                            aria-pressed={activeTab === tab.id}
                        >
                            {tab.icon}
                        </button>
                    ))}

                    <div className="w-6 h-px bg-ink-hairline my-2" />

                    {/* Expand */}
                    <button
                        type="button"
                        onClick={onToggle}
                        className="sidebar-icon-btn tooltip-wrapper"
                        data-tooltip="Expand Panel"
                        aria-label="Expand panel"
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
