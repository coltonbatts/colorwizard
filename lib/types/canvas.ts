export interface CanvasSettings {
    enabled: boolean
    width: number
    height: number
    unit: 'in' | 'cm'
}

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
    enabled: false,
    width: 10,
    height: 8,
    unit: 'in'
}
