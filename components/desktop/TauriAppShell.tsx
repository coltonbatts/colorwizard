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
 * The main workbench lives at `/`; marketing-only web routes never appear in Pro.
 */
'use client'

import {
  useState,
  useCallback,
  createContext,
  useContext,
  useMemo,
  useEffect,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { isDesktopApp } from '@/lib/desktop/detect'
import {
  createProject,
  getLicenseKey,
  getProject,
  initDatabase,
  pickImagePath,
  type ProjectInfo,
} from '@/lib/desktop/tauriClient'
import DesktopWorkspaceEmpty from '@/components/desktop/DesktopWorkspaceEmpty'
import ProjectGallery from '@/components/desktop/ProjectGallery'
import TauriPersistence from '@/components/desktop/TauriPersistence'
import LicenseActivation from '@/components/desktop/LicenseActivation'

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

      <main className="relative min-h-0 flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-2xl border border-[#ddd1c0] bg-white px-8 py-6 text-center shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8f7f69]">Loading</p>
              <p className="mt-2 font-serif text-2xl text-[#1a1a1a]">{project?.name ?? 'Project workspace'}</p>
            </div>
          </div>
        ) : (
          <>
            {children}
            <DesktopWorkspaceEmpty />
          </>
        )}
      </main>
    </div>
  )
}

export default function TauriAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  /** Always start in the project library on launch (document-based app, not a landing page). */
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null)
  const [seedReferencePath, setSeedReferencePath] = useState<string | null>(null)
  const [resumeSession, setResumeSession] = useState<{ id: number; name: string } | null>(null)

  const [licensed, setLicensed] = useState(!isDesktopApp())
  const [dbReady, setDbReady] = useState(false)
  const [activeProject, setActiveProject] = useState<ProjectInfo | null>(null)
  const [hydratedProjectId, setHydratedProjectId] = useState<number | null>(null)

  useEffect(() => {
    if (!isDesktopApp()) return
    if (pathname && DESKTOP_BLOCKED_ROUTES.has(pathname)) {
      router.replace('/')
    }
  }, [pathname, router])

  useEffect(() => {
    if (!isDesktopApp()) {
      setDbReady(true)
      return
    }
    initDatabase().then(() => setDbReady(true)).catch(() => setDbReady(true))
  }, [])

  useEffect(() => {
    if (!isDesktopApp()) return
    getLicenseKey().then((key) => {
      setLicensed(key !== null)
    }).catch(() => setLicensed(false))
  }, [])

  const handleActivated = useCallback(() => setLicensed(true), [])
  const handleProjectReady = useCallback((projectId: number) => {
    setHydratedProjectId(projectId)
  }, [])
  const handleSeedConsumed = useCallback(() => setSeedReferencePath(null), [])
  const handleBackToProjects = () => {
    setHydratedProjectId(null)
    setActiveProject(null)
    setActiveProjectId(null)
  }

  const handleOpenImageNewProject = useCallback(async () => {
    const path = await pickImagePath()
    if (!path) return
    const base =
      path.replace(/^.*[/\\]/, '').replace(/\.[^.]+$/, '') || 'Untitled'
    const created = await createProject(base)
    setSeedReferencePath(path)
    setActiveProjectId(created.id)
  }, [])

  const contextValue = useMemo(
    () => ({ activeProjectId, setActiveProjectId }),
    [activeProjectId, setActiveProjectId],
  )

  useEffect(() => {
    if (!isDesktopApp()) return
    if (activeProjectId === null) return
    try {
      localStorage.setItem('colorwizard-last-project', String(activeProjectId))
    } catch {
      // noop
    }
  }, [activeProjectId])

  useEffect(() => {
    if (!isDesktopApp() || !dbReady || activeProjectId !== null) return
    let cancelled = false
    try {
      const raw = localStorage.getItem('colorwizard-last-project')
      const id = raw ? parseInt(raw, 10) : NaN
      if (!Number.isFinite(id) || id <= 0) {
        setResumeSession(null)
        return
      }
      getProject(id)
        .then((p) => {
          if (!cancelled) setResumeSession({ id: p.id, name: p.name })
        })
        .catch(() => {
          if (!cancelled) setResumeSession(null)
        })
    } catch {
      setResumeSession(null)
    }
    return () => {
      cancelled = true
    }
  }, [dbReady, activeProjectId])

  useEffect(() => {
    if (!isDesktopApp()) return

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

  if (!isDesktopApp()) {
    return children
  }

  if (!licensed) {
    return <LicenseActivation onActivated={handleActivated} />
  }

  if (!dbReady) return null

  return (
    <ProjectContext.Provider value={contextValue}>
      {activeProjectId === null ? (
        <ProjectGallery
          onSelectProject={setActiveProjectId}
          onOpenImageNewProject={handleOpenImageNewProject}
          resumeSession={resumeSession}
          onResumeSession={(id) => setActiveProjectId(id)}
        />
      ) : (
        <>
          <TauriPersistence
            projectId={activeProjectId}
            onReady={handleProjectReady}
            seedReferenceAbsolutePath={seedReferencePath}
            onSeedReferenceConsumed={handleSeedConsumed}
          />
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
