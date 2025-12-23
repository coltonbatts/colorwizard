import { SpectralRecipe } from '../spectral/types'
import { MixingRecipe } from '../colorMixer'
import { DMCMatch } from '../dmcFloss'

export interface PinnedColor {
    id: string
    hex: string
    rgb: { r: number; g: number; b: number }
    hsl: { h: number; s: number; l: number }
    label: string
    timestamp: number
    spectralRecipe: SpectralRecipe | null
    fallbackRecipe: MixingRecipe
    dmcMatches: DMCMatch[]
}
