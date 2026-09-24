const targetUrl = process.env.COLORWIZARD_URL || 'http://localhost:3000/workbench'

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
      canvasTop: canvas?.top ?? null,
      canvasBottom: canvas?.bottom ?? null,
      sheetTop: sheet?.top ?? null,
      sheetBottom: sheet?.bottom ?? null,
      sheetHeight: sheet?.height ?? null,
      sheetState: document.querySelector('[data-testid="mobile-result-sheet"]')?.getAttribute('data-sheet-state'),
    }
  })

  assert(layout.hasCanvas, `${name}: mobile canvas viewport not found`)
  assert(layout.hasSheet, `${name}: mobile result sheet not found`)
  assert(
    layout.documentWidth <= layout.viewportWidth,
    `${name}: horizontal overflow found (${JSON.stringify(layout)})`,
  )
  assert(
    layout.canvasHeight >= layout.viewportHeight * 0.7,
    `${name}: canvas stage does not fill the available workspace (${JSON.stringify(layout)})`,
  )
  assert(
    layout.sheetBottom <= layout.viewportHeight + 1 && layout.sheetTop >= 0,
    `${name}: result sheet is outside the viewport (${JSON.stringify(layout)})`,
  )
  assert(
    layout.sheetState === 'medium',
    `${name}: sampled result did not open automatically (${JSON.stringify(layout)})`,
  )
  assert(
    layout.sheetHeight >= layout.viewportHeight * 0.35 && layout.sheetHeight <= layout.viewportHeight * 0.65,
    `${name}: medium result sheet has an unusable height (${JSON.stringify(layout)})`,
  )
  assert(
    layout.sheetTop - (layout.canvasTop ?? 0) >= layout.viewportHeight * 0.3,
    `${name}: result sheet leaves too little visible canvas (${JSON.stringify(layout)})`,
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
    const sheetTop = await page.locator('[data-testid="mobile-result-sheet"]').evaluate((sheet) => (
      sheet.getBoundingClientRect().top
    ))
    const visibleCanvasCenterY = box.y + Math.max(44, (sheetTop - box.y) / 2)
    await page.touchscreen.tap(box.x + box.width / 2, visibleCanvasCenterY)
  } else {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  }

  await page.waitForFunction(() => /#[0-9A-Fa-f]{6}/.test(document.body.innerText), null, { timeout: 15000 })
  if (contextOptions.isMobile) {
    await assertMobileComposition(page, name)
    await page.getByRole('button', { name: /more guidance/i }).click()
    assert(/advanced mixing guidance/i.test(await page.locator('body').innerText()), `${name}: expanded mixing guidance not found`)
  }

  const sampleText = await page.locator('body').innerText()
  assert(/practical mix|target.*predicted result|mixing instructions/i.test(sampleText), `${name}: mix result not found`)

  const valueButton = page.locator('button[aria-label="Toggle value mode"], button[aria-label="Toggle value view"]')
  if (await valueButton.count()) {
    await valueButton.click()
  }
  await page.waitForTimeout(800)
  assert(/band|value/i.test(await page.locator('body').innerText()), `${name}: value mode readout not found`)

  const threadsButton = page.getByRole('button', { name: /embroidery match/i }).first()
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
  await runViewport(browser, 'desktop-1440', { viewport: { width: 1440, height: 900 } })
  await runViewport(browser, 'desktop-1366', { viewport: { width: 1366, height: 768 } })
  await runViewport(browser, 'tablet-768', {
    viewport: { width: 768, height: 1024 },
    isMobile: true,
    hasTouch: true,
  })
  await runViewport(browser, 'mobile-390', {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })

  console.log(`Core flow smoke passed against ${targetUrl}`)
} finally {
  await browser.close()
}
