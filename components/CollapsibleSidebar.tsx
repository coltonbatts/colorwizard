'use client'

import { ReactNode } from 'react'

// New tab type matching the store
type TabType = 'sample' | 'oilmix' | 'palette' | 'matches' | 'advanced' | 'pinned' | 'cards' | 'library'

interface CollapsibleSidebarProps {
    collapsed: boolean
    onToggle: () => void
    children: ReactNode
    activeTab?: TabType
    onTabChange?: (tab: TabType) => void
    pinnedCount?: number
    width?: number
}

// Tab configuration with icons
const TABS: { id: TabType; label: string; tooltip: string; icon: JSX.Element }[] = [
    {
        id: 'sample',
        label: 'Sample',
        tooltip: 'Sample Color',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
            </svg>
        )
    },
    {
        id: 'oilmix',
        label: 'Mix',
        tooltip: 'Oil Mix Recipe',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2Z" />
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2Z" />
            </svg>
        )
    },
    {
        id: 'palette',
        label: 'Palette',
        tooltip: 'Your Palette',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
                <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
                <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
                <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
            </svg>
        )
    },
    {
        id: 'matches',
        label: 'Matches',
        tooltip: 'Thread Matches',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <circle cx="12" cy="12" r="3" />
            </svg>
        )
    },
    {
        id: 'advanced',
        label: 'Lab',
        tooltip: 'Advanced Tools',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
                <path d="M8.5 2h7" />
                <path d="M7 16h10" />
            </svg>
        )
    },
    {
        id: 'library',
        label: 'Library',
        tooltip: 'Paint Library',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
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
    width = 400
}: CollapsibleSidebarProps) {
    return (
        <div
            className={`
                relative flex flex-col h-full bg-white border-l border-gray-100 shadow-xl z-10
                sidebar-collapsible
                ${collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}
            `}
            style={{
                '--computed-sidebar-width': `${width}px`
            } as any}
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
                    {TABS.map((tab, index) => (
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

                    {/* Pinned */}
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

                    {/* Cards */}
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
