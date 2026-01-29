/**
 * ResizableSidebar.tsx - Extracted resizable sidebar wrapper
 * Handles resize logic and sidebar rendering
 */

'use client'

import { useRef, useCallback, useEffect } from 'react'
import CollapsibleSidebar, { TabType } from '@/components/CollapsibleSidebar'

interface ResizableSidebarProps {
  collapsed: boolean
  onToggle: () => void
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  pinnedCount: number
  width: number
  onWidthChange: (width: number) => void
  children: React.ReactNode
  image: HTMLImageElement | null
}

export default function ResizableSidebar({
  collapsed,
  onToggle,
  activeTab,
  onTabChange,
  pinnedCount,
  width,
  onWidthChange,
  children,
  image,
}: ResizableSidebarProps) {
  const isResizing = useRef(false)

  const stopResizing = useCallback(() => {
    isResizing.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', stopResizing)
    document.body.style.cursor = 'default'
    document.body.style.userSelect = 'auto'
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return
    const newWidth = window.innerWidth - e.clientX
    if (newWidth >= 300 && newWidth <= 800) {
      onWidthChange(newWidth)
    }
  }, [onWidthChange])

  const startResizing = useCallback((e: React.MouseEvent) => {
    isResizing.current = true
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', stopResizing)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [handleMouseMove, stopResizing])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isResizing.current) {
        stopResizing()
      }
    }
  }, [stopResizing])

  // Only show when image exists
  if (!image) return null

  return (
    <>
      {/* Resize Handle */}
      {!collapsed && (
        <div
          onMouseDown={startResizing}
          className="w-1.5 hover:w-2 bg-transparent hover:bg-blue-500/20 cursor-col-resize transition-all z-20"
          title="Drag to resize"
        />
      )}

      {/* Sidebar */}
      <CollapsibleSidebar
        collapsed={collapsed}
        onToggle={onToggle}
        activeTab={activeTab}
        onTabChange={onTabChange}
        pinnedCount={pinnedCount}
        width={width}
      >
        {children}
      </CollapsibleSidebar>
    </>
  )
}
