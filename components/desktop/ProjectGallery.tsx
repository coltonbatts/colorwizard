/**
 * Desktop start screen.
 * Local project commands first; no marketing homepage.
 */
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { isDesktopApp } from '@/lib/desktop/detect'
import {
  createProject,
  deleteProject,
  listProjects,
  resolveTauriImageSrc,
  type ProjectInfo,
} from '@/lib/desktop/tauriClient'
import {
  DEFAULT_DESKTOP_WORKSPACE_PREFERENCES,
  type DesktopWorkspaceStartupBehavior,
  loadDesktopWorkspacePreferences,
  saveDesktopWorkspacePreference,
} from '@/lib/desktop/workspacePreferences'

function makeDefaultProjectName(): string {
  const stamp = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `Untitled Project ${stamp}`
}

function formatProjectStamp(value?: string | null): string {
  if (!value) return 'Saved recently'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Saved recently'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getShortcutLabel(): string {
  if (typeof navigator === 'undefined') return 'Ctrl+O'
  return /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent) ? 'Cmd+O' : 'Ctrl+O'
}

interface ProjectGalleryProps {
  onSelectProject: (id: number) => void
  onOpenImageNewProject?: () => Promise<void>
  lastOpenedProject?: ProjectInfo | null
  startupBehavior?: DesktopWorkspaceStartupBehavior
  onStartupBehaviorChange?: (behavior: DesktopWorkspaceStartupBehavior) => void
}

function CommandButton({
  title,
  detail,
  onClick,
  disabled = false,
}: {
  title: string
  detail: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-[#d8cfc2] bg-white px-4 py-4 text-left shadow-sm transition-colors hover:border-[#1f1d1a] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="block text-sm font-semibold text-[#1f1d1a]">{title}</span>
      <span className="mt-1 block text-xs leading-relaxed text-[#6d6256]">{detail}</span>
    </button>
  )
}

export default function ProjectGallery({
  onSelectProject,
  onOpenImageNewProject,
  lastOpenedProject = null,
  startupBehavior = DEFAULT_DESKTOP_WORKSPACE_PREFERENCES.startupBehavior,
  onStartupBehaviorChange,
}: ProjectGalleryProps) {
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingStatus, setLoadingStatus] = useState('Loading local project library.')
  const [isCreating, setIsCreating] = useState(false)
  const [isOpeningImage, setIsOpeningImage] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const shortcutLabel = getShortcutLabel()

  const recentProjects = useMemo(() => {
    const byId = new Map<number, ProjectInfo>()
    if (lastOpenedProject) byId.set(lastOpenedProject.id, lastOpenedProject)
    for (const project of projects) byId.set(project.id, project)
    return Array.from(byId.values()).slice(0, 8)
  }, [lastOpenedProject, projects])

  const refreshProjects = useCallback(async () => {
    if (!isDesktopApp()) return
    const result = await listProjects()
    setProjects(result)
  }, [])

  useEffect(() => {
    if (!isDesktopApp()) {
      setLoading(false)
      return
    }

    let cancelled = false
    const loadLibrary = async () => {
      try {
        setLoadingStatus('Loading workspace preferences.')
        await loadDesktopWorkspacePreferences().catch((err) => {
          console.error('[Tauri] Failed to hydrate workspace preferences:', err)
          return DEFAULT_DESKTOP_WORKSPACE_PREFERENCES
        })

        if (cancelled) return
        setLoadingStatus('Loading recent projects.')
        const result = await listProjects()

        if (cancelled) return
        setProjects(result)
        setLoadingStatus('Local project library ready.')
      } catch (err) {
        if (cancelled) return
        console.error('[Tauri][Library] Failed to load library:', err)
        setErrMsg(String(err))
        setLoadingStatus('Could not load the local project library.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadLibrary()

    return () => {
      cancelled = true
    }
  }, [])

  const handleCreate = useCallback(async () => {
    if (isCreating) return

    setIsCreating(true)
    setErrMsg('')
    try {
      const result = await createProject(makeDefaultProjectName())
      onSelectProject(result.id)
    } catch (err: unknown) {
      setErrMsg(String(err))
    } finally {
      setIsCreating(false)
    }
  }, [isCreating, onSelectProject])

  const handleOpenImage = useCallback(async () => {
    if (!onOpenImageNewProject) return
    setIsOpeningImage(true)
    setErrMsg('')
    try {
      await onOpenImageNewProject()
      await refreshProjects()
    } catch (err: unknown) {
      setErrMsg(String(err))
    } finally {
      setIsOpeningImage(false)
    }
  }, [onOpenImageNewProject, refreshProjects])

  const handleDelete = useCallback(
    async (id: number, name: string) => {
      const { confirm } = await import('@tauri-apps/plugin-dialog')
      const shouldDelete = await confirm(`Delete "${name}"? This cannot be undone.`, {
        title: 'Delete Project',
        kind: 'warning',
        okLabel: 'Delete',
        cancelLabel: 'Cancel',
      })
      if (!shouldDelete) return
      try {
        await deleteProject(id)
        await refreshProjects()
      } catch (err) {
        setErrMsg(String(err))
      }
    },
    [refreshProjects],
  )

  const setStartupBehavior = useCallback(
    (behavior: DesktopWorkspaceStartupBehavior) => {
      onStartupBehaviorChange?.(behavior)
      saveDesktopWorkspacePreference('startupBehavior', behavior).catch((err) => {
        console.error('[Tauri] Failed to save startup behavior:', err)
      })
    },
    [onStartupBehaviorChange],
  )

  if (!isDesktopApp()) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#f5f0e8]">
        <p className="text-sm text-[#666]">ColorWizard</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#f4efe7] text-[#1f1d1a]">
      <main id="main-content" className="h-full overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 px-5 py-6 md:px-8 md:py-8">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#d8cfc2] pb-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#85796b]">
                Local-first desktop
              </p>
              <h1 className="mt-2 font-serif text-5xl leading-none text-[#1f1d1a] md:text-6xl">
                ColorWizard
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#5f564d]">
                Open a project, import a reference image, or start fresh. Your work stays in the local
                project library on this Mac.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 sm:items-end">
              <span className="rounded-full border border-[#cfc4b6] bg-white px-3 py-1.5 text-xs font-semibold text-[#5f564d]">
                {loading ? loadingStatus : 'Offline-ready'}
              </span>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="rounded-lg border border-[#d8cfc2] bg-white px-4 py-2 text-sm font-semibold text-[#1f1d1a] transition-colors hover:border-[#1f1d1a]"
              >
                Settings
              </button>
            </div>
          </header>

          {errMsg ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errMsg}
            </div>
          ) : null}

          <section className="grid gap-3 md:grid-cols-4" aria-label="Project commands">
            <CommandButton
              title={isCreating ? 'Creating...' : 'New Project'}
              detail="Create an empty local workspace."
              onClick={() => void handleCreate()}
              disabled={isCreating}
            />
            <CommandButton
              title="Open Project"
              detail={recentProjects.length > 0 ? 'Choose from recent projects below.' : 'No local projects yet.'}
              onClick={() => document.getElementById('recent-projects')?.scrollIntoView({ behavior: 'smooth' })}
            />
            <CommandButton
              title={isOpeningImage ? 'Importing...' : 'Import Image'}
              detail={`Pick a reference from disk. ${shortcutLabel}`}
              onClick={() => void handleOpenImage()}
              disabled={!onOpenImageNewProject || isOpeningImage}
            />
            <CommandButton
              title="Settings"
              detail="Startup behavior and local workspace preferences."
              onClick={() => setShowSettings(true)}
            />
          </section>

          <section id="recent-projects" className="grid gap-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#85796b]">
                  Recent Projects
                </p>
                <h2 className="mt-1 font-serif text-3xl text-[#1f1d1a]">Project Library</h2>
              </div>
              <p className="text-sm text-[#6d6256]">
                {projects.length} project{projects.length === 1 ? '' : 's'} stored locally
              </p>
            </div>

            {loading ? (
              <div className="rounded-lg border border-[#d8cfc2] bg-white px-5 py-8 text-sm text-[#5f564d]">
                {loadingStatus}
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#cfc4b6] bg-white/70 px-5 py-8">
                <h3 className="font-serif text-2xl text-[#1f1d1a]">No projects yet.</h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#6d6256]">
                  Start with a blank project or import a reference image to create your first local
                  ColorWizard workspace.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {recentProjects.map((project) => {
                  const thumbSrc = project.thumbnail ? resolveTauriImageSrc(project.thumbnail) : null

                  return (
                    <article
                      key={project.id}
                      className="overflow-hidden rounded-lg border border-[#d8cfc2] bg-white shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectProject(project.id)}
                        className="block w-full text-left"
                      >
                        <div className="aspect-[4/3] bg-[#e8dfd3]">
                          {thumbSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element -- Tauri file URLs are dynamic runtime assets
                            <img src={thumbSrc} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-[#e8dfd3]">
                              <span className="font-serif text-4xl text-[#8d8174]">C</span>
                            </div>
                          )}
                        </div>
                        <div className="px-4 py-4">
                          <h3 className="truncate font-serif text-2xl leading-none text-[#1f1d1a]">
                            {project.name}
                          </h3>
                          <p className="mt-2 text-xs text-[#6d6256]">{formatProjectStamp(project.modified_at)}</p>
                        </div>
                      </button>

                      <div className="flex items-center justify-between border-t border-[#ece3d7] px-4 py-3">
                        <button
                          type="button"
                          onClick={() => onSelectProject(project.id)}
                          className="text-sm font-semibold text-[#1f1d1a]"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(project.id, project.name)}
                          className="text-xs font-semibold text-[#8b4d42] hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {showSettings ? (
        <div className="absolute inset-0 z-30 bg-black/20">
          <button
            type="button"
            onClick={() => setShowSettings(false)}
            className="absolute inset-0"
            aria-label="Close settings"
          />

          <aside className="absolute right-0 top-0 z-10 h-full w-full max-w-sm overflow-y-auto border-l border-[#d8cfc2] bg-[#f8f4ee] p-6 shadow-[-20px_0_50px_rgba(31,29,26,0.12)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#85796b]">Settings</p>
                <h2 className="mt-1 font-serif text-3xl text-[#1f1d1a]">Startup</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="rounded-lg border border-[#d8cfc2] bg-white px-3 py-1.5 text-sm font-semibold text-[#1f1d1a]"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={() => setStartupBehavior('home')}
                className={`rounded-lg border px-4 py-3 text-left text-sm font-semibold ${
                  startupBehavior === 'home'
                    ? 'border-[#1f1d1a] bg-[#1f1d1a] text-white'
                    : 'border-[#d8cfc2] bg-white text-[#1f1d1a]'
                }`}
              >
                Open Project Library
              </button>
              <button
                type="button"
                onClick={() => setStartupBehavior('resume')}
                className={`rounded-lg border px-4 py-3 text-left text-sm font-semibold ${
                  startupBehavior === 'resume'
                    ? 'border-[#1f1d1a] bg-[#1f1d1a] text-white'
                    : 'border-[#d8cfc2] bg-white text-[#1f1d1a]'
                }`}
              >
                Resume Last Project
              </button>
            </div>

            <p className="mt-6 rounded-lg border border-[#d8cfc2] bg-white px-4 py-3 text-xs leading-relaxed text-[#6d6256]">
              Local data is stored through the desktop project database. The core workspace does not need
              a web account or cloud service to run.
            </p>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
