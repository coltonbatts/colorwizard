'use client'

import { useCallback, useMemo, useState } from 'react'
import { averageColorAt } from '@/lib/demoPicture'
import { rgbToHex } from '@/lib/color/conversions'
import { newId } from '@/lib/newId'
import {
  centeredCrop,
  loadCanvasDraft,
  newCanvasDraft,
  referencePoint,
  storeCanvasDraft,
  transferMeasurements,
  type CanvasDraft,
  type CanvasFace,
  type CanvasLandmark,
  type ImageCrop,
} from '@/lib/paint/canvasSetup'
import type { Palette } from '@/lib/types/palette'
import { cropCanvas, drawTransferOverlay } from './canvasTransfer'
import { useTransferRecipes } from './useTransferRecipes'
import type { MarkTool } from './CanvasSetupPanel'
import type { SamplePoint } from './SimpleCanvas'

export const DRAFT_RESTORED_STATUS = 'Canvas draft restored.'
export const DRAFT_SAVED_STATUS = 'Canvas draft saved on this device.'
export const DRAFT_SAVE_FAILED_STATUS =
  'Couldn’t save this draft on this device. Print the packet to keep a copy.'

export function tryRestoreCanvasDraft(
  storage: Pick<Storage, 'getItem'>,
  pictureKey: string | null,
): { draft: CanvasDraft | null; status: string | null } {
  let restoredDraft: CanvasDraft | null = null
  try {
    restoredDraft = pictureKey ? loadCanvasDraft(storage, pictureKey) : null
  } catch {
    // The picture can still be opened if local storage is blocked or a draft was damaged.
  }
  return {
    draft: restoredDraft,
    status: restoredDraft ? DRAFT_RESTORED_STATUS : null,
  }
}

export function tryPersistCanvasDraft(
  storage: Pick<Storage, 'setItem'>,
  draftKey: string | null,
  draft: CanvasDraft,
): { saved: boolean; status: string } {
  try {
    if (!draftKey) throw new Error('No reference key')
    storeCanvasDraft(storage, draftKey, draft)
    return { saved: true, status: DRAFT_SAVED_STATUS }
  } catch {
    return { saved: false, status: DRAFT_SAVE_FAILED_STATUS }
  }
}

export function applyLockedFace(currentDraft: CanvasDraft | null, face: CanvasFace): CanvasDraft {
  return currentDraft ? { ...currentDraft, face } : newCanvasDraft(face)
}

export function buildCanvasLandmark(options: {
  existingCount: number
  sourcePoint: { x: number; y: number }
  id: string
  trialHex?: string
}): CanvasLandmark {
  const index = options.existingCount + 1
  if (options.trialHex) {
    return {
      ...options.sourcePoint,
      id: options.id,
      name: `Mix trial ${index}`,
      trial: {
        hex: options.trialHex.toUpperCase(),
        measured: '',
        correction: '',
        acceptedPalette: null,
      },
    }
  }
  return {
    ...options.sourcePoint,
    id: options.id,
    name: `Mark ${index}`,
  }
}

export interface UseCanvasSetupStateOptions {
  originalSource: HTMLCanvasElement | null
  palette: Palette
}

export function useCanvasSetupState({ originalSource, palette }: UseCanvasSetupStateOptions) {
  const [draftKey, setDraftKey] = useState<string | null>(null)
  const [canvasDraft, setCanvasDraft] = useState<CanvasDraft | null>(null)
  const [setupOpen, setSetupOpen] = useState(false)
  const [markTool, setMarkTool] = useState<MarkTool | null>(null)
  const [draftStatus, setDraftStatus] = useState<string | null>(null)

  const lockedFace = canvasDraft?.face
  const crop = useMemo(
    () => (originalSource && lockedFace ? centeredCrop(originalSource, lockedFace) : null),
    [originalSource, lockedFace],
  )
  const paintingSource = useMemo(
    () => (originalSource && crop ? cropCanvas(originalSource, crop) : originalSource),
    [originalSource, crop],
  )
  const trialRecipes = useTransferRecipes(canvasDraft?.landmarks, palette)

  const guideMarks = useMemo(
    () =>
      canvasDraft && originalSource && crop
        ? transferMeasurements(canvasDraft, originalSource, crop).landmarks.map(
            ({ index, position, mark }) => ({
              index,
              position,
              isTrial: Boolean(mark.trial),
            }),
          )
        : [],
    [canvasDraft, crop, originalSource],
  )

  const drawGuide = useCallback(
    (ctx: CanvasRenderingContext2D, image: ImageCrop) => {
      if (canvasDraft) drawTransferOverlay(ctx, image, canvasDraft.face, guideMarks, canvasDraft.grid)
    },
    [canvasDraft, guideMarks],
  )

  const restoreForPicture = useCallback((pictureKey: string | null) => {
    const { draft, status } = tryRestoreCanvasDraft(window.localStorage, pictureKey)
    setDraftKey(pictureKey)
    setCanvasDraft(draft)
    setSetupOpen(draft !== null)
    setMarkTool(null)
    setDraftStatus(status)
  }, [])

  const updateCanvasDraft = useCallback(
    (draft: CanvasDraft) => {
      setCanvasDraft(draft)
      const { status } = tryPersistCanvasDraft(window.localStorage, draftKey, draft)
      setDraftStatus(status)
    },
    [draftKey],
  )

  const lockCanvasFace = useCallback(
    (face: CanvasFace) => {
      updateCanvasDraft(applyLockedFace(canvasDraft, face))
    },
    [canvasDraft, updateCanvasDraft],
  )

  const placeMarkAt = useCallback(
    (nextPoint: SamplePoint, source: HTMLCanvasElement): boolean => {
      if (!setupOpen || !markTool || !canvasDraft || !originalSource || !crop) return false
      const sourcePoint = referencePoint(
        { x: (nextPoint.x + 0.5) / source.width, y: (nextPoint.y + 0.5) / source.height },
        originalSource,
        crop,
      )
      let trialHex: string | undefined
      if (markTool === 'trial') {
        const ctx = source.getContext('2d')
        if (!ctx) return true
        const radius = Math.max(1, Math.round(Math.min(source.width, source.height) / 240))
        const left = Math.max(0, nextPoint.x - radius)
        const top = Math.max(0, nextPoint.y - radius)
        const area = ctx.getImageData(
          left,
          top,
          Math.min(source.width - left, nextPoint.x + radius + 1 - left),
          Math.min(source.height - top, nextPoint.y + radius + 1 - top),
        )
        const rgb = averageColorAt(area.data, area.width, area.height, nextPoint.x - left, nextPoint.y - top, radius)
        trialHex = rgbToHex(rgb.r, rgb.g, rgb.b).toUpperCase()
      }
      const landmark = buildCanvasLandmark({
        existingCount: canvasDraft.landmarks.length,
        sourcePoint,
        id: newId(),
        trialHex,
      })
      updateCanvasDraft({ ...canvasDraft, landmarks: [...canvasDraft.landmarks, landmark] })
      return true
    },
    [canvasDraft, crop, markTool, originalSource, setupOpen, updateCanvasDraft],
  )

  const closeSetup = useCallback(() => {
    setSetupOpen(false)
    setMarkTool(null)
  }, [])

  return {
    canvasDraft,
    crop,
    paintingSource,
    setupOpen,
    setSetupOpen,
    markTool,
    setMarkTool,
    draftStatus,
    trialRecipes,
    drawGuide,
    restoreForPicture,
    updateCanvasDraft,
    lockCanvasFace,
    placeMarkAt,
    closeSetup,
  }
}
