/**
 * Project Gallery - Shows when no project is selected in Tauri.
 * Displays existing projects and allows creating new ones.
 */
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { isTauri, listProjects, createProject, deleteProject, type ProjectInfo } from '@/lib/tauri'

interface ProjectGalleryProps {
  onSelectProject: (id: number) => void
}

export default function ProjectGallery({ onSelectProject }: ProjectGalleryProps) {
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [newProjectName, setNewProjectName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const debugRef = useRef<HTMLPreElement>(null)

  const debug = useCallback((msg: string) => {
    console.log('[PG]', msg)
    if (debugRef.current) {
      debugRef.current.textContent += '\n' + msg
      debugRef.current.scrollTop = debugRef.current.scrollHeight
    }
  }, [])

  // Load projects
  useEffect(() => {
    debug('mounted')
    debug(`isTauri()=${isTauri()}`)
    if (!isTauri()) {
      debug('NOT in Tauri - nothing to show')
      setLoading(false)
      return
    }
    debug('calling listProjects()...')
    listProjects()
      .then((result) => {
        debug(`listProjects => ${result.length} projects`)
        setProjects(result)
        setLoading(false)
      })
      .catch((err) => {
        debug(`listProjects ERROR: ${err}`)
        setErrMsg(String(err))
        setLoading(false)
      })
  }, [debug])

  const handleCreate = useCallback(async () => {
    const name = newProjectName.trim()
    debug('handleCreate triggered')
    debug(`  name="${name}"`)
    debug(`  isCreating=${isCreating}`)

    if (!name) { debug('ABORT: name is empty'); return }
    if (isCreating) { debug('ABORT: already creating'); return }

    setIsCreating(true)
    setErrMsg('')
    debug('calling createProject()...')

    try {
      const result = await createProject(name)
      debug(`createProject => ${JSON.stringify(result)}`)
      if (result?.id) {
        debug(`selecting project id=${result.id}`)
        onSelectProject(result.id)
      } else {
        debug('ERROR: no id in result')
        setErrMsg('Created but no ID returned')
      }
    } catch (err: unknown) {
      debug(`createProject ERROR: ${err}`)
      if (err instanceof Error) {
        debug(`  message: ${err.message}`)
        debug(`  stack: ${err.stack}`)
      }
      setErrMsg(String(err))
    }

    setIsCreating(false)
  }, [newProjectName, isCreating, onSelectProject, debug])

  const handleDelete = useCallback(async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return
    try {
      await deleteProject(id)
      const result = await listProjects()
      setProjects(result)
    } catch (err) {
      setErrMsg(String(err))
    }
  }, [])

  if (!isTauri()) {
    return <div className="fixed inset-0 bg-[#f5f0e8] flex items-center justify-center"><p>Not in Tauri</p></div>
  }

  return (
    <div className="fixed inset-0 bg-[#f5f0e8] flex items-center justify-center p-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="font-serif text-4xl text-[#1a1a1a] mb-2">ColorWizard</h1>
          <p className="text-sm text-[#666] tracking-wide">Desktop Edition</p>
        </div>

        {/* Create Project */}
        <div className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#999] mb-4">New Project</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Project name..."
              className="flex-1 bg-white border border-[#ddd] rounded-lg px-4 py-3 text-[#1a1a1a] placeholder:text-[#ccc] focus:outline-none focus:border-[#1a1a1a] transition-colors"
              disabled={isCreating}
            />
            <button
              onClick={handleCreate}
              disabled={!newProjectName.trim() || isCreating}
              className="bg-[#1a1a1a] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
          {errMsg && <p className="mt-2 text-xs text-red-500">{errMsg}</p>}
        </div>

        {/* Debug */}
        <div className="mb-6 p-3 bg-black/5 rounded-lg">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#999] mb-1">Debug Log</p>
          <pre ref={debugRef} className="text-[10px] text-[#666] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto" />
        </div>

        {/* Project List */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#999] mb-4">Recent Projects</h2>
          {loading ? (
            <p className="text-[#999] text-sm">Loading...</p>
          ) : projects.length === 0 ? (
            <div className="border-2 border-dashed border-[#ddd] rounded-xl p-12 text-center">
              <p className="text-[#999] text-sm">No projects yet. Create your first one above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="group bg-white border border-[#e5e0d8] rounded-xl overflow-hidden hover:border-[#1a1a1a] transition-colors cursor-pointer relative"
                  onClick={() => onSelectProject(p.id)}
                >
                  <div className="aspect-video bg-[#f0ebe3] flex items-center justify-center">
                    <div className="flex gap-1">
                      {['#c0392b','#2980b9','#27ae60','#f39c12'].map((c,i) => (
                        <div key={i} className="w-6 h-6 rounded-full border border-white" style={{backgroundColor:c}} />
                      ))}
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-[#1a1a1a] truncate">{p.name}</h3>
                    <p className="text-[10px] text-[#999] mt-1">{new Date(p.modified_at).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.name) }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-600 transition-opacity z-10"
                  >x</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-16 text-center">
          <p className="text-[10px] text-[#ccc] tracking-widest uppercase">v0.1.0 - Offline First</p>
        </div>
      </div>
    </div>
  )
}
