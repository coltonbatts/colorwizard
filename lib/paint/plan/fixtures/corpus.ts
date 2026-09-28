/**
 * Loads the plan benchmark corpus: every PNG in this directory, in name order.
 * Node only (reads files); used by the benchmark script and tests, never by the app.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodePng } from './png'
import { SCENES } from './scenes'

export interface CorpusImage {
    name: string
    width: number
    height: number
    /** RGBA */
    data: Uint8Array
    /** True for the generated scenes, false for any real photo dropped into the folder */
    synthetic: boolean
}

export const FIXTURES_DIR = dirname(fileURLToPath(import.meta.url))

const SYNTHETIC = new Set(SCENES.map((scene) => scene.name))

export function loadCorpus(filter: 'all' | 'synthetic' | 'photo' = 'all'): CorpusImage[] {
    return readdirSync(FIXTURES_DIR)
        .filter((file) => file.toLowerCase().endsWith('.png'))
        .sort()
        .map((file) => {
            const name = file.replace(/\.png$/i, '')
            const image = decodePng(readFileSync(join(FIXTURES_DIR, file)))
            return { name, width: image.width, height: image.height, data: image.data, synthetic: SYNTHETIC.has(name) }
        })
        .filter((image) => filter === 'all' || (filter === 'synthetic') === image.synthetic)
}
