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

/**
 * Three flat bands (wall, skin, shadow): a picture with fewer colors than a 12-pile budget, so its
 * plan always comes back short ("N of 12 piles"). For the export tests; not part of the benchmark.
 */
export function bandsPicture(): CorpusImage {
    const width = 96
    const height = 48
    const bands: Array<[number, number, number]> = [[0x80, 0x77, 0x70], [0xd8, 0xa0, 0x80], [0x3a, 0x30, 0x2c]]
    const data = new Uint8Array(width * height * 4)
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) data.set([...bands[Math.floor((x * bands.length) / width)], 255], (y * width + x) * 4)
    return { name: 'bands', width, height, data, synthetic: true }
}
