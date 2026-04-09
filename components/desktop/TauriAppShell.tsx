/**
 * TauriAppShell - Desktop project management wrapper.
 *
 * Flow:
 * 1. In Tauri: init DB immediately, check for valid license key
 *    - DB init fails or times out (30s): error screen with Retry / Continue without saving
 *    - Continue without saving: offline banner; SQLite hydrate/save disabled
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
  useRef,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react'

/** When `persistenceDisabled` is true (offline DB), child `TauriPersistence` must skip SQLite IPC. */
export const DesktopPersistenceContext = createContext<{ persistenceDisabled: boolean }>({
  persistenceDisabled: false,
})
import { usePathname, useRouter } from 'next/navigation'
import { isDesktopApp } from '@/lib/desktop/detect'
import {
  createProject,
  getAppSetting,
  getLicenseKey,
  getProject,
  initDatabase,
  pickImagePath,
  setAppSetting,
  type ProjectInfo,
} from '@/lib/desktop/tauriClient'
import {
  DEFAULT_DESKTOP_WORKSPACE_PREFERENCES,
  type DesktopWorkspaceStartupBehavior,
  loadDesktopWorkspacePreferences,
  saveDesktopWorkspacePreference,
} from '@/lib/desktop/workspacePreferences'
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

const LAST_OPENED_PROJECT_KEY = 'last_opened_project'

function formatDatabaseInitError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string') return err
  return 'The local project database could not be opened.'
}

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
  status,
  children,
}: {
  project: ProjectInfo | null
  isLoading: boolean
  onBackToProjects: () => void
  status?: string
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
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8f7f69]">ColorWizard Pro</p>
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
            Studio
          </button>
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-2xl border border-[#ddd1c0] bg-white px-8 py-6 text-center shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8f7f69]">Loading</p>
              <p className="mt-2 font-serif text-2xl text-[#1a1a1a]">{project?.name ?? 'Project workspace'}</p>
              {status ? (
                <p className="mt-3 text-xs leading-relaxed text-[#7a6a59]">{status}</p>
              ) : null}
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

function DesktopDatabaseErrorScreen({
  message,
  onRetry,
  onContinueOffline,
}: {
  message: string
  onRetry: () => void
  onContinueOffline: () => void
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#efe7dc] p-6 text-[#1a1a1a]">
      <div className="w-full max-w-xl rounded-[30px] border border-[#c9a882] bg-white/90 px-8 py-8 shadow-[0_24px_60px_rgba(26,26,26,0.1)] backdrop-blur-xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8f5a3c]">ColorWizard Pro</p>
        <h1 className="mt-3 font-serif text-[clamp(1.8rem,4vw,2.6rem)] leading-tight tracking-[-0.03em] text-[#1a1a1a]">
          Local database unavailable
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#6a5a48]">
          Your studio needs the on-disk project library to save palettes, pins, and workspace state. You can try again or
          continue in memory — work will be lost when you quit.
        </p>
        {message ? (
          <p className="mt-5 rounded-2xl border border-[#e8d4c4] bg-[#fff8f3] px-4 py-3 font-mono text-xs leading-relaxed text-[#5c4030]">
            {message}
          </p>
        ) : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onContinueOffline}
            className="rounded-full border border-[#c7baa5] bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#6d5e49] transition-colors hover:border-[#8f5a3c] hover:text-[#1a1a1a]"
          >
            Continue without saving
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full border border-[#1a1a1a] bg-[#1a1a1a] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#f5f0e8] transition-colors hover:bg-[#2a2a2a]"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  )
}

function DesktopLocalDataOfflineBanner() {
  return (
    <div
      role="status"
      className="pointer-events-none fixed left-0 right-0 top-0 z-[100] border-b border-amber-200/80 bg-amber-50/95 px-4 py-2.5 text-center text-xs leading-snug text-amber-950 shadow-sm backdrop-blur-sm"
    >
      <span className="font-semibold">Local data is off.</span> Projects and workspace are not being saved to disk. Quitting
      the app will discard unsaved work. Free disk space, check permissions on the app data folder, or restart — then use
      Retry from the startup screen after relaunch.
    </div>
  )
}

function DesktopLaunchScreen({
  title,
  detail,
  status,
}: {
  title: string
  detail: string
  status?: string
}) {
  const [isSlow, setIsSlow] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setIsSlow(true), 3500)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#efe7dc] p-6 text-[#1a1a1a]">
      <div className="w-full max-w-xl rounded-[30px] border border-[#d7cab8] bg-white/84 px-8 py-8 shadow-[0_24px_60px_rgba(26,26,26,0.08)] backdrop-blur-xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8f7f69]">ColorWizard Pro</p>
        <h1 className="mt-3 font-serif text-[clamp(2.2rem,5vw,3.4rem)] leading-[0.95] tracking-[-0.04em] text-[#1a1a1a]">
          {title}
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#6a5a48]">{detail}</p>
        {status ? (
          <p className="mt-5 rounded-2xl border border-[#e5dbcf] bg-[#faf7f2] px-4 py-3 text-xs leading-relaxed text-[#7a6a59]">
            Current step: {status}
          </p>
        ) : null}
        {isSlow ? (
          <p className="mt-5 rounded-2xl border border-[#e5dbcf] bg-[#faf7f2] px-4 py-3 text-xs leading-relaxed text-[#7a6a59]">
            Startup is taking longer than expected. Check the console for [Tauri][Startup] logs if this
            does not move.
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default function TauriAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [hasMounted, setHasMounted] = useState(false)
  /** Desktop restores the last open project when possible; otherwise it falls back to the library. */
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null)
  const [seedReferencePath, setSeedReferencePath] = useState<string | null>(null)
  const [startupBehavior, setStartupBehavior] = useState<DesktopWorkspaceStartupBehavior>(
    DEFAULT_DESKTOP_WORKSPACE_PREFERENCES.startupBehavior,
  )
  const [lastOpenedProject, setLastOpenedProject] = useState<ProjectInfo | null>(null)

  const [licensed, setLicensed] = useState(!isDesktopApp())
  const [licenseResolved, setLicenseResolved] = useState(!isDesktopApp())
  const [dbPhase, setDbPhase] = useState<'loading' | 'ready' | 'error' | 'offline'>(() =>
    isDesktopApp() ? 'loading' : 'ready',
  )
  const [dbErrorDetail, setDbErrorDetail] = useState('')
  const [dbRetryTick, setDbRetryTick] = useState(0)
  const [launchResolved, setLaunchResolved] = useState(!isDesktopApp())
  const [activeProject, setActiveProject] = useState<ProjectInfo | null>(null)
  const [hydratedProjectId, setHydratedProjectId] = useState<number | null>(null)
  const [activationStatus, setActivationStatus] = useState('Verifying this copy before opening your studio.')
  const [databaseStatus, setDatabaseStatus] = useState('Opening the local project database.')
  const [workspaceStatus, setWorkspaceStatus] = useState('Loading workspace preferences.')
  const [projectStatus, setProjectStatus] = useState('Loading project workspace.')
  const mountedRef = useRef(true)
  const persistOfflineRef = useRef(false)
  const startupStartedAtRef = useRef(Date.now())

  const dbUnlocked = dbPhase === 'ready' || dbPhase === 'offline'

  const recordStartupStep = useCallback((phase: 'activation' | 'database' | 'workspace' | 'project', detail: string) => {
    const elapsedSeconds = ((Date.now() - startupStartedAtRef.current) / 1000).toFixed(1)
    const label =
      phase === 'activation'
        ? 'Checking activation'
        : phase === 'database'
          ? 'Preparing studio'
          : phase === 'workspace'
            ? 'Restoring workspace'
            : 'Opening project'
    console.info(`[Tauri][Startup +${elapsedSeconds}s] ${label}: ${detail}`)

    if (phase === 'activation') {
      setActivationStatus(detail)
      return
    }

    if (phase === 'database') {
      setDatabaseStatus(detail)
      return
    }

    if (phase === 'workspace') {
      setWorkspaceStatus(detail)
      return
    }

    setProjectStatus(detail)
  }, [])

  useEffect(() => {
    if (!isDesktopApp()) return
    if (pathname && DESKTOP_BLOCKED_ROUTES.has(pathname)) {
      router.replace('/')
    }
  }, [pathname, router])

  useEffect(() => {
    mountedRef.current = true
    setHasMounted(true)
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!isDesktopApp()) {
      setDbPhase('ready')
      return
    }

    let cancelled = false
    let initResolved = false
    recordStartupStep('database', 'Opening the local project database.')

    const longWaitTimer = window.setTimeout(() => {
      if (cancelled || initResolved || !mountedRef.current || persistOfflineRef.current) return
      console.warn('[Tauri][Startup] Database init still pending after 30s.')
      recordStartupStep('database', 'Still waiting for the local database.')
      setDbErrorDetail(
        'Still waiting after 30 seconds. The database file may be locked, storage may be full, or permissions may block the app data folder.',
      )
      setDbPhase('error')
    }, 30_000)

    initDatabase()
      .then(() => {
        if (cancelled || !mountedRef.current || persistOfflineRef.current) return
        initResolved = true
        window.clearTimeout(longWaitTimer)
        recordStartupStep('database', 'Local project database is ready.')
        setDbErrorDetail('')
        setDbPhase('ready')
      })
      .catch((err: unknown) => {
        if (cancelled || !mountedRef.current || persistOfflineRef.current) return
        initResolved = true
        window.clearTimeout(longWaitTimer)
        console.error('[Tauri] initDatabase failed:', err)
        recordStartupStep('database', 'Could not open the local project database.')
        setDbErrorDetail(formatDatabaseInitError(err))
        setDbPhase('error')
      })

    return () => {
      cancelled = true
      window.clearTimeout(longWaitTimer)
    }
  }, [dbRetryTick, recordStartupStep])

  const handleRetryDatabase = useCallback(() => {
    persistOfflineRef.current = false
    setDbPhase('loading')
    setDbErrorDetail('')
    setDbRetryTick((n) => n + 1)
  }, [])

  const handleContinueWithoutLocalData = useCallback(() => {
    persistOfflineRef.current = true
    recordStartupStep('database', 'Continuing without local database persistence.')
    setDbPhase('offline')
    setDbErrorDetail('')
  }, [recordStartupStep])

  useEffect(() => {
    if (!isDesktopApp()) return
    let settled = false
    recordStartupStep('activation', 'Verifying this copy before opening your studio.')
    const timer = window.setTimeout(() => {
      if (settled || !mountedRef.current) return
      console.warn('[Tauri][Startup] License lookup timed out; showing activation.')
      recordStartupStep('activation', 'Activation lookup is taking longer than expected.')
      setLicensed(false)
      setLicenseResolved(true)
    }, 2500)

    getLicenseKey()
      .then((key) => {
        settled = true
        window.clearTimeout(timer)
        if (!mountedRef.current) return
        recordStartupStep('activation', key ? 'Activation confirmed.' : 'No activation key found.')
        setLicensed(key !== null)
        setLicenseResolved(true)
      })
      .catch(() => {
        settled = true
        window.clearTimeout(timer)
        if (!mountedRef.current) return
        recordStartupStep('activation', 'Activation lookup failed; showing the unlock screen.')
        setLicensed(false)
        setLicenseResolved(true)
      })

    return () => {
      settled = true
      window.clearTimeout(timer)
    }
  }, [])

  const handleActivated = useCallback(() => {
    recordStartupStep('activation', 'Activation completed successfully.')
    setLicensed(true)
    setLicenseResolved(true)
  }, [recordStartupStep])
  const handleProjectReady = useCallback((projectId: number) => {
    setHydratedProjectId(projectId)
  }, [])
  const handleSeedConsumed = useCallback(() => setSeedReferencePath(null), [])
  const handleBackToProjects = () => {
    setHydratedProjectId(null)
    setActiveProject(null)
    setActiveProjectId(null)
  }

  const handleStartupBehaviorChange = useCallback((behavior: DesktopWorkspaceStartupBehavior) => {
    setStartupBehavior(behavior)
    saveDesktopWorkspacePreference('startupBehavior', behavior).catch((err) => {
      console.error('[Tauri] Failed to save startup behavior:', err)
    })
  }, [])

  const handleOpenImageNewProject = useCallback(async () => {
    recordStartupStep('project', 'Waiting for a reference image selection.')
    const path = await pickImagePath()
    if (!path) return
    const base =
      path.replace(/^.*[/\\]/, '').replace(/\.[^.]+$/, '') || 'Untitled'
    const created = await createProject(base)
    setSeedReferencePath(path)
    setActiveProjectId(created.id)
    recordStartupStep('project', `Created project "${base}".`)
  }, [recordStartupStep])

  const contextValue = useMemo(
    () => ({ activeProjectId, setActiveProjectId }),
    [activeProjectId, setActiveProjectId],
  )

  useEffect(() => {
    if (!isDesktopApp()) return
    if (activeProjectId === null) return
    let cancelled = false
    recordStartupStep('project', `Hydrating project ${activeProjectId}.`)
    setAppSetting(LAST_OPENED_PROJECT_KEY, String(activeProjectId)).catch((err) => {
      if (!cancelled) {
        console.error('[Tauri] Failed to persist last opened project:', err)
      }
    })
    return () => {
      cancelled = true
    }
  }, [activeProjectId])

  useEffect(() => {
    if (!isDesktopApp()) return
    if (!licensed || !dbUnlocked || launchResolved || activeProjectId !== null) return

    let cancelled = false
    recordStartupStep('workspace', 'Loading workspace preferences.')
    const timer = window.setTimeout(() => {
      if (cancelled) return
      console.warn('[Tauri][Startup] Launch restore timed out; opening studio home.')
      recordStartupStep('workspace', 'Last session restore is taking longer than expected.')
      setLastOpenedProject(null)
      setLaunchResolved(true)
    }, 2500)

    const resolveLaunchProject = async () => {
      const prefs = await loadDesktopWorkspacePreferences().catch((err) => {
        console.error('[Tauri] Failed to load workspace preferences:', err)
        return DEFAULT_DESKTOP_WORKSPACE_PREFERENCES
      })

      if (cancelled) return
      recordStartupStep('workspace', 'Workspace preferences loaded.')
      setStartupBehavior(prefs.startupBehavior)

      try {
        recordStartupStep('workspace', 'Reading the last opened project.')
        const raw = await getAppSetting(LAST_OPENED_PROJECT_KEY)
        const id = raw ? parseInt(raw, 10) : NaN

        if (!Number.isFinite(id) || id <= 0) {
          if (!cancelled) {
            window.clearTimeout(timer)
            recordStartupStep('workspace', 'No recent project found. Opening studio home.')
            setLastOpenedProject(null)
            setLaunchResolved(true)
          }
          return
        }

        recordStartupStep('workspace', `Opening project ${id}.`)
        const project = await getProject(id)
        if (cancelled) return

        window.clearTimeout(timer)
        setLastOpenedProject(project)
        if (prefs.startupBehavior === 'resume') {
          recordStartupStep('workspace', `Resuming "${project.name}".`)
          setActiveProject(project)
          setActiveProjectId(project.id)
        } else {
          recordStartupStep('workspace', 'Opening studio home.')
        }
        setLaunchResolved(true)
      } catch (err) {
        if (cancelled) return
        console.error('[Tauri] Failed to restore last opened project:', err)
        window.clearTimeout(timer)
        recordStartupStep('workspace', 'Could not restore the last session. Opening studio home.')
        setLastOpenedProject(null)
        setLaunchResolved(true)
        setAppSetting(LAST_OPENED_PROJECT_KEY, '').catch((clearErr) => {
          console.error('[Tauri] Failed to clear stale last opened project:', clearErr)
        })
      }
    }

    resolveLaunchProject()

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [activeProjectId, dbUnlocked, launchResolved, licensed])

  useEffect(() => {
    if (!isDesktopApp()) return

    if (activeProjectId === null) {
      setActiveProject(null)
      setHydratedProjectId(null)
      return
    }

    let cancelled = false
    recordStartupStep('project', `Loading project ${activeProjectId} into the workspace.`)
    setHydratedProjectId(null)

    getProject(activeProjectId)
      .then((project) => {
        if (cancelled) return
        setActiveProject(project)
        setLastOpenedProject(project)
        recordStartupStep('project', `Project "${project.name}" is ready.`)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[Tauri] Failed to load project info:', err)
        recordStartupStep('project', 'Project load failed. Returning to the studio home.')
        setActiveProject(null)
        setActiveProjectId(null)
      })

    return () => {
      cancelled = true
    }
  }, [activeProjectId])

  if (!hasMounted || !isDesktopApp()) {
    return children
  }

  if (!licenseResolved) {
    return (
      <DesktopLaunchScreen
        title="Checking activation…"
        detail="Verifying this copy before opening your studio."
        status={activationStatus}
      />
    )
  }
  if (!licensed) {
    return <LicenseActivation onActivated={handleActivated} />
  }

  if (dbPhase === 'loading') {
    return (
      <DesktopLaunchScreen
        title="Preparing studio…"
        detail="Getting your local project library ready."
        status={databaseStatus}
      />
    )
  }

  if (dbPhase === 'error') {
    return (
      <DesktopDatabaseErrorScreen
        message={dbErrorDetail}
        onRetry={handleRetryDatabase}
        onContinueOffline={handleContinueWithoutLocalData}
      />
    )
  }
  if (!launchResolved) {
    return (
      <DesktopLaunchScreen
        title="Restoring workspace…"
        detail="Loading your last session and workspace preferences."
        status={workspaceStatus}
      />
    )
  }

  const persistenceDisabled = dbPhase === 'offline'

  return (
    <DesktopPersistenceContext.Provider value={{ persistenceDisabled }}>
      {persistenceDisabled ? <DesktopLocalDataOfflineBanner /> : null}
      <ProjectContext.Provider value={contextValue}>
        {activeProjectId === null ? (
          <ProjectGallery
            onSelectProject={setActiveProjectId}
            onOpenImageNewProject={handleOpenImageNewProject}
            lastOpenedProject={lastOpenedProject}
            startupBehavior={startupBehavior}
            onStartupBehaviorChange={handleStartupBehaviorChange}
          />
        ) : (
          <>
            <TauriPersistence
              projectId={activeProjectId}
              onReady={handleProjectReady}
              seedReferenceAbsolutePath={seedReferencePath}
              onSeedReferenceConsumed={handleSeedConsumed}
              persistenceDisabled={persistenceDisabled}
            />
            <DesktopProjectFrame
              project={activeProject}
              isLoading={hydratedProjectId !== activeProjectId}
              status={projectStatus}
              onBackToProjects={handleBackToProjects}
            >
              {children}
            </DesktopProjectFrame>
          </>
        )}
      </ProjectContext.Provider>
    </DesktopPersistenceContext.Provider>
  )
}
