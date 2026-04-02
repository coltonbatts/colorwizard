/**
 * Project Layout - Wraps the app with project management for Tauri.
 * Shows the ProjectGallery when no project is selected.
 */
'use client'

import { useState, type ReactNode, type Dispatch, type SetStateAction, createContext, useContext } from 'react'
import { isTauri } from '@/lib/tauri'
import ProjectGallery from '@/components/ProjectGallery'

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

  // Only Tauri gets project management
  if (!isTauri()) {
    return <>{children}</>
  }

  // Show gallery when no project selected
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
