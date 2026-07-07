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

async function assertNoMobileOverlap(page, name) {
  const layout = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="image-canvas-viewport"]')?.getBoundingClientRect()
    const dashboard = document.querySelector('[data-testid="mobile-sample-dashboard-region"]')?.getBoundingClientRect()
    const toolbar = document.querySelector('[data-testid="mobile-bottom-toolbar"]')?.getBoundingClientRect()

    return {
      hasCanvas: Boolean(canvas),
      hasDashboard: Boolean(dashboard),
      hasToolbar: Boolean(toolbar),
      canvasBottom: canvas?.bottom ?? null,
      dashboardTop: dashboard?.top ?? null,
      dashboardBottom: dashboard?.bottom ?? null,
      toolbarTop: toolbar?.top ?? null,
    }
  })

  assert(layout.hasCanvas, `${name}: mobile canvas viewport not found`)
  assert(layout.hasDashboard, `${name}: mobile sample dashboard not found`)
  assert(layout.hasToolbar, `${name}: mobile bottom toolbar not found`)
  assert(
    layout.canvasBottom <= layout.dashboardTop + 1,
    `${name}: mobile canvas overlaps sample dashboard (${JSON.stringify(layout)})`,
  )
  assert(
    layout.dashboardBottom <= layout.toolbarTop + 1,
    `${name}: mobile dashboard overlaps bottom toolbar (${JSON.stringify(layout)})`,
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
    await assertNoMobileOverlap(page, name)
  }

  const sampleText = await page.locator('body').innerText()
  assert(/starting mix|starting paint mix|mixing steps|paint colors/i.test(sampleText), `${name}: paint mix panel not found`)

  const valueButton = page.locator('button[aria-label="Toggle value mode"]')
  if (await valueButton.count()) {
    await valueButton.click()
  }
  await page.waitForTimeout(800)
  assert(/band|value/i.test(await page.locator('body').innerText()), `${name}: value mode readout not found`)

  const threadsButton = page.getByRole('button', { name: /threads/i }).first()
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
