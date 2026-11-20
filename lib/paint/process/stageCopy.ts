/**
 * The words of the painting-process view. Components read them from here; do not copy
 * strings into components. Draft wording (2026-11-18): changing it needs the owner's OK.
 */

import type { StageId } from './stages'

export interface StageCopy {
  id: StageId
  /** Short label under the slider */
  short: string
  title: string
  /** What you are doing at this stage and why */
  doing: string
  /** What to mix */
  mix: string
  /** What to check before moving on */
  check: string
}

export const STAGE_COPY: StageCopy[] = [
  {
    id: 'ground',
    short: 'Ground',
    title: 'Tone the canvas',
    doing: 'Cover the white canvas with a thin, even wash of warm brown (an imprimatura). A middle-light ground makes it easier to judge darks and lights than bare white, and it glows through anything painted thinly on top.',
    mix: 'Yellow Ochre with a touch of Cadmium Red and Ivory Black, thinned well with solvent. Rub it in and wipe it back with a rag; it should be translucent, about value 6.',
    check: 'Even and dry to the touch before you draw.',
  },
  {
    id: 'layIn',
    short: 'Lay-in',
    title: 'Draw the big shapes',
    doing: 'With a small brush and the same thin brown, mark the outlines of the large light and dark shapes. Only the big shapes: no features, no texture.',
    mix: 'The ground brown, darkened with more Ivory Black and thinned. Keep it lean (solvent, little or no oil).',
    check: 'Placement and proportions. Moving a shape is cheap now and expensive later.',
  },
  {
    id: 'massing',
    short: 'Massing',
    title: 'Mass in three values',
    doing: 'Squint and fill each shape as one of three values: shadow, middle, light. Scrub the shadows in thinly; let the ground stand for the middle; wipe out or lightly paint the lights.',
    mix: 'Three browns: the lay-in brown for shadows, the ground for middle values, the ground lightened with Titanium White for lights.',
    check: 'Does the picture read from across the room in only three values? If not, fix it here.',
  },
  {
    id: 'brunaille',
    short: 'Underpainting',
    title: 'Model the brunaille',
    doing: 'Break the three masses into a few more steps and model the forms in brown alone. This underpainting carries the values; the color layers that follow mostly need to keep them.',
    mix: 'A string of browns from dark to light, all from the same earth mixture plus Titanium White. Keep them lean, so the oilier color layers can go over them ("fat over lean").',
    check: 'Compare its values with the original (the Value view, V). Let it dry before painting color over it.',
  },
]

export const PROCESS_CAVEAT = 'These stages are worked out backwards from the finished picture. They show one way such a painting could be built, not how this picture was made.'
export const BROWN_NOTE = 'The browns are screen colors for the underpainting’s values, not paint matches.'
export const PROCESS_SIZE_NOTE = 'Calculated on a copy of your picture at most 512 px on its long side, in this browser. Nothing is uploaded.'
export const NEXT_STAGES_NOTE = 'Color stages (block-in, develop, finish) come next.'
