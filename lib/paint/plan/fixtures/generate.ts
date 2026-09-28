/**
 * Regenerates the procedural photo corpus:
 *
 *   npx vite-node -c vitest.config.ts lib/paint/plan/fixtures/generate.ts
 *
 * Output is deterministic. Real photos can be added to this directory as 8-bit PNGs
 * (see README.md); they are picked up automatically and this script never touches them.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Canvas } from './paint'
import { encodePng } from './png'
import { SCENES } from './scenes'

const dir = dirname(fileURLToPath(import.meta.url))
mkdirSync(dir, { recursive: true })
let total = 0
for (const scene of SCENES) {
    const canvas = new Canvas(2)
    scene.draw(canvas)
    const png = encodePng(canvas.toImage(scene.seed, scene.exposure ?? 1))
    writeFileSync(join(dir, `${scene.name}.png`), png)
    total += png.length
    console.log(`${scene.name}.png  ${(png.length / 1024).toFixed(0)} KB`)
}
console.log(`total ${(total / 1024 / 1024).toFixed(2)} MB`)
