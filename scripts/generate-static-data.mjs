import { mkdir, readFile, writeFile } from 'node:fs/promises'

const repoRoot = process.cwd()
const publicDataDir = `${repoRoot}/public/data`
const dmcSourcePath = `${repoRoot}/scripts/source/dmcFloss.source.txt`
const colorNamesSourcePath = `${repoRoot}/public/colornames.json`

async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true })
}

async function copyColorNames() {
  const source = await readFile(colorNamesSourcePath, 'utf8')
  await writeFile(`${publicDataDir}/colornames.json`, source)
}

async function generateDmcFloss() {
  const source = await readFile(dmcSourcePath, 'utf8')
  const startToken = 'export const DMC_COLORS: DMCColor[] = ['
  const endToken = '\n]\n\n/**'
  const start = source.indexOf(startToken)

  if (start === -1) {
    throw new Error('Could not locate DMC_COLORS array in source snapshot.')
  }

  const startIndex = start + startToken.length - 1
  const endIndex = source.indexOf(endToken, startIndex)

  if (endIndex === -1) {
    throw new Error('Could not locate end of DMC_COLORS array in source snapshot.')
  }

  const arrayLiteral = source.slice(startIndex, endIndex + 2)
  const dmcColors = Function(`"use strict"; return (${arrayLiteral});`)()
  await writeFile(`${publicDataDir}/dmc-floss.json`, `${JSON.stringify(dmcColors, null, 2)}\n`)
}

await ensureDir(publicDataDir)
await Promise.all([copyColorNames(), generateDmcFloss()])
