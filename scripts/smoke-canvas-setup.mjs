import assert from 'node:assert/strict'
import { access, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

// Canvas setup and painting packet smoke test.
// Run against a dev server: `npm run dev -- -p 3018` then
//   npm run smoke:canvas
// The click coordinates below belong to the reference painting shipped with the
// original verification run, so a different reference needs new coordinates and
// a new expected crop size. Override the inputs with:
//   COLORWIZARD_URL, COLORWIZARD_REFERENCE, COLORWIZARD_ARTIFACTS
const url = new URL(process.env.COLORWIZARD_URL || 'http://localhost:3018').origin
const reference = process.env.COLORWIZARD_REFERENCE || '/Users/coltonbatts/Downloads/0_1 (2).png'
const artifacts = path.resolve(process.env.COLORWIZARD_ARTIFACTS || 'output/canvas-setup-smoke')
const demoPicture = path.join(process.cwd(), 'public/images/demo/hokusai-umezawa.webp')
await mkdir(artifacts, { recursive: true })
try {
  await access(reference)
} catch {
  throw new Error(`Reference picture not found: ${reference}. Set COLORWIZARD_REFERENCE to the verified painting.`)
}
const browser = await chromium.launch({ headless: true })
const key = 'colorwizard-canvas-setup-v1'
const stageSelector = 'canvas[class*="stageCanvas"]'
const problems = []
const attachErrors = (page) => {
  page.on('pageerror', (error) => problems.push(String(error)))
  page.on('console', (message) => { if (message.type() === 'error') problems.push(message.text()) })
}
const saved = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key))?.draft, key)
const button = (page, name) => page.getByRole('button', { name, exact: true })
const openImage = async (page, file = reference) => {
  await page.locator('input[type=file][accept="image/*"]').setInputFiles(file)
  await page.locator(stageSelector).waitFor()
}
const gridPixel = async (page, x, y) => page.locator(stageSelector).evaluate((canvas, { x, y }) => (
  Array.from(canvas.getContext('2d').getImageData(Math.round(x * devicePixelRatio), Math.round(y * devicePixelRatio), 1, 1).data)
), { x, y })
const countMarks = (page) => page.getByRole('textbox', { name: /^Name for mark / }).count()
const previewName = 'Centered crop preview'
const checkFrame = async (page) => {
  const line = await gridPixel(page, 550, 176)
  const sky = await gridPixel(page, 554, 176)
  assert.ok(Math.abs(line[0] - sky[0]) > 35, JSON.stringify({ line, sky }))
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await desktop.newPage()
  attachErrors(page)
  await page.addInitScript(() => { window.print = () => window.__didPrint = true })
  await page.goto(url, { waitUntil: 'networkidle' })
  await openImage(page)
  await button(page, 'Canvas setup').click()
  await page.getByRole('img', { name: previewName }).waitFor()
  assert.match(await page.locator('figcaption').filter({ hasText: 'Centered crop' }).innerText(), /1968 × 2460 px/)
  await button(page, 'Lock centered crop').click()
  await page.getByRole('checkbox', { name: 'Show 3-inch transfer grid' }).waitFor()
  await checkFrame(page)
  await page.getByRole('checkbox', { name: 'Show 3-inch transfer grid' }).uncheck()
  const ungridded = await gridPixel(page, 550, 176)
  assert.ok(ungridded[0] < 80)
  await page.getByRole('checkbox', { name: 'Show 3-inch transfer grid' }).check()
  await checkFrame(page)

  let markNumber = 0
  const addMarks = async (targets) => {
    for (const [name, x, y] of targets) {
      await page.mouse.click(x, y)
      markNumber++
      await page.getByRole('textbox', { name: 'Name for mark ' + markNumber, exact: true }).fill(name)
    }
  }
  await button(page, 'Place landmark').click()
  await addMarks([
    ['Left figure · head', 325, 420],
    ['Left figure · reaching hand', 412, 469],
    ['Left figure · planted foot', 364, 594],
    ['Center figure · bowed head', 528, 436],
    ['Center figure · lower-left foot', 415, 644],
    ['Center figure · bent knee', 531, 621],
    ['Right foreground · head', 700, 452],
    ['Right foreground · reaching hand', 605, 565],
    ['Right foreground · near foot', 651, 673],
    ['Right foreground · far foot', 779, 698],
  ])
  await button(page, 'Sample mix trial').click()
  await addMarks([
    ['Green-black upper sky', 504, 140],
    ['Cool lower sky', 367, 320],
    ['Warm haze behind figures', 529, 388],
    ['Center coat dark', 500, 528],
    ['Warm foreground earth', 470, 736],
    ['Center shirt light', 532, 478],
    ['Center reaching hand', 430, 499],
  ])
  await button(page, 'Sample mix trial').click()
  assert.equal(await countMarks(page), 17)
  assert.equal((await saved(page)).landmarks.filter((mark) => mark.trial).length, 7)
  const expectedSamples = (await saved(page)).landmarks.filter((mark) => mark.trial).map((mark) => [mark.name, mark.trial.hex])
  assert.equal(await page.getByLabel('From landmark', { exact: true }).count(), 1)
  await page.getByLabel('From landmark', { exact: true }).selectOption({ label: '4. Center figure · bowed head' })
  for (const label of ['5. Center figure · lower-left foot', '17. Center reaching hand']) {
    await page.getByLabel('To landmark', { exact: true }).selectOption({ label })
    await button(page, 'Save span').click()
  }
  assert.equal((await saved(page)).spans.length, 2)
  const baseline = await saved(page)
  await page.getByRole('button', { name: 'Zoom in (+)', exact: true }).click()
  await page.waitForTimeout(450)
  await page.mouse.move(520, 350)
  await page.mouse.down()
  await page.mouse.move(582, 405, { steps: 8 })
  await page.mouse.up()
  assert.deepEqual(await saved(page), baseline)
  await page.setViewportSize({ width: 1280, height: 820 })
  assert.deepEqual(await saved(page), baseline)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.keyboard.press('0')
  await page.waitForTimeout(500)

  await button(page, 'Value').click()
  await checkFrame(page)
  await button(page, 'Value').click()
  await button(page, 'Process').click()
  await page.getByText('Tone the canvas', { exact: true }).waitFor()
  await checkFrame(page)
  await button(page, 'Plan').click()
  const packet = button(page, 'Print painting packet')
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((el) => el.textContent.trim() === 'Print painting packet' && !el.disabled))
  await checkFrame(page)

  await page.reload({ waitUntil: 'networkidle' })
  await openImage(page, demoPicture)
  assert.equal(await countMarks(page), 0)
  await openImage(page)
  await page.getByText('Canvas draft restored.', { exact: true }).waitFor()
  assert.deepEqual(await saved(page), baseline)
  assert.equal(await countMarks(page), 17)

  // Verify recorded measurements reach the print layout, then clear test-only paint observations.
  const measured = page.getByLabel('Tube names and measured volume parts for Center reaching hand', { exact: true })
  await measured.fill('Browser test only')
  const accepted = page.getByLabel('Accept this mix for batching', { exact: true }).last()
  await accepted.check()
  await button(page, 'Open Plan to print packet').click()
  await packet.click({ timeout: 25000 })
  await page.waitForFunction(() => window.__didPrint)
  const sheet = page.locator('[data-plan-card]')
  assert.match(await sheet.textContent(), /Accepted for batchingBrowser test only/)
  assert.match(await sheet.textContent(), /Warm foreground earth/)
  assert.equal(await sheet.locator('table[aria-label="Landmark measurements"]').locator('tbody tr').count(), 17)
  assert.equal(await sheet.locator('table[aria-label="Base pile trials"]').locator('tbody tr').count(), 8)
  await page.evaluate(() => { window.dispatchEvent(new Event('afterprint')); window.__didPrint = false })
  await sheet.waitFor({ state: 'detached' })
  await button(page, 'Canvas setup').click()
  await measured.fill('')
  await measured.press('Backspace')
  assert.equal((await saved(page)).landmarks.at(-1).trial.measured, '')
  assert.equal((await saved(page)).landmarks.at(-1).trial.acceptedPalette, null)
  await button(page, 'Open Plan to print packet').click()
  await packet.click({ timeout: 25000 })
  await page.waitForFunction(() => window.__didPrint)
  assert.doesNotMatch(await sheet.textContent(), /Browser test only|Accepted for batching/)
  const letterPacket = await sheet.textContent()
  assert.match(letterPacket, /The Core six · 8 piles/)
  const closePrint = async () => {
    await page.evaluate(() => { window.dispatchEvent(new Event('afterprint')); window.__didPrint = false })
    await sheet.waitFor({ state: 'detached' })
  }
  await page.pdf({ path: path.join(artifacts, '24x30-oil-painting-packet.pdf'), format: 'Letter', printBackground: true, preferCSSPageSize: true })
  await closePrint()
  await packet.click()
  await page.waitForFunction(() => window.__didPrint)
  await page.pdf({ path: path.join(artifacts, 'packet-a4.pdf'), format: 'A4', printBackground: false, preferCSSPageSize: true })
  await closePrint()
  await page.locator('summary').filter({ hasText: 'Your paints' }).click()
  await button(page, 'Use my own paints…').click()
  await button(page, 'Remove Cadmium Red').click()
  await page.locator('input[name="plan-budget"][value="5"]').check()
  await packet.click({ timeout: 25000 })
  await page.waitForFunction(() => window.__didPrint)
  const customPacket = await sheet.textContent()
  assert.match(customPacket, /My paints · 5 piles/)
  assert.doesNotMatch(customPacket, /Cadmium Red/)
  assert.equal(await sheet.locator('table[aria-label="Base pile trials"] tbody tr').count(), 5)
  console.log('Desktop passed. Printed targets:', JSON.stringify(expectedSamples))

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  attachErrors(phone)
  await phone.goto(url, { waitUntil: 'networkidle' })
  await openImage(phone)
  await button(phone, 'Canvas setup').tap()
  await button(phone, 'Lock centered crop').tap()
  await button(phone, 'Place landmark').tap()
  const box = await phone.locator(stageSelector).boundingBox()
  await phone.touchscreen.tap(Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2))
  await phone.getByRole('textbox', { name: 'Name for mark 1', exact: true }).waitFor()
  assert.equal((await saved(phone)).landmarks.length, 1)
  assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth), 390)
  await phone.screenshot({ path: path.join(artifacts, 'setup-phone.png') })
  assert.deepEqual(problems, [])
  console.log('Phone passed. No browser errors.')
} finally {
  await browser.close()
}
