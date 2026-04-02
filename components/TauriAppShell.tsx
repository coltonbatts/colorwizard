/**
 * TauriAppShell - Desktop project management wrapper.
 *
 * Flow:
 * 1. In Tauri: init DB immediately, check for valid license key
 *    - No valid key: show LicenseActivation modal
 *    - Valid key: show ProjectGallery or app content
 * 2. In Browser: pass through children unchanged.
 *
 * Route guard: when running in Tauri, any non-root route (pricing, support,
 * dashboard, settings, trace, color-theory) is immediately redirected to `/`.
 * This ensures the dev server mirrors the desktop experience — no marketing
 * pages leak through.
 */
'use client'

import { useState, createContext, useContext, useMemo, useEffect, type ReactNode, type Dispatch, type SetStateAction } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { isTauri, getLicenseKey, getProject, initDatabase, type ProjectInfo } from '@/lib/tauri'
import ProjectGallery from '@/components/ProjectGallery'
import TauriPersistence from '@/components/TauriPersistence'
import LicenseActivation from '@/components/LicenseActivation'

/** Routes that exist on the web but should not be accessible inside the desktop app */
const DESKTOP_BLOCKED_ROUTES = new Set([
  '/pricing',
  '/support',
  '/dashboard',
  '/settings',
  '/trace',
  '/color-theory',
])

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

function DesktopProjectFrame({
  project,
  isLoading,
  onBackToProjects,
  children,
}: {
  project: ProjectInfo | null
  isLoading: boolean
  onBackToProjects: () => void
  children: ReactNode
}) {
  const modifiedAt = project?.modified_at
    ? new Date(project.modified_at).toLocaleString()
    : 'Just now'

  return (
    <div className="fixed inset-0 flex flex-col bg-[#f5f0e8] text-[#1a1a1a]">
      <header className="border-b border-[#ddd1c0] bg-[#f5f0e8]/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8f7f69]">ColorWizard Desktop</p>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="truncate font-serif text-2xl">{project?.name ?? 'Opening project...'}</h1>
              <span className="hidden text-xs text-[#8f7f69] md:inline">Last updated {modifiedAt}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onBackToProjects}
            className="rounded-full border border-[#c7baa5] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#6d5e49] transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
          >
            Projects
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-2xl border border-[#ddd1c0] bg-white px-8 py-6 text-center shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8f7f69]">Loading</p>
              <p className="mt-2 font-serif text-2xl text-[#1a1a1a]">{project?.name ?? 'Project workspace'}</p>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  )
}

export default function TauriAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
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
  const [activeProject, setActiveProject] = useState<ProjectInfo | null>(null)
  const [hydratedProjectId, setHydratedProjectId] = useState<number | null>(null)

  // Route guard: redirect blocked routes to / when in Tauri
  useEffect(() => {
    if (!isTauri()) return
    if (pathname && DESKTOP_BLOCKED_ROUTES.has(pathname)) {
      router.replace('/')
    }
  }, [pathname, router])

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
  const handleProjectReady = (projectId: number) => setHydratedProjectId(projectId)
  const handleBackToProjects = () => {
    setHydratedProjectId(null)
    setActiveProject(null)
    setActiveProjectId(null)
  }

  const contextValue = useMemo(
    () => ({ activeProjectId, setActiveProjectId }),
    [activeProjectId, setActiveProjectId],
  )

  useEffect(() => {
    if (!isTauri()) return

    try {
      if (activeProjectId === null) {
        localStorage.removeItem('colorwizard-last-project')
      } else {
        localStorage.setItem('colorwizard-last-project', String(activeProjectId))
      }
    } catch {
      // noop
    }
  }, [activeProjectId])

  useEffect(() => {
    if (!isTauri()) return

    if (activeProjectId === null) {
      setActiveProject(null)
      setHydratedProjectId(null)
      return
    }

    let cancelled = false
    setHydratedProjectId(null)

    getProject(activeProjectId)
      .then((project) => {
        if (cancelled) return
        setActiveProject(project)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[Tauri] Failed to load project info:', err)
        setActiveProject(null)
        setActiveProjectId(null)
      })

    return () => {
      cancelled = true
    }
  }, [activeProjectId])

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

  return (
    <ProjectContext.Provider value={contextValue}>
      {activeProjectId === null ? (
        <ProjectGallery onSelectProject={setActiveProjectId} />
      ) : (
        <>
          <TauriPersistence projectId={activeProjectId} onReady={handleProjectReady} />
          <DesktopProjectFrame
            project={activeProject}
            isLoading={hydratedProjectId !== activeProjectId}
            onBackToProjects={handleBackToProjects}
          >
            {children}
          </DesktopProjectFrame>
        </>
      )}
    </ProjectContext.Provider>
  )
}
