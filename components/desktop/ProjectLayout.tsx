/**
 * Project Layout - Wraps the app with project management for Tauri.
 * Shows the ProjectGallery when no project is selected.
 */
'use client'

import { useState, type ReactNode, type Dispatch, type SetStateAction, createContext, useContext } from 'react'
import { isDesktopApp } from '@/lib/desktop/detect'
import ProjectGallery from '@/components/desktop/ProjectGallery'

interface ProjectContextValue {
  activeProjectId: number | null
  setActiveProjectId: Dispatch<SetStateAction<number | null>>
}

export const ProjectContext = createContext<ProjectContextValue>({
  activeProjectId: null,
  setActiveProjectId: () => {},
})

export function useProjectContext() {
  return useContext(ProjectContext)
}

interface ProjectLayoutProps {
  children: ReactNode
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null)

  if (!isDesktopApp()) {
    return <>{children}</>
  }

  if (activeProjectId === null) {
    return (
      <ProjectContext.Provider value={{ activeProjectId, setActiveProjectId }}>
        <ProjectGallery onSelectProject={(id: number) => setActiveProjectId(id)} />
      </ProjectContext.Provider>
    )
  }

  return (
    <ProjectContext.Provider value={{ activeProjectId, setActiveProjectId }}>
      {children}
    </ProjectContext.Provider>
  )
}
