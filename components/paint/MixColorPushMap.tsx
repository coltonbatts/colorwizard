'use client'

import { motion } from 'framer-motion'
import {
  classifyMixPushes,
  type MixIngredientPush,
  type MixPushDirection,
} from '@/lib/paint/mixingWorkflow'
import { Pigment } from '@/lib/spectral/types'

interface MixColorPushMapProps {
  targetHex: string
  ingredients: Array<{
    pigment: Pigment
    weight: number
    percentage: string
  }>
  mixSource: 'solver' | 'heuristic'
  variant?: 'standard' | 'dashboard' | 'compact' | 'board'
}

const PUSH_CHIP: Record<
  MixPushDirection,
  { label: string; className: string }
> = {
  lighter: { label: 'Lighter', className: 'bg-[rgba(255,252,247,0.95)] text-ink-secondary' },
  darker: { label: 'Darker', className: 'bg-ink/8 text-ink-secondary' },
  warmer: { label: 'Warmer', className: 'bg-[rgba(229,43,33,0.12)] text-[#8f2a22]' },
  cooler: { label: 'Cooler', className: 'bg-[rgba(15,46,83,0.12)] text-[#1a3d66]' },
  less_chroma: { label: 'Less chroma', className: 'bg-[rgba(120,120,120,0.14)] text-ink-secondary' },
  more_chroma: { label: 'More chroma', className: 'bg-[rgba(60,140,90,0.14)] text-[#2a5c3a]' },
}

const ROLE_ACCENT: Record<MixIngredientPush['role'], string> = {
  value_base: 'border-ink-hairline bg-[rgba(255,252,247,0.9)] text-ink-secondary',
  value_lighten: 'border-ink-hairline bg-[rgba(255,252,247,0.9)] text-ink-secondary',
  value_darken: 'border-ink-hairline bg-ink/5 text-ink-secondary',
  neutralize: 'border-[rgba(143,42,34,0.22)] bg-[rgba(229,43,33,0.08)] text-[#8f2a22]',
  warm_bias: 'border-[rgba(204,142,53,0.35)] bg-[rgba(204,142,53,0.12)] text-[#6b4a12]',
  cool_bias: 'border-[rgba(15,46,83,0.25)] bg-[rgba(15,46,83,0.1)] text-[#1a3d66]',
  hue_nudge: 'border-ink-hairline bg-paper-recessed text-ink-secondary',
  strong_tinter: 'border-[rgba(15,46,83,0.3)] bg-[rgba(15,46,83,0.12)] text-[#1a3d66]',
}

function PushCard({
  push,
  pigmentHex,
  percentage,
  compact,
}: {
  push: MixIngredientPush
  pigmentHex: string
  percentage: string
  compact: boolean
}) {
  return (
    <motion.div
      className={`flex min-w-0 flex-1 flex-col rounded-[18px] border border-ink-hairline bg-[rgba(255,252,247,0.88)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] ${compact ? 'p-2.5' : 'p-3'}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start gap-2">
        <div
          className={`shrink-0 rounded-[12px] border border-black/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}
          style={{ backgroundColor: pigmentHex }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className={`truncate font-semibold text-ink ${compact ? 'text-[11px]' : 'text-xs'}`}>
            {push.ingredient.name}
          </div>
          <div className="mt-0.5 font-mono text-[11px] font-bold text-ink-secondary">{percentage}</div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.14em] ${ROLE_ACCENT[push.role]}`}
        >
          {push.roleLabel}
        </span>
      </div>

      <div className={`flex flex-wrap gap-1 ${compact ? 'mt-2' : 'mt-2.5'}`}>
        {push.pushes.map((direction) => (
          <span
            key={direction}
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.1em] ${PUSH_CHIP[direction].className}`}
          >
            {PUSH_CHIP[direction].label}
          </span>
        ))}
      </div>

      <p className={`mt-2 leading-4 text-ink-muted ${compact ? 'text-[11px]' : 'text-[11px]'}`}>
        {push.explanation}
      </p>
    </motion.div>
  )
}

export default function MixColorPushMap({
  targetHex,
  ingredients,
  mixSource,
  variant = 'standard',
}: MixColorPushMapProps) {
  if (ingredients.length === 0) return null

  const compact = variant === 'compact'
  const workflowIngredients = ingredients.map((ingredient) => ({
    id: ingredient.pigment.id,
    name: ingredient.pigment.name,
    weight: ingredient.weight,
    label: ingredient.percentage,
    isValueAdjuster: ingredient.pigment.isValueAdjuster,
    tintingStrength: ingredient.pigment.tintingStrength,
  }))

  const pushes = classifyMixPushes(workflowIngredients, { targetHex })
  const chromaticPushes = pushes.filter(
    (push) =>
      push.role !== 'value_base' &&
      !(push.role === 'value_lighten' && push.ingredient.weight < 0.2)
  )

  if (chromaticPushes.length === 0) return null

  return (
    <section
      className={`rounded-[22px] border border-ink-hairline bg-[rgba(255,252,247,0.68)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] ${compact ? 'mt-3 p-3' : 'mt-4 p-4'}`}
      aria-label="How each paint pushes the mix"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-ink-muted">
            Color pushes
          </div>
          <p className={`mt-1 text-ink-secondary ${compact ? 'text-[11px] leading-4' : 'text-[11px] leading-5'}`}>
            {mixSource === 'solver'
              ? 'How each pigment moves the on-screen mix toward your sample in the model—not wet-paint physics.'
              : 'How the studio guide reads each pigment’s job for this hue and value.'}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div
            className={`rounded-[12px] border border-black/8 shadow-[0_6px_16px_rgba(33,24,14,0.1)] ${compact ? 'h-10 w-10' : 'h-12 w-12'}`}
            style={{ backgroundColor: targetHex }}
            title="Your sample"
          />
          <span className="font-mono text-[11px] font-bold text-ink-muted">Target</span>
        </div>
      </div>

      <div
        className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}
        role="list"
      >
        {chromaticPushes.map((push) => {
          const match = ingredients.find((ing) => ing.pigment.name === push.ingredient.name)
          if (!match) return null
          return (
            <div key={push.ingredient.name} role="listitem">
              <PushCard
                push={push}
                pigmentHex={match.pigment.hex}
                percentage={match.percentage}
                compact={compact}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
