export interface WorkflowIngredient {
  id?: string
  name: string
  weight: number
  label?: string
  isValueAdjuster?: boolean
  tintingStrength?: number
}

interface GenerateWorkflowOptions {
  targetLightness?: number
  notes?: string
}

type LightnessBand = 'light' | 'mid' | 'dark'
type TintingClass = 'weak' | 'medium' | 'strong' | 'dangerous'

const PHRASING_BY_LABEL: Record<string, string> = {
  mostly: 'a generous amount',
  generous: 'a generous amount',
  base: 'a moderate amount',
  moderate: 'a moderate amount',
  'small amount': 'a small amount',
  touch: 'a touch',
  'tiny touch': 'a tiny touch',
}

function normalizePigmentKey(ingredient: Pick<WorkflowIngredient, 'id' | 'name'>): string {
  return `${ingredient.id ?? ''} ${ingredient.name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
}

function matchesPigment(ingredient: Pick<WorkflowIngredient, 'id' | 'name'>, pigmentKey: string): boolean {
  return normalizePigmentKey(ingredient).includes(pigmentKey)
}

function isWhite(ingredient: Pick<WorkflowIngredient, 'id' | 'name'>): boolean {
  return matchesPigment(ingredient, 'titanium-white')
}

function isBlack(ingredient: Pick<WorkflowIngredient, 'id' | 'name'>): boolean {
  return matchesPigment(ingredient, 'ivory-black')
}

function isPhthalo(ingredient: Pick<WorkflowIngredient, 'id' | 'name'>): boolean {
  return isPhthaloBlue(ingredient) || isPhthaloGreen(ingredient)
}

function isPhthaloBlue(ingredient: Pick<WorkflowIngredient, 'id' | 'name'>): boolean {
  return matchesPigment(ingredient, 'phthalo-blue')
}

function isPhthaloGreen(ingredient: Pick<WorkflowIngredient, 'id' | 'name'>): boolean {
  return matchesPigment(ingredient, 'phthalo-green')
}

function isYellowOchre(ingredient: Pick<WorkflowIngredient, 'id' | 'name'>): boolean {
  return matchesPigment(ingredient, 'yellow-ochre')
}

function isCadmiumRed(ingredient: Pick<WorkflowIngredient, 'id' | 'name'>): boolean {
  return matchesPigment(ingredient, 'cadmium-red')
}

function isValueAdjuster(ingredient: WorkflowIngredient): boolean {
  return Boolean(ingredient.isValueAdjuster) || isWhite(ingredient) || isBlack(ingredient)
}

function getTintingStrength(ingredient: WorkflowIngredient): number {
  if (typeof ingredient.tintingStrength === 'number' && Number.isFinite(ingredient.tintingStrength)) {
    return ingredient.tintingStrength
  }

  if (isPhthaloBlue(ingredient)) return 10
  if (isPhthaloGreen(ingredient)) return 8
  if (isBlack(ingredient)) return 5
  if (isCadmiumRed(ingredient)) return 1.5
  if (isYellowOchre(ingredient)) return 0.9
  return 1
}

function getTintingClass(ingredient: WorkflowIngredient): TintingClass {
  const strength = getTintingStrength(ingredient)

  if (strength >= 6) return 'dangerous'
  if (strength >= 3) return 'strong'
  if (strength >= 1.2) return 'medium'
  return 'weak'
}

function isStrongTinter(ingredient: WorkflowIngredient): boolean {
  const tintingClass = getTintingClass(ingredient)
  return tintingClass === 'strong' || tintingClass === 'dangerous'
}

function isDangerousTinter(ingredient: WorkflowIngredient): boolean {
  return getTintingClass(ingredient) === 'dangerous'
}

function getLightnessBand(ingredients: WorkflowIngredient[], targetLightness?: number): LightnessBand {
  if (typeof targetLightness === 'number') {
    if (targetLightness >= 72) return 'light'
    if (targetLightness <= 32) return 'dark'
    return 'mid'
  }

  const whiteWeight = ingredients.filter(isWhite).reduce((sum, ingredient) => sum + ingredient.weight, 0)
  const blackWeight = ingredients.filter(isBlack).reduce((sum, ingredient) => sum + ingredient.weight, 0)

  if (whiteWeight >= 0.55) return 'light'
  if (blackWeight >= 0.18) return 'dark'
  return 'mid'
}

function getDosePhrase(ingredient: WorkflowIngredient): string {
  const label = ingredient.label?.toLowerCase().trim()
  if (label && label in PHRASING_BY_LABEL) {
    return PHRASING_BY_LABEL[label]
  }

  if (ingredient.weight >= 0.45) return 'a generous amount'
  if (ingredient.weight >= 0.22) return 'a moderate amount'
  if (ingredient.weight >= 0.1) return 'a small amount'
  if (ingredient.weight >= 0.04) return 'a touch'
  return 'a tiny touch'
}

function scoreMidtoneBase(ingredient: WorkflowIngredient): number {
  let score = ingredient.weight * 2

  if (isYellowOchre(ingredient)) score += 0.35
  if (isCadmiumRed(ingredient)) score += 0.3
  if (isPhthalo(ingredient)) score -= 0.35

  return score
}

function scoreDarkBase(ingredient: WorkflowIngredient, chromaticIngredients: WorkflowIngredient[]): number {
  let score = ingredient.weight * 2

  if (isYellowOchre(ingredient)) score += 0.4
  if (isCadmiumRed(ingredient)) score += 0.32
  if (isPhthaloBlue(ingredient)) score += 0.24
  if (isPhthaloGreen(ingredient)) score += 0.18

  if (
    isPhthalo(ingredient) &&
    chromaticIngredients.some((candidate) => !isPhthalo(candidate) && candidate.weight >= ingredient.weight * 0.75)
  ) {
    score -= 0.5
  }

  return score
}

function shouldLeadWithWhite(
  ingredients: WorkflowIngredient[],
  chromaticIngredients: WorkflowIngredient[],
  targetLightness?: number
): boolean {
  const white = ingredients.find(isWhite)
  if (!white) return false

  const strongestChromatic = [...chromaticIngredients].sort((a, b) => b.weight - a.weight)[0]
  const dangerousChromatic = [...chromaticIngredients]
    .filter(isDangerousTinter)
    .sort((a, b) => b.weight - a.weight)[0]
  const naturalChromaticBase = chromaticIngredients.some(
    (ingredient) => !isStrongTinter(ingredient) && ingredient.weight >= 0.18
  )

  if (white.weight >= 0.72) {
    return true
  }

  if (dangerousChromatic && white.weight >= 0.55 && dangerousChromatic.weight <= 0.18) {
    return true
  }

  if (typeof targetLightness === 'number' && targetLightness >= 84) {
    return true
  }

  if (typeof targetLightness === 'number' && targetLightness < 70 && white.weight < 0.72) {
    return false
  }

  if (naturalChromaticBase) {
    return false
  }

  if (!strongestChromatic) {
    return true
  }

  return white.weight >= 0.5 && (isStrongTinter(strongestChromatic) || strongestChromatic.weight <= 0.2)
}

export function choosePainterBase(
  ingredients: WorkflowIngredient[],
  targetLightness?: number
): WorkflowIngredient | null {
  const activeIngredients = ingredients
    .filter((ingredient) => ingredient.weight > 0)
    .sort((a, b) => b.weight - a.weight)

  if (activeIngredients.length === 0) {
    return null
  }

  const chromaticIngredients = activeIngredients.filter((ingredient) => !isValueAdjuster(ingredient))
  const nonPhthaloChromatics = chromaticIngredients.filter((ingredient) => !isPhthalo(ingredient))
  const white = activeIngredients.find(isWhite)
  const band = getLightnessBand(activeIngredients, targetLightness)

  if (shouldLeadWithWhite(activeIngredients, chromaticIngredients, targetLightness)) {
    return white ?? activeIngredients[0]
  }

  if (band === 'dark' && chromaticIngredients.length > 0) {
    return [...chromaticIngredients].sort(
      (a, b) => scoreDarkBase(b, chromaticIngredients) - scoreDarkBase(a, chromaticIngredients)
    )[0]
  }

  if (nonPhthaloChromatics.length > 0) {
    return [...nonPhthaloChromatics].sort((a, b) => scoreMidtoneBase(b) - scoreMidtoneBase(a))[0]
  }

  if (chromaticIngredients.length > 0) {
    return chromaticIngredients[0]
  }

  return white ?? activeIngredients[0]
}

export function generatePainterlyMixingSteps(
  ingredients: WorkflowIngredient[],
  options: GenerateWorkflowOptions = {}
): string[] {
  const activeIngredients = ingredients
    .filter((ingredient) => ingredient.weight > 0)
    .sort((a, b) => b.weight - a.weight)

  if (activeIngredients.length === 0) {
    return ['Mix thoroughly with your palette knife.']
  }

  const base = choosePainterBase(activeIngredients, options.targetLightness) ?? activeIngredients[0]
  const band = getLightnessBand(activeIngredients, options.targetLightness)
  const others = activeIngredients.filter((ingredient) => ingredient !== base)
  const white = others.find(isWhite)
  const black = others.find(isBlack)
  const nonValueAdjusters = others.filter((ingredient) => !isValueAdjuster(ingredient))
  const strongTinters = nonValueAdjusters.filter(isStrongTinter)
  const chromaticAdjusters = nonValueAdjusters.filter((ingredient) => !isStrongTinter(ingredient))
  const temperatureAdjusters = chromaticAdjusters.filter(
    (ingredient) => isYellowOchre(ingredient) || isCadmiumRed(ingredient)
  )
  const hueAdjusters = chromaticAdjusters.filter((ingredient) => !temperatureAdjusters.includes(ingredient))
  const valueBuildBits: string[] = []
  const steps: string[] = []

  if (isWhite(base) && band === 'light') {
    steps.push(`Start with a **${base.name}** pile to build the value first.`)
  } else if (band === 'dark' && !isValueAdjuster(base)) {
    steps.push(`Start with **${base.name}** as the dark base pile.`)
  } else {
    steps.push(`Start with **${base.name}** as the base pile.`)
  }

  if (white) {
    valueBuildBits.push(`lighten with ${getDosePhrase(white)} of **${white.name}**`)
  }

  if (black) {
    valueBuildBits.push(`if it still runs light, use ${getDosePhrase(black)} of **${black.name}** only to lock the value`)
  }

  if (valueBuildBits.length > 0) {
    steps.push(`Build the value pile first: ${valueBuildBits.join(', then ')}.`)
    steps.push('Lock the value before you chase hue.')
  } else if (nonValueAdjusters.length > 0) {
    steps.push('Build the value pile first and lock the value before you chase hue.')
  }

  temperatureAdjusters.forEach((ingredient) => {
    steps.push(`Adjust temperature with ${getDosePhrase(ingredient)} of **${ingredient.name}**.`)
  })

  hueAdjusters.forEach((ingredient) => {
    steps.push(`Nudge the hue with ${getDosePhrase(ingredient)} of **${ingredient.name}**.`)
  })

  strongTinters.forEach((ingredient) => {
    steps.push(`Add the strong tinter last: ${getDosePhrase(ingredient)} of **${ingredient.name}**.`)
  })

  steps.push('Mix thoroughly with your palette knife.')

  const dangerousTinters = activeIngredients.filter(
    (ingredient) => !isValueAdjuster(ingredient) && isDangerousTinter(ingredient)
  )
  if (dangerousTinters.length > 0) {
    if (dangerousTinters.length === 1) {
      steps.push(`**Tip:** ${dangerousTinters[0].name} is a strong tinter. Sneak up on it.`)
    } else {
      steps.push('**Tip:** These strong tinters can overshoot quickly. Add them in very small increments.')
    }
  }

  if (options.notes) {
    steps.push(`Note: ${options.notes}`)
  }

  return steps
}
