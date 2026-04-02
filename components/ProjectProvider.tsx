/**
 * ProjectProvider - Manages Tauri project state and persistence.
 * 
 * In Tauri: Shows ProjectGallery when no project is selected.
 *           When project is selected, wraps children with project context.
 *           Handles loading/saving data for the active project.
 * 
 * In Browser: Passes through children unchanged.
 */
'use client'

import { useState, createContext, useContext, type ReactNode, type Dispatch, type SetStateAction } from 'react'
import { isTauri } from '@/lib/tauri'
import ProjectGallery from '@/components/ProjectGallery'
import TauriPersistence from '@/components/TauriPersistence'

interface ProjectContextValue {
  activeProjectId: number | null
  setActiveProjectId: Dispatch<SetStateAction<number | null>>
}

export const ProjectContext = createContext<ProjectContextValue>({
  activeProjectId: null,
  setActiveProjectId: () => {},
})

export function useProject() {
  return useContext(ProjectContext)
}

export default function ProjectProvider({ children }: { children: ReactNode }) {
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null)

  // Browser: no project management needed
  if (!isTauri()) {
    return <>{children}</>
  }

  // No project selected: show gallery
  if (activeProjectId === null) {
    return (
      <ProjectContext.Provider value={{ activeProjectId, setActiveProjectId }}>
        <ProjectGallery onSelectProject={setActiveProjectId} />
      </ProjectContext.Provider>
    )
  }

  // Project active: show app + persistence
  return (
    <ProjectContext.Provider value={{ activeProjectId, setActiveProjectId }}>
      <TauriPersistence projectId={activeProjectId} />
      {children}
    </ProjectContext.Provider>
  )
}
