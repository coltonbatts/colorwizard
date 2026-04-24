import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const targetUrl = process.env.COLORWIZARD_URL || 'http://localhost:3000'
const pngBase64 = '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'

async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {
    console.error('Playwright is required for smoke:core. Install it with `npm install --save-dev playwright`.')
    process.exit(1)
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function findUsableCanvas(page) {
  const canvases = page.locator('canvas')
  const count = await canvases.count()

  for (let index = 0; index < count; index += 1) {
    const box = await canvases.nth(index).boundingBox()
    if (box && box.width > 100 && box.height > 100) {
      return box
    }
  }

  throw new Error('No usable canvas found after upload')
}

async function runViewport(browser, imagePath, name, contextOptions) {
  const context = await browser.newContext(contextOptions)
  const page = await context.newPage()
  const consoleIssues = []

  page.on('console', (message) => {
    const text = message.text()
    if (['error', 'warning'].includes(message.type()) && !text.includes('Download the React DevTools')) {
      consoleIssues.push(`${message.type()}: ${text}`)
    }
  })
  page.on('pageerror', (error) => {
    consoleIssues.push(`pageerror: ${error.message}`)
  })

  await page.goto(targetUrl, { waitUntil: 'networkidle' })
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByText('Choose file', { exact: true }).click(),
  ])
  await chooser.setFiles(imagePath)

  await page.waitForTimeout(1500)
  const box = await findUsableCanvas(page)

  if (contextOptions.hasTouch) {
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  } else {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  }

  await page.waitForFunction(() => /#[0-9A-Fa-f]{6}/.test(document.body.innerText), null, { timeout: 15000 })

  const sampleText = await page.locator('body').innerText()
  assert(/starting mix|starting paint mix|mixing steps|paint colors/i.test(sampleText), `${name}: paint mix panel not found`)

  const valueButton = page.locator('button[aria-label="Toggle value mode"]')
  if (await valueButton.count()) {
    await valueButton.click()
  }
  await page.waitForTimeout(800)
  assert(/band|value/i.test(await page.locator('body').innerText()), `${name}: value mode readout not found`)

  const threadsButton = page.locator('button[title*="Threads"]').first()
  if (await threadsButton.count()) {
    await threadsButton.click()
  }
  await page.waitForTimeout(2500)
  assert(/DMC|Threads|floss/i.test(await page.locator('body').innerText()), `${name}: thread matches not found`)
  assert(consoleIssues.length === 0, `${name}: console issues found\n${consoleIssues.join('\n')}`)

  await context.close()
}

const tempDir = await mkdtemp(join(tmpdir(), 'colorwizard-smoke-'))
const imagePath = join(tempDir, 'reference.png')

try {
  const { chromium } = await loadPlaywright()
  await writeFile(imagePath, Buffer.from(pngBase64, 'base64'))

  const browser = await chromium.launch({ headless: true })
  await runViewport(browser, imagePath, 'desktop', { viewport: { width: 1440, height: 1000 } })
  await runViewport(browser, imagePath, 'mobile', {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  await browser.close()

  console.log(`Core flow smoke passed against ${targetUrl}`)
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
