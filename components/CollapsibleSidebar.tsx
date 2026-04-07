'use client'

import { ReactNode } from 'react'
import {
    DeckWorkbenchIcon,
    LibraryWorkbenchIcon,
    MixWorkbenchIcon,
    ReferenceWorkbenchIcon,
    SampleWorkbenchIcon,
    StructureWorkbenchIcon,
    SurfaceWorkbenchIcon,
    ThreadsWorkbenchIcon,
} from './workbenchIcons'

// Desktop workbench modes plus mobile-safe thin-core tabs.
type TabType =
    | 'sample'
    | 'matches'
    | 'mix'
    | 'library'
    | 'reference'
    | 'structure'
    | 'surface'
    | 'deck'

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

// Mobile tab configuration keeps the thin-core flow simple.
const TABS: { id: TabType; label: string; tooltip: string; icon: JSX.Element }[] = [
    {
        id: 'sample',
        label: 'Sample',
        tooltip: 'Sample Color',
        icon: <SampleWorkbenchIcon />
    },
    {
        id: 'matches',
        label: 'Threads',
        tooltip: 'DMC Floss Matches',
        icon: <ThreadsWorkbenchIcon />
    },
    {
        id: 'mix',
        label: 'Mix',
        tooltip: 'Color mixing workspace',
        icon: <MixWorkbenchIcon />
    },
    {
        id: 'library',
        label: 'Library',
        tooltip: 'Paint library',
        icon: <LibraryWorkbenchIcon />
    },
    {
        id: 'reference',
        label: 'Reference',
        tooltip: 'Reference image',
        icon: <ReferenceWorkbenchIcon />
    },
    {
        id: 'structure',
        label: 'Structure',
        tooltip: 'Grid and guides',
        icon: <StructureWorkbenchIcon />
    },
    {
        id: 'surface',
        label: 'Surface',
        tooltip: 'Painting surface',
        icon: <SurfaceWorkbenchIcon />
    },
    {
        id: 'deck',
        label: 'Deck',
        tooltip: 'Saved Card Deck',
        icon: <DeckWorkbenchIcon />
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
    // Collapsible sidebar stays generic. Desktop mode selection now lives in the workbench rail.
    const visibleTabs = TABS
    const safeWidth =
        typeof width === 'number' && Number.isFinite(width) && width > 0 ? width : 400

    return (
        <div
            className={`
                relative flex flex-col h-full bg-paper-elevated border-l border-ink-hairline z-10
                sidebar-collapsible
                ${collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}
                ${className}
            `}
            style={{
                '--computed-sidebar-width': `${safeWidth}px`
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
                    {visibleTabs.map((tab) => (
                        <button
                            type="button"
                            key={tab.id}
                            onClick={() => {
                                onTabChange?.(tab.id)
                                onToggle()
                            }}
                            className={`sidebar-icon-btn tooltip-wrapper ${activeTab === tab.id ? 'active' : ''}`}
                            data-tooltip={tab.tooltip}
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
