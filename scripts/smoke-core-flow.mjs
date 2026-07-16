const targetUrl = process.env.COLORWIZARD_URL || 'http://localhost:3000'

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

const acceptableConsoleWarnings = [
  /Download the React DevTools/i,
]

const fatalConsolePatterns = [
  /Maximum update depth exceeded/i,
  /Hydration failed/i,
  /There was an error while hydrating/i,
  /Minified React error/i,
  /React has detected a change in the order of Hooks/i,
]

function collectConsoleIssue(message) {
  const type = message.type()
  const text = message.text()

  if (acceptableConsoleWarnings.some((pattern) => pattern.test(text))) {
    return null
  }

  if (fatalConsolePatterns.some((pattern) => pattern.test(text))) {
    return `${type}: ${text}`
  }

  if (type === 'error') {
    return `${type}: ${text}`
  }

  return null
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

  throw new Error('No usable canvas found after demo load')
}

async function assertMobileComposition(page, name) {
  const layout = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="mobile-canvas-stage"]')?.getBoundingClientRect()
    const sheet = document.querySelector('[data-testid="mobile-result-sheet"]')?.getBoundingClientRect()

    return {
      hasCanvas: Boolean(canvas),
      hasSheet: Boolean(sheet),
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      canvasHeight: canvas?.height ?? null,
      canvasBottom: canvas?.bottom ?? null,
      sheetTop: sheet?.top ?? null,
      sheetBottom: sheet?.bottom ?? null,
      sheetHeight: sheet?.height ?? null,
    }
  })

  assert(layout.hasCanvas, `${name}: mobile canvas viewport not found`)
  assert(layout.hasSheet, `${name}: mobile result sheet not found`)
  assert(
    layout.documentWidth <= layout.viewportWidth,
    `${name}: horizontal overflow found (${JSON.stringify(layout)})`,
  )
  assert(
    layout.canvasHeight >= layout.viewportHeight * 0.45,
    `${name}: canvas is not visually dominant (${JSON.stringify(layout)})`,
  )
  assert(
    layout.sheetBottom <= layout.viewportHeight + 1 && layout.sheetTop >= 0,
    `${name}: result sheet is outside the viewport (${JSON.stringify(layout)})`,
  )
  assert(
    layout.sheetHeight <= 124,
    `${name}: collapsed result sheet exceeds its summary height (${JSON.stringify(layout)})`,
  )
}

async function runViewport(browser, name, contextOptions) {
  const context = await browser.newContext(contextOptions)
  const page = await context.newPage()
  const consoleIssues = []

  page.on('console', (message) => {
    const issue = collectConsoleIssue(message)
    if (issue) consoleIssues.push(issue)
  })
  page.on('pageerror', (error) => {
    consoleIssues.push(`pageerror: ${error.message}`)
  })

  await page.goto(targetUrl, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /try demo color terracotta/i }).click()

  await page.waitForTimeout(1500)
  const box = await findUsableCanvas(page)

  if (contextOptions.hasTouch) {
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  } else {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  }

  await page.waitForFunction(() => /#[0-9A-Fa-f]{6}/.test(document.body.innerText), null, { timeout: 15000 })
  if (contextOptions.isMobile) {
    await assertMobileComposition(page, name)
    await page.getByRole('button', { name: /expand sample result/i }).first().click()
  }

  const sampleText = await page.locator('body').innerText()
  assert(/practical mix|target.*predicted result|mixing instructions/i.test(sampleText), `${name}: mix result not found`)

  const valueButton = page.locator('button[aria-label="Toggle value mode"], button[aria-label="Toggle value view"]')
  if (await valueButton.count()) {
    await valueButton.click()
  }
  await page.waitForTimeout(800)
  assert(/band|value/i.test(await page.locator('body').innerText()), `${name}: value mode readout not found`)

  const threadsButton = contextOptions.isMobile
    ? page.getByRole('button', { name: /^threads$/i }).last()
    : page.getByRole('button', { name: /^threads$/i }).first()
  if (await threadsButton.count()) {
    await threadsButton.click()
  }
  await page.waitForTimeout(2500)
  assert(/DMC|Threads|floss/i.test(await page.locator('body').innerText()), `${name}: thread matches not found`)
  assert(consoleIssues.length === 0, `${name}: console issues found\n${consoleIssues.join('\n')}`)

  await context.close()
}

const { chromium } = await loadPlaywright()
const browser = await chromium.launch({ headless: true })

try {
  await runViewport(browser, 'desktop', { viewport: { width: 1440, height: 1000 } })
  await runViewport(browser, 'mobile', {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })

  console.log(`Core flow smoke passed against ${targetUrl}`)
} finally {
  await browser.close()
}
