/** A typed color: "#c45c3e", "C45C3E", "#fa0" or "fa0". Anything else is not a color here. */
export function parseColorInput(text: string): string | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim())
  if (!match) return null
  const digits = match[1].length === 3 ? [...match[1]].map((digit) => digit + digit).join('') : match[1]
  return `#${digits.toUpperCase()}`
}
