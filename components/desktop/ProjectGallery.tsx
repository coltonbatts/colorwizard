/**
 * Desktop studio home for ColorWizard Pro.
 * Quiet atelier launch surface for artists.
 */
'use client'

import { useState, useEffect, useCallback, useMemo, type CSSProperties } from 'react'
import { isDesktopApp } from '@/lib/desktop/detect'
import {
  listProjects,
  createProject,
  deleteProject,
  resolveTauriImageSrc,
  type ProjectInfo,
} from '@/lib/desktop/tauriClient'
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

const ACCENT_THEMES: Record<
  DesktopWorkspaceAccent,
  { label: string; accent: string; soft: string; strong: string; glow: string }
> = {
  umber: {
    label: 'Raw Umber',
    accent: '#946746',
    soft: 'rgba(148, 103, 70, 0.12)',
    strong: 'rgba(148, 103, 70, 0.22)',
    glow: 'rgba(148, 103, 70, 0.18)',
  },
  sage: {
    label: 'Studio Sage',
    accent: '#627963',
    soft: 'rgba(98, 121, 99, 0.12)',
    strong: 'rgba(98, 121, 99, 0.22)',
    glow: 'rgba(98, 121, 99, 0.18)',
  },
  cobalt: {
    label: 'Cobalt Ink',
    accent: '#557393',
    soft: 'rgba(85, 115, 147, 0.12)',
    strong: 'rgba(85, 115, 147, 0.22)',
    glow: 'rgba(85, 115, 147, 0.18)',
  },
}

function makeDefaultProjectName(): string {
  const stamp = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `Untitled Study ${stamp}`
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

function formatRelativeProjectTime(value?: string | null): string {
  if (!value) return 'Recently'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000))

  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.round(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  const diffWeeks = Math.round(diffDays / 7)
  if (diffWeeks < 5) return `${diffWeeks}w ago`

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getShortcutLabel(): string {
  if (typeof navigator === 'undefined') return 'Ctrl+O'
  return /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent) ? '⌘O' : 'Ctrl+O'
}

function SlidersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 21v-7" />
      <path d="M4 10V3" />
      <path d="M12 21v-9" />
      <path d="M12 8V3" />
      <path d="M20 21v-5" />
      <path d="M20 12V3" />
      <path d="M2 14h4" />
      <path d="M10 10h4" />
      <path d="M18 14h4" />
    </svg>
  )
}

function PlusSquareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="9" cy="9" r="1.5" />
      <path d="m21 15-4.2-4.2a1 1 0 0 0-1.4 0L7 19" />
    </svg>
  )
}

function ResumeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v6h6" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  )
}

function PreferenceChoice({
  active,
  label,
  onClick,
  swatch,
}: {
  active: boolean
  label: string
  onClick: () => void
  swatch?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm font-medium transition-colors ${
        active
          ? 'border-[#1b1712] bg-[#1b1712] text-white'
          : 'border-[#d9cebf] bg-white text-[#55493a] hover:border-[#b9a791]'
      }`}
    >
      {swatch ? <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: swatch }} aria-hidden="true" /> : null}
      <span>{label}</span>
    </button>
  )
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
  const [loadingStatus, setLoadingStatus] = useState('Loading workspace preferences.')
  const [isSlow, setIsSlow] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isOpeningImage, setIsOpeningImage] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const [accent, setAccent] = useState<DesktopWorkspaceAccent>(DEFAULT_DESKTOP_WORKSPACE_PREFERENCES.accent)
  const [density, setDensity] = useState<DesktopWorkspaceDensity>(DEFAULT_DESKTOP_WORKSPACE_PREFERENCES.density)
  const [showUtilityPanel, setShowUtilityPanel] = useState(
    DEFAULT_DESKTOP_WORKSPACE_PREFERENCES.showUtilityPanel,
  )

  const savedPaintPalettes = usePaintPaletteStore((state) => state.savedPalettes)
  const activePaintPaletteId = usePaintPaletteStore((state) => state.activePaletteId)
  const selectedPaintIds = usePaintPaletteStore((state) => state.selectedPaintIds)
  const pinnedColors = useSessionStore((state) => state.pinnedColors)
  const lastSampleTime = useSessionStore((state) => state.lastSampleTime)

  const activePaintPalette =
    savedPaintPalettes.find((palette) => palette.id === activePaintPaletteId) ?? null

  const accentTheme = ACCENT_THEMES[accent]
  const densitySpacing =
    density === 'compact'
      ? 'gap-5 px-4 py-5 md:px-6 md:py-6'
      : 'gap-7 px-4 py-6 md:px-8 md:py-8'
  const cardPadding = density === 'compact' ? 'p-5' : 'p-6'
  const shortcutLabel = getShortcutLabel()

  const shellStyle = useMemo(
    () =>
      ({
        '--workspace-accent': accentTheme.accent,
        '--workspace-accent-soft': accentTheme.soft,
        '--workspace-accent-strong': accentTheme.strong,
        '--workspace-accent-glow': accentTheme.glow,
      }) as CSSProperties,
    [accentTheme],
  )

  const featuredProject = useMemo(
    () => lastOpenedProject ?? projects[0] ?? null,
    [lastOpenedProject, projects],
  )

  const recentProjects = useMemo(() => {
    const filtered = featuredProject ? projects.filter((project) => project.id !== featuredProject.id) : projects
    return filtered.slice(0, density === 'compact' ? 4 : 6)
  }, [density, featuredProject, projects])

  const refreshProjects = useCallback(async () => {
    if (!isDesktopApp()) return
    const result = await listProjects()
    setProjects(result)
  }, [])

  const applyAccent = useCallback((nextAccent: DesktopWorkspaceAccent) => {
    setAccent(nextAccent)
    saveDesktopWorkspacePreference('accent', nextAccent).catch((err) => {
      console.error('[Tauri] Failed to save workspace accent:', err)
    })
  }, [])

  const applyDensity = useCallback((nextDensity: DesktopWorkspaceDensity) => {
    setDensity(nextDensity)
    saveDesktopWorkspacePreference('density', nextDensity).catch((err) => {
      console.error('[Tauri] Failed to save workspace density:', err)
    })
  }, [])

  const applyUtilityPanel = useCallback((nextValue: boolean) => {
    setShowUtilityPanel(nextValue)
    saveDesktopWorkspacePreference('showUtilityPanel', nextValue).catch((err) => {
      console.error('[Tauri] Failed to save utility panel preference:', err)
    })
  }, [])

  useEffect(() => {
    if (!loading) {
      setIsSlow(false)
      return
    }

    const timer = window.setTimeout(() => {
      setIsSlow(true)
    }, 3500)

    return () => window.clearTimeout(timer)
  }, [loading])

  useEffect(() => {
    if (!isDesktopApp()) {
      setLoading(false)
      return
    }

    let cancelled = false
    const loadLibrary = async () => {
      try {
        console.info('[Tauri][Library] Loading workspace preferences.')
        setLoadingStatus('Loading workspace preferences.')
        const prefs = await loadDesktopWorkspacePreferences().catch((err) => {
          console.error('[Tauri] Failed to hydrate workspace preferences:', err)
          return DEFAULT_DESKTOP_WORKSPACE_PREFERENCES
        })

        if (cancelled) return
        setAccent(prefs.accent)
        setDensity(prefs.density)
        setShowUtilityPanel(prefs.showUtilityPanel)

        console.info('[Tauri][Library] Loading project list.')
        setLoadingStatus('Loading project list.')
        const result = await listProjects()

        if (cancelled) return
        console.info(`[Tauri][Library] Loaded ${result.length} projects.`)
        setProjects(result)
        setLoadingStatus('Your studio is ready.')
        setLoading(false)
      } catch (err) {
        if (cancelled) return
        console.error('[Tauri][Library] Failed to load library:', err)
        setErrMsg(String(err))
        setLoadingStatus('Could not load the studio.')
        setLoading(false)
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

  if (!isDesktopApp()) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#f5f0e8]">
        <p className="text-sm text-[#666]">ColorWizard Pro</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#ece3d6] text-[#1b1712]" style={shellStyle}>
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          backgroundImage: `
            radial-gradient(circle at top left, rgba(255,255,255,0.74), transparent 24%),
            radial-gradient(circle at top right, var(--workspace-accent-glow), transparent 30%),
            radial-gradient(circle at bottom right, rgba(255,255,255,0.45), transparent 22%),
            linear-gradient(to right, rgba(92,76,58,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(92,76,58,0.035) 1px, transparent 1px)
          `,
          backgroundSize: 'auto, auto, auto, 32px 32px, 32px 32px',
        }}
        aria-hidden="true"
      />

      <main id="main-content" className="relative h-full overflow-y-auto">
        <div className={`mx-auto flex min-h-full w-full max-w-[1500px] flex-col ${densitySpacing}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#8f7f69]">ColorWizard Pro</p>
              <h1 className="mt-3 font-serif text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.9] tracking-tight text-[#1b1712]">
                Studio
              </h1>
            </div>

            <button
              type="button"
              onClick={() => applyUtilityPanel(!showUtilityPanel)}
              className="inline-flex items-center gap-2 rounded-full border border-[#d7cab8] bg-white/82 px-4 py-2.5 text-sm font-medium text-[#55493a] shadow-[0_10px_26px_rgba(27,23,18,0.05)] transition-colors hover:border-[#b9a791] hover:bg-white"
            >
              <SlidersIcon />
              Studio settings
            </button>
          </div>

          {errMsg ? (
            <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errMsg}
            </div>
          ) : null}

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
            <article className="overflow-hidden rounded-[34px] border border-[#d7cab8] bg-white/76 shadow-[0_24px_60px_rgba(27,23,18,0.08)] backdrop-blur-xl">
              <div className="relative aspect-[16/11] overflow-hidden bg-[#ddd0be]">
                {featuredProject?.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Tauri file URLs are dynamic runtime assets
                  <img
                    src={resolveTauriImageSrc(featuredProject.thumbnail) ?? ''}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="h-full w-full"
                    style={{
                      backgroundImage: `
                        radial-gradient(circle at 20% 18%, rgba(255,255,255,0.56), transparent 20%),
                        radial-gradient(circle at 78% 24%, rgba(148,103,70,0.18), transparent 24%),
                        radial-gradient(circle at 68% 72%, rgba(98,121,99,0.16), transparent 28%),
                        linear-gradient(135deg, #eadfce 0%, #d5c5ae 100%)
                      `,
                    }}
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-[#19130dcc] via-[#19130d26] to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                  <div className="max-w-3xl">
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/70">
                      {featuredProject ? 'Continue where you left off' : 'Start with something visual'}
                    </p>
                    <h2 className="mt-3 font-serif text-[clamp(2.2rem,4.3vw,4.2rem)] leading-[0.92] tracking-tight text-white">
                      {featuredProject ? featuredProject.name : 'Open a reference and begin.'}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/78 md:text-[15px]">
                      {featuredProject
                        ? `Last touched ${formatProjectStamp(featuredProject.modified_at)}.`
                        : 'Bring in an image or start a blank study. The first move should feel immediate.'}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {featuredProject ? (
                      <button
                        type="button"
                        onClick={() => onSelectProject(featuredProject.id)}
                        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#1b1712] transition-transform hover:-translate-y-0.5"
                      >
                        <ResumeIcon />
                        Continue study
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void handleOpenImage()}
                      disabled={!onOpenImageNewProject || isOpeningImage}
                      className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/14 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ImageIcon />
                      {isOpeningImage ? 'Opening image...' : 'Open reference'}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleCreate()}
                      disabled={isCreating}
                      className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/15 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-black/22 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <PlusSquareIcon />
                      {isCreating ? 'Creating study...' : 'New blank study'}
                    </button>
                  </div>
                </div>
              </div>
            </article>

            <div className="grid gap-4">
              <div className={`rounded-[30px] border border-[#d7cab8] bg-[#faf6f0]/88 ${cardPadding} shadow-[0_18px_46px_rgba(27,23,18,0.06)]`}>
                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#8f7f69]">Start here</p>
                <div className="mt-4 grid gap-3">
                  <button
                    type="button"
                    onClick={() => void handleOpenImage()}
                    disabled={!onOpenImageNewProject || isOpeningImage}
                    className="group rounded-[24px] border border-[#d9cebf] bg-white px-4 py-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#b9a791] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-white"
                          style={{ backgroundColor: accentTheme.accent }}
                        >
                          <ImageIcon />
                        </span>
                        <div>
                          <p className="text-base font-semibold text-[#1b1712]">Open reference</p>
                          <p className="text-xs text-[#7a6a59]">{shortcutLabel}</p>
                        </div>
                      </div>
                      <span className="text-[#7a6a59] transition-transform group-hover:translate-x-0.5">
                        <ArrowIcon />
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleCreate()}
                    disabled={isCreating}
                    className="group rounded-[24px] border border-[#d9cebf] bg-white px-4 py-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#b9a791] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1b1712] text-white">
                          <PlusSquareIcon />
                        </span>
                        <div>
                          <p className="text-base font-semibold text-[#1b1712]">Blank study</p>
                          <p className="text-xs text-[#7a6a59]">Fresh canvas</p>
                        </div>
                      </div>
                      <span className="text-[#7a6a59] transition-transform group-hover:translate-x-0.5">
                        <ArrowIcon />
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              <div className={`rounded-[30px] border border-[#d7cab8] bg-white/82 ${cardPadding} shadow-[0_18px_46px_rgba(27,23,18,0.05)]`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#8f7f69]">Within reach</p>
                    <p className="mt-2 text-lg font-semibold text-[#1b1712]">
                      {activePaintPalette ? activePaintPalette.name : 'Your palette shelf'}
                    </p>
                  </div>
                  <span
                    className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                    style={{ borderColor: accentTheme.strong, backgroundColor: accentTheme.soft, color: accentTheme.accent }}
                  >
                    {savedPaintPalettes.length} palette{savedPaintPalettes.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {pinnedColors.length > 0 ? (
                    pinnedColors.slice(0, 12).map((color) => (
                      <span
                        key={color.id}
                        className="h-9 w-9 rounded-full border border-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.48)]"
                        style={{ backgroundColor: color.hex }}
                        title={color.hex}
                        aria-label={color.hex}
                      />
                    ))
                  ) : (
                    <span className="rounded-full border border-dashed border-[#d7cab8] px-3 py-1.5 text-xs text-[#8f7f69]">
                      Pinned colors will collect here.
                    </span>
                  )}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-[#e8dfd3] bg-[#faf7f2] px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8f7f69]">Active paints</p>
                    <p className="mt-2 text-xl font-semibold text-[#1b1712]">{selectedPaintIds.length}</p>
                  </div>
                  <div className="rounded-[22px] border border-[#e8dfd3] bg-[#faf7f2] px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8f7f69]">Last sample</p>
                    <p className="mt-2 text-sm font-semibold text-[#1b1712]">
                      {lastSampleTime > 0
                        ? formatRelativeProjectTime(new Date(lastSampleTime).toISOString())
                        : 'None yet'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#8f7f69]">Recent studies</p>
                <h2 className="mt-2 font-serif text-3xl text-[#1b1712]">Pick up a thread</h2>
              </div>
              <p className="text-sm text-[#6a5a48]">
                {projects.length > 0
                  ? `${projects.length} stud${projects.length === 1 ? 'y' : 'ies'} in the room.`
                  : 'The wall stays quiet until you start.'}
              </p>
            </div>

            {loading ? (
              <div className="mt-5 rounded-[30px] border border-[#d7cab8] bg-white/68 px-5 py-10 text-sm text-[#8f7f69]">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8f7f69]">Loading</p>
                <p className="mt-2 text-sm font-semibold text-[#1b1712]">{loadingStatus}</p>
                {isSlow ? (
                  <p className="mt-4 rounded-2xl border border-[#e5dbcf] bg-[#faf7f2] px-4 py-3 text-xs leading-relaxed text-[#7a6a59]">
                    Still waiting. Check the console for [Tauri][Library] logs if this does not move.
                  </p>
                ) : null}
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="mt-5 rounded-[30px] border border-dashed border-[#d7cab8] bg-white/72 px-6 py-10 shadow-[0_18px_38px_rgba(27,23,18,0.05)]">
                <h3 className="font-serif text-2xl text-[#1b1712]">
                  {projects.length === 0 ? 'No studies yet.' : 'Your featured study is waiting above.'}
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#6a5a48]">
                  {projects.length === 0
                    ? 'Open a reference or start blank. The rest of the room will fill itself in naturally.'
                    : 'As you work, more studies will gather here for quick returns.'}
                </p>
              </div>
            ) : (
              <div className={`mt-5 grid ${density === 'compact' ? 'gap-3 xl:grid-cols-4' : 'gap-4 xl:grid-cols-3'} md:grid-cols-2`}>
                {recentProjects.map((project) => {
                  const thumbSrc = project.thumbnail ? resolveTauriImageSrc(project.thumbnail) : null

                  return (
                    <article
                      key={project.id}
                      className="group overflow-hidden rounded-[28px] border border-[#d7cab8] bg-white/88 shadow-[0_18px_42px_rgba(27,23,18,0.06)] transition-all hover:-translate-y-1 hover:border-[#b9a791] hover:shadow-[0_24px_52px_rgba(27,23,18,0.10)]"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectProject(project.id)}
                        className="block w-full text-left"
                      >
                        <div className="relative aspect-[16/10] overflow-hidden bg-[#e8dfd3]">
                          {thumbSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element -- Tauri file URLs are dynamic runtime assets
                            <img
                              src={thumbSrc}
                              alt=""
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            />
                          ) : (
                            <div
                              className="h-full w-full"
                              style={{
                                backgroundImage: `
                                  radial-gradient(circle at 22% 24%, rgba(255,255,255,0.56), transparent 18%),
                                  radial-gradient(circle at 72% 22%, rgba(148,103,70,0.14), transparent 22%),
                                  linear-gradient(135deg, #eadfce 0%, #d8c8b3 100%)
                                `,
                              }}
                            />
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-transparent" />
                          <div className="absolute right-4 top-4">
                            <span className="rounded-full border border-white/40 bg-white/16 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                              {formatRelativeProjectTime(project.modified_at)}
                            </span>
                          </div>
                        </div>

                        <div className="p-5">
                          <h3 className="truncate font-serif text-[1.65rem] leading-none text-[#1b1712]">
                            {project.name}
                          </h3>
                          <p className="mt-3 text-sm text-[#6a5a48]">{formatProjectStamp(project.modified_at)}</p>
                        </div>
                      </button>

                      <div className="flex items-center justify-between border-t border-[#ece3d7] px-5 py-3">
                        <button
                          type="button"
                          onClick={() => onSelectProject(project.id)}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-[#1b1712]"
                        >
                          Open
                          <ArrowIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(project.id, project.name)}
                          className="rounded-full border border-[#e4d9ca] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#7a6a59] transition-colors hover:border-red-200 hover:text-red-600"
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

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className={`rounded-[30px] border border-[#d7cab8] bg-white/84 ${cardPadding} shadow-[0_18px_42px_rgba(27,23,18,0.05)]`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#8f7f69]">Palettes nearby</p>
                  <h2 className="mt-2 font-serif text-3xl text-[#1b1712]">Color memory, not admin</h2>
                </div>
                <span className="rounded-full border border-[#d7cab8] bg-[#faf7f2] px-3 py-1.5 text-xs font-semibold text-[#6a5a48]">
                  {savedPaintPalettes.length} saved
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {savedPaintPalettes.length > 0 ? (
                  savedPaintPalettes.slice(0, 8).map((palette) => (
                    <span
                      key={palette.id}
                      className={`rounded-full border px-3 py-1.5 text-xs ${
                        palette.id === activePaintPaletteId
                          ? 'border-transparent text-white'
                          : 'border-[#d7cab8] bg-[#faf7f2] text-[#6a5a48]'
                      }`}
                      style={palette.id === activePaintPaletteId ? { backgroundColor: accentTheme.accent } : undefined}
                    >
                      {palette.name}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-dashed border-[#d7cab8] px-3 py-1.5 text-xs text-[#8f7f69]">
                    Save a palette from the paint library and it will appear here.
                  </span>
                )}
              </div>

              <div className="mt-5 rounded-[24px] border border-[#e8dfd3] bg-[#faf7f2] px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8f7f69]">Current shelf</p>
                <p className="mt-2 text-lg font-semibold text-[#1b1712]">
                  {activePaintPalette ? activePaintPalette.name : 'Working selection'}
                </p>
                <p className="mt-1 text-sm text-[#6a5a48]">
                  {activePaintPalette
                    ? `${activePaintPalette.paintIds.length} paints ready for recipe solving.`
                    : 'Build a paint set once and keep it nearby.'}
                </p>
              </div>
            </div>

            <div className={`rounded-[30px] border border-[#d7cab8] bg-[#faf6f0]/88 ${cardPadding} shadow-[0_18px_42px_rgba(27,23,18,0.05)]`}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#8f7f69]">Pinned colors</p>
                <h2 className="mt-2 font-serif text-3xl text-[#1b1712]">Notes in color</h2>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {pinnedColors.length > 0 ? (
                  pinnedColors.slice(0, 18).map((color) => (
                    <span
                      key={color.id}
                      className="h-12 w-12 rounded-full border border-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_16px_rgba(27,23,18,0.08)]"
                      style={{ backgroundColor: color.hex }}
                      title={color.hex}
                      aria-label={color.hex}
                    />
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[#d7cab8] bg-white/76 px-4 py-4 text-sm text-[#6a5a48]">
                    Pin colors from a study and they stay within reach here.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {showUtilityPanel ? (
        <div className="absolute inset-0 z-30 bg-black/12 backdrop-blur-[2px]">
          <button
            type="button"
            onClick={() => applyUtilityPanel(false)}
            className="absolute inset-0"
            aria-label="Close studio settings"
          />

          <aside className="absolute right-0 top-0 z-10 h-full w-full max-w-[360px] overflow-y-auto border-l border-[#d7cab8] bg-[#f7f2ea]/95 p-6 shadow-[-24px_0_60px_rgba(27,23,18,0.12)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8f7f69]">Studio settings</p>
                <h2 className="mt-2 font-serif text-3xl text-[#1b1712]">Tuned to you</h2>
              </div>
              <button
                type="button"
                onClick={() => applyUtilityPanel(false)}
                className="rounded-full border border-[#d7cab8] bg-white px-3 py-1.5 text-sm font-medium text-[#55493a]"
              >
                Close
              </button>
            </div>

            <div className="mt-6 rounded-[28px] border border-[#d7cab8] bg-white/84 p-5 shadow-[0_18px_42px_rgba(27,23,18,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8f7f69]">Accent</p>
              <div className="mt-3 grid gap-2">
                {(Object.keys(ACCENT_THEMES) as DesktopWorkspaceAccent[]).map((key) => (
                  <PreferenceChoice
                    key={key}
                    active={accent === key}
                    label={ACCENT_THEMES[key].label}
                    swatch={ACCENT_THEMES[key].accent}
                    onClick={() => applyAccent(key)}
                  />
                ))}
              </div>

              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#8f7f69]">Density</p>
              <div className="mt-3 grid gap-2">
                <PreferenceChoice
                  active={density === 'comfortable'}
                  label="Comfortable"
                  onClick={() => applyDensity('comfortable')}
                />
                <PreferenceChoice
                  active={density === 'compact'}
                  label="Compact"
                  onClick={() => applyDensity('compact')}
                />
              </div>

              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#8f7f69]">Startup</p>
              <div className="mt-3 grid gap-2">
                <PreferenceChoice
                  active={startupBehavior === 'home'}
                  label="Open Studio"
                  onClick={() => onStartupBehaviorChange?.('home')}
                />
                <PreferenceChoice
                  active={startupBehavior === 'resume'}
                  label="Resume Last Study"
                  onClick={() => onStartupBehaviorChange?.('resume')}
                />
              </div>
            </div>

            <div className="mt-4 rounded-[28px] border border-[#d7cab8] bg-white/84 p-5 shadow-[0_18px_42px_rgba(27,23,18,0.05)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8f7f69]">Snapshot</p>
              <div className="mt-4 space-y-3 text-sm text-[#55493a]">
                <div className="rounded-2xl border border-[#e8dfd3] bg-[#faf7f2] px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f7f69]">Last study</p>
                  <p className="mt-2 font-semibold text-[#1b1712]">
                    {featuredProject ? featuredProject.name : 'No recent study'}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#e8dfd3] bg-[#faf7f2] px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f7f69]">Pinned colors</p>
                  <p className="mt-2 font-semibold text-[#1b1712]">{pinnedColors.length}</p>
                </div>
                <div className="rounded-2xl border border-[#e8dfd3] bg-[#faf7f2] px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8f7f69]">Open image</p>
                  <p className="mt-2 font-semibold text-[#1b1712]">{shortcutLabel}</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
