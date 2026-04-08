/**
 * Project library for ColorWizard Pro — default desktop entry (no web marketing).
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { isDesktopApp } from '@/lib/desktop/detect'
import {
  listProjects,
  createProject,
  deleteProject,
  resolveTauriImageSrc,
  type ProjectInfo,
} from '@/lib/desktop/tauriClient'

interface ProjectGalleryProps {
  onSelectProject: (id: number) => void
  /** When set, shows “Open image…” (Pro shell). Legacy callers may omit. */
  onOpenImageNewProject?: () => Promise<void>
  resumeSession?: { id: number; name: string } | null
  onResumeSession?: (id: number) => void
}

export default function ProjectGallery({
  onSelectProject,
  onOpenImageNewProject,
  resumeSession = null,
  onResumeSession,
}: ProjectGalleryProps) {
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [newProjectName, setNewProjectName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isOpeningImage, setIsOpeningImage] = useState(false)
  const [errMsg, setErrMsg] = useState('')

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
    listProjects()
      .then((result) => {
        setProjects(result)
        setLoading(false)
      })
      .catch((err) => {
        setErrMsg(String(err))
        setLoading(false)
      })
  }, [])

  const handleCreate = useCallback(async () => {
    const name = newProjectName.trim()
    if (!name || isCreating) return

    setIsCreating(true)
    setErrMsg('')
    try {
      const result = await createProject(name)
      if (result?.id) {
        onSelectProject(result.id)
      } else {
        setErrMsg('Created but no ID returned')
      }
    } catch (err: unknown) {
      setErrMsg(String(err))
    } finally {
      setIsCreating(false)
    }
  }, [newProjectName, isCreating, onSelectProject])

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
      if (!confirm(`Delete "${name}"?`)) return
      try {
        await deleteProject(id)
        await refreshProjects()
      } catch (err) {
        setErrMsg(String(err))
      }
    },
    [refreshProjects],
  )

  if (!isDesktopApp()) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#f5f0e8]">
        <p className="text-sm text-[#666]">Desktop only</p>
      </div>
    )
  }

  const showEmptyOnboarding = !loading && projects.length === 0

  return (
    <div className="fixed inset-0 flex flex-col bg-[#f5f0e8] text-[#1a1a1a]">
      <header className="border-b border-[#ddd1c0] px-6 py-4">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8f7f69]">ColorWizard Pro</p>
            <h1 className="mt-1 font-serif text-2xl sm:text-3xl">Projects</h1>
          </div>
          {resumeSession && onResumeSession ? (
            <button
              type="button"
              onClick={() => onResumeSession(resumeSession.id)}
              className="self-start rounded-full border border-[#c7baa5] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6d5e49] transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a] sm:self-auto"
            >
              Resume “{resumeSession.name}”
            </button>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-5xl">
          {errMsg ? <p className="mb-4 text-sm text-red-600">{errMsg}</p> : null}

          {showEmptyOnboarding ? (
            <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-[#ddd1c0] bg-white/80 px-8 py-12 text-center shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8f7f69]">Library</p>
              <p className="mt-3 font-serif text-xl text-[#1a1a1a]">No projects yet</p>
              <p className="mt-2 text-sm text-[#6d5e49]">
                {onOpenImageNewProject ? 'Create a project or open an image to begin.' : 'Create a project to begin.'}
              </p>
              <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
                {onOpenImageNewProject ? (
                  <button
                    type="button"
                    disabled={isOpeningImage}
                    onClick={handleOpenImage}
                    className="rounded-full bg-[#1a1a1a] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333] disabled:opacity-40"
                  >
                    {isOpeningImage ? 'Opening…' : 'Open image…'}
                  </button>
                ) : null}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="New project name"
                    className="min-w-0 flex-1 rounded-full border border-[#ddd1c0] bg-white px-4 py-3 text-sm text-[#1a1a1a] placeholder:text-[#a89880] focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/20"
                    disabled={isCreating}
                  />
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!newProjectName.trim() || isCreating}
                    className="shrink-0 rounded-full border border-[#1a1a1a] px-5 py-3 text-sm font-semibold text-[#1a1a1a] disabled:opacity-40"
                  >
                    {isCreating ? '…' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {!showEmptyOnboarding ? (
            <>
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="New project name"
                    className="w-full max-w-md rounded-full border border-[#ddd1c0] bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/20"
                    disabled={isCreating}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={!newProjectName.trim() || isCreating}
                      className="rounded-full bg-[#1a1a1a] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      {isCreating ? 'Creating…' : 'New project'}
                    </button>
                    {onOpenImageNewProject ? (
                      <button
                        type="button"
                        disabled={isOpeningImage}
                        onClick={handleOpenImage}
                        className="rounded-full border border-[#c7baa5] bg-white px-5 py-3 text-sm font-semibold text-[#1a1a1a] disabled:opacity-40"
                      >
                        {isOpeningImage ? 'Opening…' : 'Open image…'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#8f7f69]">Recent</h2>
              {loading ? (
                <p className="text-sm text-[#8f7f69]">Loading projects…</p>
              ) : (
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {projects.map((p) => {
                    const thumbSrc = p.thumbnail ? resolveTauriImageSrc(p.thumbnail) : null
                    return (
                      <li key={p.id}>
                        <div className="group relative w-full overflow-hidden rounded-xl border border-[#e5e0d8] bg-white text-left shadow-sm transition-colors hover:border-[#1a1a1a]">
                          <button
                            type="button"
                            onClick={() => onSelectProject(p.id)}
                            className="block w-full text-left"
                          >
                            <div className="relative aspect-video bg-[#ebe4da]">
                              {thumbSrc ? (
                                // Tauri asset URLs — avoid next/image remote patterns
                                // eslint-disable-next-line @next/next/no-img-element -- convertFileSrc URLs are not static imports
                                <img src={thumbSrc} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs text-[#a89880]">
                                  No preview
                                </div>
                              )}
                            </div>
                            <div className="p-3">
                              <p className="truncate font-medium text-[#1a1a1a]">{p.name}</p>
                              <p className="mt-1 text-[10px] text-[#8f7f69]">
                                {new Date(p.modified_at).toLocaleString()}
                              </p>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id, p.name)}
                            className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
