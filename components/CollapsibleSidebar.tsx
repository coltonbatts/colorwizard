'use client'

import { ReactNode } from 'react'

interface CollapsibleSidebarProps {
    collapsed: boolean
    onToggle: () => void
    children: ReactNode
    activeTab?: 'inspect' | 'shopping' | 'pinned' | 'stages'
    onTabChange?: (tab: 'inspect' | 'shopping' | 'pinned' | 'stages') => void
    pinnedCount?: number
    width?: number
}

/**
 * Collapsible sidebar wrapper with icon bar and smooth transitions
 */
export default function CollapsibleSidebar({
    collapsed,
    onToggle,
    children,
    activeTab = 'inspect',
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
                // On desktop, we use the specific width from the store. 
                // On mobile, the CSS !important overrides this to be 100% or 0.
                '--computed-sidebar-width': `${width}px`
            } as any}
        >
            {/* Toggle Button */}
            <button
                onClick={onToggle}
                className="sidebar-toggle"
                title={collapsed ? 'Expand panel (Ctrl+P)' : 'Collapse panel (Ctrl+P)'}
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
                    <button
                        onClick={() => {
                            onTabChange?.('inspect')
                            onToggle()
                        }}
                        className={`sidebar-icon-btn tooltip-wrapper ${activeTab === 'inspect' ? 'active' : ''}`}
                        data-tooltip="Inspect Color"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                    </button>
                    <button
                        onClick={() => {
                            onTabChange?.('shopping')
                            onToggle()
                        }}
                        className={`sidebar-icon-btn tooltip-wrapper ${activeTab === 'shopping' ? 'active' : ''}`}
                        data-tooltip="Shopping List"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                            <rect x="9" y="3" width="6" height="4" rx="1" />
                            <path d="M9 12h6" />
                            <path d="M9 16h6" />
                        </svg>
                    </button>
                    <button
                        onClick={() => {
                            onTabChange?.('stages')
                            onToggle()
                        }}
                        className={`sidebar-icon-btn tooltip-wrapper ${activeTab === 'stages' ? 'active' : ''}`}
                        data-tooltip="Breakdown Stages"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </button>
                    <button
                        onClick={() => {
                            onTabChange?.('pinned')
                            onToggle()
                        }}
                        className={`sidebar-icon-btn tooltip-wrapper ${activeTab === 'pinned' ? 'active' : ''}`}
                        data-tooltip={`Pinned Colors (${pinnedCount})`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2v8" />
                            <path d="m4.93 10.93 1.41 1.41" />
                            <path d="M2 18h2" />
                            <path d="M20 18h2" />
                            <path d="m19.07 10.93-1.41 1.41" />
                            <path d="M22 22H2" />
                            <path d="m16 6-4 4-4-4" />
                            <path d="M12 10v12" />
                        </svg>
                        {pinnedCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                                {pinnedCount > 9 ? '9+' : pinnedCount}
                            </span>
                        )}
                    </button>

                    <div className="w-6 h-px bg-gray-100 my-2" />

                    {/* Compact mode toggle in collapsed state */}
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
