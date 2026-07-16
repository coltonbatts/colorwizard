'use client'

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { isDesktopApp } from '@/lib/desktop/detect'
import { listProjects, createProject, deleteProject, resolveTauriImageSrc, type ProjectInfo } from '@/lib/desktop/tauriClient'
import {
  DEFAULT_DESKTOP_WORKSPACE_PREFERENCES,
  type DesktopWorkspaceAccent,
  type DesktopWorkspaceDensity,
  type DesktopWorkspaceStartupBehavior,
  loadDesktopWorkspacePreferences,
  saveDesktopWorkspacePreference,
} from '@/lib/desktop/workspacePreferences'
import { usePaintPaletteStore } from '@/lib/store/usePaintPaletteStore'
import { useSessionStore } from '@/lib/store/useSessionStore'

const ACCENTS: Record<DesktopWorkspaceAccent, { label: string; value: string }> = {
  umber: { label: 'Raw umber', value: '#946746' },
  sage: { label: 'Studio sage', value: '#627963' },
  cobalt: { label: 'Cobalt ink', value: '#557393' },
}

function projectName() {
  return `Untitled study ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date())}`
}

function projectStamp(value?: string | null) {
  if (!value) return 'Saved recently'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Saved recently'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

function relativeTime(value?: string | null) {
  if (!value) return 'Recent'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recent'
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000))
  if (minutes < 60) return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (hours < 24) return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-hours, 'hour')
  const days = Math.round(hours / 24)
  if (days < 30) return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-days, 'day')
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

interface ProjectGalleryProps {
  onSelectProject: (id: number) => void
  onOpenImageNewProject?: () => Promise<void>
  lastOpenedProject?: ProjectInfo | null
  startupBehavior?: DesktopWorkspaceStartupBehavior
  onStartupBehaviorChange?: (behavior: DesktopWorkspaceStartupBehavior) => void
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
  const [loadingStatus, setLoadingStatus] = useState('Loading projects…')
  const [isCreating, setIsCreating] = useState(false)
  const [isOpeningImage, setIsOpeningImage] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const [accent, setAccent] = useState<DesktopWorkspaceAccent>(DEFAULT_DESKTOP_WORKSPACE_PREFERENCES.accent)
  const [density, setDensity] = useState<DesktopWorkspaceDensity>(DEFAULT_DESKTOP_WORKSPACE_PREFERENCES.density)
  const [showSettings, setShowSettings] = useState(DEFAULT_DESKTOP_WORKSPACE_PREFERENCES.showUtilityPanel)

  const savedPalettes = usePaintPaletteStore((state) => state.savedPalettes)
  const activePaletteId = usePaintPaletteStore((state) => state.activePaletteId)
  const selectedPaintIds = usePaintPaletteStore((state) => state.selectedPaintIds)
  const pinnedColors = useSessionStore((state) => state.pinnedColors)

  const featuredId = lastOpenedProject?.id ?? projects[0]?.id ?? null
  const sortedProjects = useMemo(() => {
    if (!featuredId) return projects
    return [...projects].sort((a, b) => a.id === featuredId ? -1 : b.id === featuredId ? 1 : 0)
  }, [featuredId, projects])

  const style = { '--project-signal': ACCENTS[accent].value } as CSSProperties

  const refresh = useCallback(async () => {
    if (isDesktopApp()) setProjects(await listProjects())
  }, [])

  useEffect(() => {
    if (!isDesktopApp()) { setLoading(false); return }
    let cancelled = false
    void (async () => {
      try {
        const prefs = await loadDesktopWorkspacePreferences().catch(() => DEFAULT_DESKTOP_WORKSPACE_PREFERENCES)
        if (cancelled) return
        setAccent(prefs.accent)
        setDensity(prefs.density)
        setShowSettings(prefs.showUtilityPanel)
        setLoadingStatus('Loading projects…')
        const result = await listProjects()
        if (!cancelled) setProjects(result)
      } catch (error) {
        if (!cancelled) setErrMsg(String(error))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const savePreference = <K extends 'accent' | 'density' | 'showUtilityPanel'>(key: K, value: Parameters<typeof saveDesktopWorkspacePreference<K>>[1]) => {
    void saveDesktopWorkspacePreference(key, value).catch((error) => console.error('[Tauri] Failed to save preference:', error))
  }

  const handleCreate = async () => {
    if (isCreating) return
    setIsCreating(true); setErrMsg('')
    try { onSelectProject((await createProject(projectName())).id) }
    catch (error) { setErrMsg(String(error)) }
    finally { setIsCreating(false) }
  }

  const handleOpenImage = async () => {
    if (!onOpenImageNewProject) return
    setIsOpeningImage(true); setErrMsg('')
    try { await onOpenImageNewProject(); await refresh() }
    catch (error) { setErrMsg(String(error)) }
    finally { setIsOpeningImage(false) }
  }

  const handleDelete = async (project: ProjectInfo) => {
    const { confirm } = await import('@tauri-apps/plugin-dialog')
    const approved = await confirm(`Delete “${project.name}”? This cannot be undone.`, { title: 'Delete project', kind: 'warning', okLabel: 'Delete', cancelLabel: 'Cancel' })
    if (!approved) return
    try { await deleteProject(project.id); await refresh() }
    catch (error) { setErrMsg(String(error)) }
  }

  if (!isDesktopApp()) return <div className="project-gallery-swiss fixed inset-0"><p>ColorWizard Pro</p></div>

  return (
    <div className="project-gallery-swiss" style={style}>
      <header className="project-gallery-header">
        <div><span className="project-gallery-mark" aria-hidden="true" /><strong>ColorWizard Pro</strong></div>
        <button type="button" onClick={() => { const next = !showSettings; setShowSettings(next); savePreference('showUtilityPanel', next) }}>Settings</button>
      </header>

      <main id="main-content" className="project-gallery-main">
        {errMsg && <div className="project-gallery-error" role="alert">{errMsg}</div>}

        <section className="project-new" aria-labelledby="project-new-heading">
          <header><span>New</span><h1 id="project-new-heading">Start a study</h1></header>
          <div>
            <button type="button" className="primary" onClick={() => void handleOpenImage()} disabled={!onOpenImageNewProject || isOpeningImage}>
              <span>Open reference</span><small>{isOpeningImage ? 'Opening…' : 'Choose an image'}</small>
            </button>
            <button type="button" onClick={() => void handleCreate()} disabled={isCreating}>
              <span>Blank study</span><small>{isCreating ? 'Creating…' : 'New canvas'}</small>
            </button>
          </div>
        </section>

        <div className="project-gallery-layout">
          <section className="project-recents" aria-labelledby="recent-heading">
            <header><h2 id="recent-heading">Recent</h2><span>{projects.length} {projects.length === 1 ? 'study' : 'studies'}</span></header>
            {loading ? (
              <div className="project-loading" role="status">{loadingStatus}</div>
            ) : sortedProjects.length === 0 ? (
              <div className="project-empty"><strong>No studies yet.</strong><span>Open a reference or create a blank study.</span></div>
            ) : (
              <div className={`project-grid ${density === 'compact' ? 'compact' : ''}`}>
                {sortedProjects.map((project) => {
                  const thumbnail = project.thumbnail ? resolveTauriImageSrc(project.thumbnail) : null
                  return (
                    <article key={project.id} className={project.id === featuredId ? 'featured' : ''}>
                      <button type="button" className="project-open" onClick={() => onSelectProject(project.id)}>
                        <div className="project-thumbnail">
                          {thumbnail ? <img src={thumbnail} alt="" width="640" height="400" /> : <span aria-hidden="true" />}
                        </div>
                        <div className="project-meta"><strong>{project.name}</strong><span>{relativeTime(project.modified_at)}</span></div>
                      </button>
                      <footer><span>{projectStamp(project.modified_at)}</span><button type="button" onClick={() => void handleDelete(project)}>Delete</button></footer>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <aside className="project-library-summary">
            <section>
              <header><h2>Pinned</h2><span>{pinnedColors.length}</span></header>
              <div className="project-pins">
                {pinnedColors.length ? pinnedColors.slice(0, 18).map((color) => <i key={color.id} style={{ backgroundColor: color.hex }} title={color.hex} />) : <p>No pinned colors.</p>}
              </div>
            </section>
            <section>
              <header><h2>Palettes</h2><span>{savedPalettes.length}</span></header>
              <div className="project-palettes">
                {savedPalettes.length ? savedPalettes.slice(0, 8).map((palette) => <span key={palette.id} className={palette.id === activePaletteId ? 'active' : ''}>{palette.name}</span>) : <p>No saved palettes.</p>}
              </div>
              <small>{selectedPaintIds.length} active paints</small>
            </section>
          </aside>
        </div>
      </main>

      {showSettings && (
        <div className="project-settings-layer">
          <button type="button" className="project-settings-backdrop" onClick={() => setShowSettings(false)} aria-label="Close settings" />
          <aside className="project-settings" aria-label="Studio settings">
            <header><h2>Settings</h2><button type="button" onClick={() => setShowSettings(false)}>Close</button></header>
            <fieldset>
              <legend>Signal color</legend>
              {Object.entries(ACCENTS).map(([key, theme]) => (
                <label key={key}><input type="radio" name="accent" value={key} checked={accent === key} onChange={() => { setAccent(key as DesktopWorkspaceAccent); savePreference('accent', key as DesktopWorkspaceAccent) }} /><i style={{ backgroundColor: theme.value }} />{theme.label}</label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Density</legend>
              {(['comfortable', 'compact'] as DesktopWorkspaceDensity[]).map((value) => <label key={value}><input type="radio" name="density" value={value} checked={density === value} onChange={() => { setDensity(value); savePreference('density', value) }} />{value === 'comfortable' ? 'Comfortable' : 'Compact'}</label>)}
            </fieldset>
            <fieldset>
              <legend>Startup</legend>
              {(['home', 'resume'] as DesktopWorkspaceStartupBehavior[]).map((value) => <label key={value}><input type="radio" name="startup" value={value} checked={startupBehavior === value} onChange={() => onStartupBehaviorChange?.(value)} />{value === 'home' ? 'Open studio' : 'Resume last study'}</label>)}
            </fieldset>
          </aside>
        </div>
      )}
    </div>
  )
}
