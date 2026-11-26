'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  collectionNameProblem,
  createCollection,
  deleteCollection,
  emptyLibrary,
  findByHex,
  loadLibrary,
  removeColor,
  saveColor,
  setMembership,
  setNote,
  storeLibrary,
  type ColorLibrary,
  type SaveInput,
  type SavedColor,
} from '@/lib/colorLibrary'
import { newId } from '@/lib/newId'
import type { PickedColor, SamplePoint } from './SimpleCanvas'
import type { ThreadSavePayload } from './ThreadStudio'

const LIBRARY_LOAD_ERROR =
  'Saved colors couldn’t be read. Saving is unavailable; existing data has been kept. Try allowing browser storage and reload.'
const LIBRARY_SAVE_ERROR =
  'Couldn’t save changes on this device. Browser storage may be full or blocked. Your recipe is still here; try saving again.'
const PULL_SAVE_ERROR = 'Couldn’t save the pull on this device. Try again.'
const COLLECTION_SAVE_ERROR = 'Couldn’t save the collection on this device. Try again.'

export function findUpdatedSavedColor(
  current: SavedColor | null,
  next: ColorLibrary,
): SavedColor | null {
  return current ? next.colors.find((entry) => entry.id === current.id) ?? null : current
}

export function saveThreadsIntoLibrary(
  library: ColorLibrary,
  threadsToSave: ThreadSavePayload[],
  options: {
    now: number
    createId: () => string
    collectionId?: string | null
    pictureName?: string
  },
): { library: ColorLibrary; count: number } {
  let working = library
  let count = 0
  for (const thread of threadsToSave) {
    const saved = saveColor(working, {
      id: options.createId(),
      hex: thread.hex.toUpperCase(),
      name: thread.name,
      now: options.now,
      pictureName: options.pictureName,
      thread,
    })
    working = options.collectionId
      ? setMembership(saved.library, saved.color.id, options.collectionId, true, options.now)
      : saved.library
    count++
  }
  return { library: working, count }
}

export function buildThreadMapPullLibrary(
  library: ColorLibrary,
  threadsToSave: ThreadSavePayload[],
  requestedName: string,
  options: {
    now: number
    createId: () => string
    pictureName?: string
  },
): { library: ColorLibrary; collectionId: string | null; collectionName: string } | null {
  if (threadsToSave.length === 0) return null
  const made = createCollection(library, {
    id: options.createId(),
    name: requestedName,
    now: options.now,
  })
  const collectionId = made.collection?.id ?? null
  const { library: working } = saveThreadsIntoLibrary(made.library, threadsToSave, {
    now: options.now,
    createId: options.createId,
    collectionId,
    pictureName: options.pictureName,
  })
  return {
    library: working,
    collectionId,
    collectionName: made.collection?.name ?? 'All',
  }
}

export interface UseSimpleLibraryOptions {
  color: PickedColor | null
  point: SamplePoint | null
  pictureName: string | undefined
}

export function useSimpleLibrary({ color, point, pictureName }: UseSimpleLibraryOptions) {
  const [library, setLibrary] = useState<ColorLibrary>(emptyLibrary)
  const [savedColor, setSavedColor] = useState<SavedColor | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedReadable, setSavedReadable] = useState(false)
  const [collectionFilter, setCollectionFilter] = useState<string | null>(null)

  useEffect(() => {
    try {
      setLibrary(loadLibrary(window.localStorage))
      setSavedReadable(true)
    } catch {
      setSaveError(LIBRARY_LOAD_ERROR)
    }
  }, [])

  const updateLibrary = useCallback((next: ColorLibrary) => {
    if (!savedReadable) return false
    try {
      storeLibrary(window.localStorage, next)
      setLibrary(next)
      setSaveError(null)
      return true
    } catch {
      setSaveError(LIBRARY_SAVE_ERROR)
      return false
    }
  }, [savedReadable])

  const refreshSaved = useCallback((next: ColorLibrary) => {
    setSavedColor((current) => findUpdatedSavedColor(current, next))
  }, [])

  const saveCurrent = useCallback((result: Pick<SaveInput, 'name' | 'paint' | 'thread'>) => {
    if (!color) return null
    const next = saveColor(library, {
      id: newId(),
      hex: color.hex,
      now: Date.now(),
      pictureName: point ? pictureName : undefined,
      ...result,
    })
    if (!updateLibrary(next.library)) return null
    setSavedColor(next.color)
    return next.updated ? ('updated' as const) : ('created' as const)
  }, [color, library, pictureName, point, updateLibrary])

  const saveThreadDirect = useCallback((
    thread: ThreadSavePayload,
    options?: { sampleHex?: string; colorName?: string; collectionId?: string | null },
  ) => {
    const hex = (options?.sampleHex ?? thread.hex).toUpperCase()
    const now = Date.now()
    const saved = saveColor(library, {
      id: newId(),
      hex,
      name: options?.colorName || thread.name,
      now,
      pictureName: point && options?.sampleHex ? pictureName : undefined,
      thread,
    })
    const finalLibrary = options?.collectionId
      ? setMembership(saved.library, saved.color.id, options.collectionId, true, now)
      : saved.library
    if (!updateLibrary(finalLibrary)) return null
    if (color?.hex === hex) {
      setSavedColor(finalLibrary.colors.find((entry) => entry.id === saved.color.id) ?? saved.color)
    }
    return saved.updated ? ('updated' as const) : ('created' as const)
  }, [color?.hex, library, pictureName, point, updateLibrary])

  const saveThreadsBatch = useCallback((
    threadsToSave: ThreadSavePayload[],
    options?: { collectionId?: string | null },
  ) => {
    if (threadsToSave.length === 0) return 0
    const { library: working, count } = saveThreadsIntoLibrary(library, threadsToSave, {
      now: Date.now(),
      createId: newId,
      collectionId: options?.collectionId,
    })
    if (!updateLibrary(working)) return 0
    refreshSaved(working)
    return count
  }, [library, refreshSaved, updateLibrary])

  const saveThreadMapPull = useCallback((threadsToSave: ThreadSavePayload[], requestedName: string) => {
    const built = buildThreadMapPullLibrary(library, threadsToSave, requestedName, {
      now: Date.now(),
      createId: newId,
      pictureName,
    })
    if (!built) return null
    if (!updateLibrary(built.library)) return null
    refreshSaved(built.library)
    if (built.collectionId) setCollectionFilter(built.collectionId)
    return built.collectionName
  }, [library, pictureName, refreshSaved, updateLibrary])

  const createNamedCollection = useCallback((name: string) => {
    const problem = collectionNameProblem(library, name)
    if (problem) return problem
    const made = createCollection(library, { id: newId(), name, now: Date.now() })
    if (!made.collection || !updateLibrary(made.library)) return PULL_SAVE_ERROR
    return { id: made.collection.id }
  }, [library, updateLibrary])

  const toggleCollection = useCallback((colorId: string, collectionId: string, member: boolean) => {
    const next = setMembership(library, colorId, collectionId, member, Date.now())
    if (!updateLibrary(next)) return false
    refreshSaved(next)
    return true
  }, [library, refreshSaved, updateLibrary])

  const createAndAssignCollection = useCallback((colorId: string, name: string) => {
    const problem = collectionNameProblem(library, name)
    if (problem) return problem
    const made = createCollection(library, { id: newId(), name, now: Date.now() })
    const next = setMembership(made.library, colorId, made.collection!.id, true, Date.now())
    if (!updateLibrary(next)) return COLLECTION_SAVE_ERROR
    refreshSaved(next)
    return null
  }, [library, refreshSaved, updateLibrary])

  const handleNote = useCallback((id: string, note: string) => {
    const next = setNote(library, id, note, Date.now())
    if (!updateLibrary(next)) return false
    setSavedColor((current) =>
      current?.id === id ? next.colors.find((entry) => entry.id === id) ?? current : current,
    )
    return true
  }, [library, updateLibrary])

  const handleRemoveColor = useCallback((entry: SavedColor) => {
    if (updateLibrary(removeColor(library, entry.id)) && savedColor?.id === entry.id) {
      setSavedColor(null)
    }
  }, [library, savedColor?.id, updateLibrary])

  const handleDeleteCollection = useCallback((collectionId: string) => {
    const next = deleteCollection(library, collectionId)
    if (!updateLibrary(next)) return
    setCollectionFilter(null)
    refreshSaved(next)
  }, [library, refreshSaved, updateLibrary])

  const importBackup = useCallback((merged: ColorLibrary) => {
    if (!updateLibrary(merged)) return false
    refreshSaved(merged)
    setCollectionFilter(null)
    return true
  }, [refreshSaved, updateLibrary])

  const findExistingByHex = useCallback((hex: string) => findByHex(library, hex) ?? null, [library])

  return {
    library,
    savedColor,
    setSavedColor,
    saveError,
    savedReadable,
    collectionFilter,
    setCollectionFilter,
    saveCurrent,
    saveThreadDirect,
    saveThreadsBatch,
    saveThreadMapPull,
    createNamedCollection,
    toggleCollection,
    createAndAssignCollection,
    handleNote,
    handleRemoveColor,
    handleDeleteCollection,
    importBackup,
    findExistingByHex,
  }
}
