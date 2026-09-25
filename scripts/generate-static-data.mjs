import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { enrichDmcCatalog } from './dmc-enrich.mjs'

const repoRoot = process.cwd()
const publicDataDir = `${repoRoot}/public/data`
const dmcSourcePath = `${repoRoot}/scripts/source/dmc-threads.json`
const colorNamesSourcePath = `${repoRoot}/public/colornames.json`

async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true })
}

async function copyColorNames() {
  const source = await readFile(colorNamesSourcePath, 'utf8')
  await writeFile(`${publicDataDir}/colornames.json`, source)
}

/** `photo` threads were measured cleanly; `low` and `legacy` ones may be visibly off. */
function toColorConfidence(confidence) {
  return confidence === 'photo' ? 'measured' : 'approximate'
}

async function generateDmcFloss() {
  const source = JSON.parse(await readFile(dmcSourcePath, 'utf8'))
  const dmcColors = source.threads.map((thread) => ({
    number: thread.number,
    name: thread.name,
    hex: thread.hex,
    rgb: {
      r: parseInt(thread.hex.slice(1, 3), 16),
      g: parseInt(thread.hex.slice(3, 5), 16),
      b: parseInt(thread.hex.slice(5, 7), 16),
    },
    colorConfidence: toColorConfidence(thread.confidence),
  }))
  const { threads, families } = enrichDmcCatalog(dmcColors)

  await writeFile(`${publicDataDir}/dmc-floss.json`, `${JSON.stringify(threads, null, 2)}\n`)
  await writeFile(`${publicDataDir}/dmc-families.json`, `${JSON.stringify(families, null, 2)}\n`)
}

await ensureDir(publicDataDir)
await Promise.all([copyColorNames(), generateDmcFloss()])
