export interface DMCColor {
  number: string
  name: string
  rgb: { r: number; g: number; b: number }
  hex: string
  lab?: import('./colorUtils').Lab
}
