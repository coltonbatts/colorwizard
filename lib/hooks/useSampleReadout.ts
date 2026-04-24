'use client'

import { useEffect, useMemo, useState } from 'react'
import { getColorHarmonies } from '@/lib/colorTheory'
import { getColorName } from '@/lib/colorNaming'
import { getPainterChroma, getLuminance, getValueBand } from '@/lib/paintingMath'
import { getValueModeMetadataFromRgb, luminanceToGrayHex } from '@/lib/valueMode'
import type { Palette } from '@/lib/types/palette'

export type SampleReadoutColor = {
  hex: string
  rgb: { r: number; g: number; b: number }
  hsl: { h: number; s: number; l: number }
  label?: string
  valueMetadata?: {
    y: number
    step: number
    range: [number, number]
    percentile: number
  }
} | null

type ValueModeSteps = 5 | 7 | 9 | 11

export function getPaletteRecipeOptions(activePalette?: Palette) {
  if (!activePalette || activePalette.isDefault) return undefined

  return {
    paletteColorIds: activePalette.colors.map(color => color.id),
  }
}

export function useSampleReadout({
  sampledColor,
  valueModeEnabled = false,
  valueModeSteps,
  preferredName,
}: {
  sampledColor: SampleReadoutColor
  valueModeEnabled?: boolean
  valueModeSteps: ValueModeSteps
  preferredName?: string
}) {
  const [colorName, setColorName] = useState('')
  const [isLoadingName, setIsLoadingName] = useState(false)
  const sampledHex = sampledColor?.hex

  useEffect(() => {
    if (!sampledHex) {
      setColorName('')
      setIsLoadingName(false)
      return
    }

    if (preferredName && preferredName !== 'New Color') {
      setColorName(preferredName)
      setIsLoadingName(false)
      return
    }

    let cancelled = false
    setIsLoadingName(true)

    getColorName(sampledHex)
      .then(result => {
        if (!cancelled) {
          setColorName(result.name)
        }
      })
      .catch(error => {
        console.error('Failed to get color name:', error)
        if (!cancelled) {
          setColorName('')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingName(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [preferredName, sampledHex])

  return useMemo(() => {
    if (!sampledColor) {
      return {
        colorName,
        displayName: '',
        isLoadingName,
        harmonies: null,
        temperatureLabel: '',
        chroma: null,
        valuePercent: 0,
        valueBand: '',
        valueModeMeta: null,
        grayscaleHex: '#000000',
        displayedValue: 0,
      }
    }

    const { hex, rgb } = sampledColor
    const harmonies = getColorHarmonies(rgb)
    const temperatureLabel =
      harmonies.temperature === 'warm'
        ? 'Warm'
        : harmonies.temperature === 'cool'
          ? 'Cool'
          : 'Neutral'
    const chroma = getPainterChroma(hex)
    const valuePercent = getLuminance(rgb.r, rgb.g, rgb.b)
    const valueBand = getValueBand(valuePercent)
    const valueModeMeta = valueModeEnabled ? getValueModeMetadataFromRgb(rgb, valueModeSteps) : null
    const displayedValue = valueModeMeta
      ? Math.round(valueModeMeta.y * 100)
      : sampledColor.valueMetadata
        ? Math.round(sampledColor.valueMetadata.y * 100)
        : valuePercent
    const grayscaleHex = valueModeMeta
      ? luminanceToGrayHex(valueModeMeta.y)
      : luminanceToGrayHex(displayedValue / 100)

    return {
      colorName,
      displayName: colorName || hex.toUpperCase(),
      isLoadingName,
      harmonies,
      temperatureLabel,
      chroma,
      valuePercent,
      valueBand,
      valueModeMeta,
      grayscaleHex,
      displayedValue,
    }
  }, [colorName, isLoadingName, sampledColor, valueModeEnabled, valueModeSteps])
}
