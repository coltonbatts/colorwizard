/**
 * TauriAppShell - Desktop project management wrapper.
 * 
 * Flow:
 * 1. In Tauri: init DB immediately, check for valid license key
 *    - No valid key: show LicenseActivation modal
 *    - Valid key: show ProjectGallery or app content
 * 2. In Browser: pass through children unchanged.
 */
'use client'

import { useState, createContext, useContext, useMemo, useEffect, type ReactNode, type Dispatch, type SetStateAction } from 'react'
import { isTauri, getLicenseKey, initDatabase } from '@/lib/tauri'
import ProjectGallery from '@/components/ProjectGallery'
import TauriPersistence from '@/components/TauriPersistence'
import LicenseActivation from '@/components/LicenseActivation'

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

export default function TauriAppShell({ children }: { children: ReactNode }) {
  const [activeProjectId, setActiveProjectId] = useState<number | null>(() => {
    if (isTauri()) {
      try {
        const stored = localStorage.getItem('colorwizard-last-project')
        return stored ? parseInt(stored, 10) || null : null
      } catch {
        return null
      }
    }
    return null
  })

  const [licensed, setLicensed] = useState(!isTauri())
  const [dbReady, setDbReady] = useState(false)

  // Init DB immediately so ProjectGallery can create projects
  useEffect(() => {
    if (!isTauri()) {
      setDbReady(true)
      return
    }
    initDatabase().then(() => setDbReady(true)).catch(() => setDbReady(true))
  }, [])

  // Check license on mount
  useEffect(() => {
    if (!isTauri()) return
    getLicenseKey().then((key) => {
      setLicensed(key !== null)
    }).catch(() => setLicensed(false))
  }, [])

  const handleActivated = () => setLicensed(true)

  const contextValue = useMemo(
    () => ({ activeProjectId, setActiveProjectId }),
    [activeProjectId, setActiveProjectId]
  )

  // Browser: pass through
  if (!isTauri()) {
    return children
  }

  // No license yet: show activation modal
  if (!licensed) {
    return <LicenseActivation onActivated={handleActivated} />
  }

  // DB not ready yet: show nothing (brief flash)
  if (!dbReady) return null

  // Persist last project id
  if (activeProjectId !== null) {
    try {
      localStorage.setItem('colorwizard-last-project', String(activeProjectId))
    } catch { /* noop */ }
  }

  return (
    <ProjectContext.Provider value={contextValue}>
      {activeProjectId === null ? (
        <ProjectGallery onSelectProject={setActiveProjectId} />
      ) : (
        <>
          <TauriPersistence projectId={activeProjectId} />
          {children}
        </>
      )}
    </ProjectContext.Provider>
  )
}
