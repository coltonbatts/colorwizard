import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import sharp from 'sharp'

// Test the public web entry, even when an older invocation supplies /workbench.
const origin = new URL(process.env.COLORWIZARD_URL || 'http://localhost:3000').origin
const artifacts = path.resolve(process.env.COLORWIZARD_ARTIFACTS || 'output/core-flow/smoke')
const savedKey = 'colorwizard-simple-saved'
await mkdir(artifacts, { recursive: true })
const fixture = path.join(artifacts, 'sample-blocks.png')
// A real file upload with independently known pixels on both sides of the image.
await sharp(Buffer.from('<svg width="600" height="400"><path fill="#C65D3B" d="M0 0h300v400H0z"/><path fill="#397DA8" d="M300 0h300v400H300z"/></svg>')).png().toFile(fixture)
const results = []
const browser = await chromium.launch({ headless: true })
const paint = page => page.getByRole('region', { name: 'Paint', exact: true })
const canvas = page => page.locator('canvas[aria-label^="Your picture."]')
const hexReadout = page => page.locator('button[title="Copy hex"]')
const saveButton = page => page.getByRole('button', { name: 'Save Color & Recipe', exact: true })

function watch(page) {
  const issues = []
  page.on('pageerror', error => issues.push(`pageerror: ${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error' || /Hydration failed|Maximum update depth|order of Hooks/i.test(message.text())) issues.push(`${message.type()}: ${message.text()}`)
  })
  return issues
}

async function waitForRecipe(page, hex) {
  await page.waitForFunction(hex => document.querySelector('[data-recipe-target]')?.getAttribute('data-recipe-target') === hex, hex)
  assert.equal(await hexReadout(page).innerText(), hex)
  assert.equal(await paint(page).getAttribute('aria-busy'), 'false')
  const comparison = await paint(page).getByRole('img').getAttribute('aria-label')
  assert.ok(comparison.startsWith(`Target ${hex}, predicted mix #`), comparison)
  const predicted = comparison.slice(-7)
  // These curated colors fit the model. Reject an unrelated recipe, without locking the optimizer's exact answer.
  const rgb = value => [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16))
  assert.ok(rgb(hex).every((channel, i) => Math.abs(channel - rgb(predicted)[i]) < 38), comparison)
  assert.ok(await paint(page).locator('ul').first().locator('li').count() > 0, 'No recipe ingredients')
  return { predicted, ingredients: await paint(page).locator('ul').first().innerText() }
}

async function tap(page, locator, touch) {
  await locator.scrollIntoViewIfNeeded()
  if (touch) await locator.tap()
  else await locator.click()
}

async function pick(page, fraction, touch, expected, verifyPixel = true) {
  await canvas(page).waitFor({ state: 'visible' })
  if (verifyPixel) {
    await page.waitForFunction(({ fraction, expected }) => {
      const c = document.querySelector('canvas[aria-label^="Your picture."]')
      if (!c?.width) return false
      const pixel = c.getContext('2d').getImageData(Math.floor(c.width * fraction), Math.floor(c.height / 2), 1, 1).data
      return '#' + [...pixel].slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase() === expected
    }, { fraction, expected })
  }
  const box = await canvas(page).boundingBox()
  if (touch) await page.touchscreen.tap(box.x + box.width * fraction, box.y + box.height / 2)
  else await page.mouse.click(box.x + box.width * fraction, box.y + box.height / 2)
}

async function upload(page, file, touch) {
  const chooser = page.waitForEvent('filechooser')
  const button = page.getByRole('button', { name: 'Open…', exact: true })
  await tap(page, button, touch)
  await (await chooser).setFiles(file)
  await canvas(page).waitFor({ state: 'visible' })
}

async function saveAndRead(page, touch, hex) {
  const shown = await waitForRecipe(page, hex)
  await tap(page, saveButton(page), touch)
  await page.getByRole('button', { name: 'Saved on this device', exact: true }).waitFor()
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), savedKey)
  const entry = stored.colors.at(-1)
  assert.equal(entry.hex, hex)
  assert.equal(entry.recipe.predictedHex, shown.predicted)
  for (const ingredient of entry.recipe.ingredients) {
    if (ingredient.weight < .005) continue
    assert.ok(shown.ingredients.includes(ingredient.pigment.name), 'Saved ingredient differs from the displayed recipe')
    const amount = entry.recipe.paintable ? `${ingredient.parts} ${ingredient.parts === 1 ? 'part' : 'parts'}` : `${Math.round(ingredient.weight * 100)}%`
    assert.ok(shown.ingredients.includes(amount), 'Saved amount differs from the displayed recipe')
  }
  return { entry, shown }
}

async function assertLayout(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow')
  const box = await paint(page).boundingBox()
  assert.ok(box.width >= 250, 'Recipe is too narrow to use')
}

async function touchGestures(page) {
  const cdp = await page.context().newCDPSession(page)
  const box = await canvas(page).boundingBox()
  const x = box.x + box.width / 2, y = box.y + box.height / 2
  const touch = (id, x, y) => ({ id, x, y, radiusX: 2, radiusY: 2 })
  const dispatch = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints })
  const before = await hexReadout(page).innerText()
  await dispatch('touchStart', [touch(1, x - 30, y), touch(2, x + 30, y)])
  await dispatch('touchMove', [touch(1, x - 70, y), touch(2, x + 70, y)])
  await dispatch('touchEnd', [])
  const fit = page.getByTitle('Fit to window (0)')
  assert.notEqual(await fit.innerText(), 'Fit', 'Pinch did not zoom')
  await dispatch('touchStart', [touch(1, x, y)])
  await dispatch('touchMove', [touch(1, x + 24, y + 15)])
  await dispatch('touchEnd', [])
  assert.equal(await hexReadout(page).innerText(), before, 'Pan accidentally changed the sample')
  await fit.tap()
  assert.equal(await fit.innerText(), 'Fit')
  await dispatch('touchStart', [touch(1, box.x + box.width * .35, y)])
  await page.waitForTimeout(450) // deliberate long press, longer than the gesture threshold
  assert.equal(await hexReadout(page).innerText(), '#C65D3B', 'Long press did not sample')
  await dispatch('touchEnd', [])
  await cdp.detach()
}

async function runViewport(name, options) {
  const context = await browser.newContext(options)
  const page = await context.newPage()
  const issues = watch(page)
  try {
    // Delay real worker requests to exercise the interval after debounce and before a result arrives.
    await context.addInitScript(() => {
      const post = Worker.prototype.postMessage
      Worker.prototype.postMessage = function (...args) { setTimeout(() => post.apply(this, args), 350) }
    })
    await page.goto(origin, { waitUntil: 'networkidle' })
    await tap(page, page.getByRole('button', { name: 'Try demo color Terracotta', exact: true }), options.hasTouch)
    await pick(page, .5, options.hasTouch, '#C45C3E')
    await waitForRecipe(page, '#C45C3E')
    await saveAndRead(page, options.hasTouch, '#C45C3E')
    await upload(page, fixture, options.hasTouch)
    await pick(page, .35, options.hasTouch, '#C65D3B')
    const warm = await waitForRecipe(page, '#C65D3B')
    await pick(page, .65, options.hasTouch, '#397DA8')
    await page.waitForTimeout(180) // debounce elapsed; worker request is deliberately still pending
    assert.equal(await paint(page).getAttribute('aria-busy'), 'true')
    assert.equal(await paint(page).getByRole('img').count(), 0, 'An old recipe is paired with the new target')
    assert.ok(await saveButton(page).isDisabled(), 'Save is enabled for an unfinished recipe')
    const cool = await waitForRecipe(page, '#397DA8')
    assert.notEqual(warm.predicted, cool.predicted)
    if (options.hasTouch) {
      await touchGestures(page)
      await pick(page, .65, true, '#397DA8', false)
      await waitForRecipe(page, '#397DA8')
    }
    // Value view changes only the picture presentation, never the sampled source color.
    await tap(page, page.getByRole('button', { name: 'Value', exact: true }), options.hasTouch)
    await pick(page, .65, options.hasTouch, '#397DA8', false)
    await waitForRecipe(page, '#397DA8')
    await tap(page, page.getByRole('button', { name: 'Value', exact: true }), options.hasTouch)
    const saved = await saveAndRead(page, options.hasTouch, '#397DA8')
    assert.equal(saved.entry.pictureName, 'sample-blocks.png')
    await assertLayout(page)
    await paint(page).scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(artifacts, `${name}-saved.png`), fullPage: true })
    // Replacing an open image with invalid data must keep the current result and expose the error.
    await upload(page, { name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') }, options.hasTouch)
    const uploadError = page.getByRole('alert').filter({ hasText: 'Couldn’t open that picture' })
    await uploadError.waitFor()
    const errorBox = await uploadError.boundingBox()
    assert.ok(errorBox.y >= 0 && errorBox.y + errorBox.height <= options.viewport.height, 'Upload error is outside the visible viewport')
    await page.screenshot({ path: path.join(artifacts, `${name}-upload-error.png`), fullPage: true })
    assert.equal(await hexReadout(page).innerText(), '#397DA8')
    await page.reload({ waitUntil: 'networkidle' })
    assert.equal(await canvas(page).count(), 0, 'The source picture is deliberately not persisted')
    const recoveredButton = page.getByRole('button', { name: 'Open saved color #397DA8', exact: true })
    await recoveredButton.waitFor()
    await page.screenshot({ path: path.join(artifacts, `${name}-welcome-recovery.png`), fullPage: true })
    await tap(page, recoveredButton, options.hasTouch)
    const recovered = await waitForRecipe(page, '#397DA8')
    assert.deepEqual(recovered, saved.shown, 'Reload changed the saved recipe')
    await paint(page).getByText(/Restored as saved/).waitFor()
    await paint(page).scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(artifacts, `${name}-recovered.png`), fullPage: true })
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).colors.at(-1), savedKey), saved.entry)
    // Recalculate with a changed palette, then recover the original snapshot without changing it.
    await tap(page, page.getByRole('button', { name: 'Make a new recipe' }), options.hasTouch)
    await page.locator('summary').filter({ hasText: 'Your paints' }).click()
    await page.getByRole('button', { name: 'Use my own paints…' }).click()
    await page.getByRole('button', { name: 'Remove Phthalo Blue', exact: true }).click()
    await page.getByRole('button', { name: 'Remove Cadmium Red', exact: true }).click()
    await page.reload({ waitUntil: 'networkidle' })
    await tap(page, page.getByRole('button', { name: 'Open saved color #397DA8', exact: true }), options.hasTouch)
    assert.deepEqual(await waitForRecipe(page, '#397DA8'), saved.shown, 'Palette changes rewrote the saved recipe')
    assert.deepEqual(issues, [], 'Browser console failures')
    console.log(`${name}: passed`)
    results.push({ name, status: 'passed', demo: '#C45C3E', uploaded: ['#C65D3B', '#397DA8'], saved: saved.entry, touch: !!options.hasTouch, consoleIssues: issues })
  } catch (error) {
    results.push({ name, status: 'failed', consoleIssues: issues, body: (await page.locator('body').innerText()).slice(0,3000) })
    await page.screenshot({ path: path.join(artifacts, `${name}-failure.png`), fullPage: true }).catch(() => {})
    throw error
  } finally { await context.close() }
}

async function storageFailures() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const issues = watch(page)
  await page.goto(origin, { waitUntil: 'networkidle' })
  await page.evaluate(key => localStorage.setItem(key, '["#397da8"]'), savedKey)
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Open saved color #397DA8' }).click()
  await waitForRecipe(page, '#397DA8')
  await page.evaluate(key => {
    const write = Storage.prototype.setItem
    window.restoreStorage = () => { Storage.prototype.setItem = write }
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Test quota failure', 'QuotaExceededError')
      write.call(this, name, value)
    }
  }, savedKey)
  await saveButton(page).click()
  const saveError = page.getByRole('alert').filter({ hasText: 'Couldn’t save changes' })
  await saveError.waitFor()
  const errorBox = await saveError.boundingBox()
  assert.ok(errorBox.y >= 0 && errorBox.y + errorBox.height <= 720, 'Save error is outside the visible viewport')
  await page.screenshot({ path: path.join(artifacts, 'storage-error.png'), fullPage: true })
  assert.equal(await page.getByRole('button', { name: 'Saved on this device', exact: true }).count(), 0)
  assert.equal(await page.evaluate(key => localStorage.getItem(key), savedKey), '["#397da8"]')
  await page.evaluate(() => window.restoreStorage())
  await saveAndRead(page, false, '#397DA8')
  await page.evaluate(key => localStorage.setItem(key, '{damaged'), savedKey)
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('alert').filter({ hasText: 'Saved colors couldn’t be read' }).waitFor()
  await page.getByRole('button', { name: 'Try demo color Terracotta' }).click()
  await pick(page, .5, false, '#C45C3E')
  await waitForRecipe(page, '#C45C3E')
  assert.ok(await saveButton(page).isDisabled(), 'Save must be disabled when existing data cannot be read')
  assert.equal(await page.evaluate(key => localStorage.getItem(key), savedKey), '{damaged', 'Damaged saves were overwritten')
  assert.deepEqual(issues, [])
  await context.close()
  results.push({ name: 'storage-boundaries', status: 'passed', checks: ['legacy migration', 'failed save is visible and retryable', 'unreadable saves preserved'] })
}

async function imageAndSolverBoundaries() {
  const context = await browser.newContext()
  await context.addInitScript(() => {
    const decode = window.createImageBitmap
    window.createImageBitmap = async (...args) => {
      if (args[0]?.name === 'slow.png') await new Promise(resolve => setTimeout(resolve, 600))
      return decode(...args)
    }
    // Worker failure must retain the same spectral solver, not substitute a traditional recipe.
    window.Worker = class { constructor() { throw new Error('Test worker unavailable') } }
  })
  const page = await context.newPage()
  const issues = watch(page)
  await page.goto(origin, { waitUntil: 'networkidle' })
  const input = page.locator('input[type=file]')
  await input.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') })
  await page.getByRole('alert').filter({ hasText: 'That file isn’t a picture.' }).waitFor()
  await input.setInputFiles({ name: 'slow.png', mimeType: 'image/png', buffer: await readFile(fixture) })
  await page.getByRole('status').filter({ hasText: 'Opening picture…' }).waitFor()
  // A newer choice wins even when the older image finishes decoding last.
  await page.getByRole('button', { name: 'Try demo color Terracotta' }).click()
  await pick(page, .5, false, '#C45C3E')
  await waitForRecipe(page, '#C45C3E')
  await page.waitForTimeout(700)
  await pick(page, .35, false, '#C45C3E', false)
  await waitForRecipe(page, '#C45C3E')
  await page.evaluate(() => localStorage.setItem('colorwizard-palettes', JSON.stringify({ state: { palettes: [{
    id: 'empty', name: 'Empty test palette', colors: [], isActive: true, isDefault: false, createdAt: 0,
  }] }, version: 0 })))
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Try demo color Terracotta' }).click()
  await pick(page, .5, false, '#C45C3E')
  await page.getByRole('alert').filter({ hasText: 'Couldn’t calculate a paint recipe.' }).waitFor()
  assert.equal(await paint(page).getAttribute('aria-busy'), 'false', 'Failed solver must not show endless loading')
  assert.ok(await saveButton(page).isDisabled())
  await page.getByRole('button', { name: 'Try recipe again' }).click()
  await page.getByRole('alert').filter({ hasText: 'Couldn’t calculate a paint recipe.' }).waitFor()
  await page.locator('summary').filter({ hasText: 'Your paints' }).click()
  await page.getByRole('button', { name: 'Back to the Core six' }).click()
  await waitForRecipe(page, '#C45C3E')
  assert.deepEqual(issues, [])
  await context.close()
  results.push({ name: 'image-and-solver-boundaries', status: 'passed', checks: ['invalid file', 'visible loading', 'last image choice wins', 'worker failure uses spectral fallback', 'solver failure is actionable', 'palette recovery'] })
}

async function artworkUpload(touch) {
  // Upload an existing detailed image as JPEG as well as the flat PNG fixture and demo.
  const file = path.join(artifacts, 'pigment-reference.jpg')
  await sharp('public/images/welcome-pigment-cutout.webp').flatten({ background: '#ffffff' }).jpeg({ quality: 90 }).toFile(file)
  const metadata = await sharp(file).metadata()
  const center = await sharp(file).extract({ left: Math.floor(metadata.width / 2) - 1, top: Math.floor(metadata.height / 2) - 1, width: 3, height: 3 }).raw().toBuffer()
  const expected = [0, 1, 2].map(channel => Math.round(Array.from({ length: 9 }, (_, i) => center[i * 3 + channel]).reduce((a, b) => a + b, 0) / 9))
  const context = await browser.newContext({ viewport: touch ? { width: 390, height: 844 } : { width: 1440, height: 900 }, hasTouch: touch, isMobile: touch })
  const page = await context.newPage(); const issues = watch(page)
  await page.goto(origin, { waitUntil: 'networkidle' })
  const chooser = page.waitForEvent('filechooser')
  await tap(page, page.getByRole('button', { name: 'Open picture' }), touch)
  await (await chooser).setFiles(file)
  await canvas(page).waitFor({ state: 'visible' })
  await page.waitForFunction(() => document.querySelector('canvas[aria-label^="Your picture."]')?.width > 300)
  await pick(page, .5, touch, '', false)
  await hexReadout(page).waitFor()
  const hex = await hexReadout(page).innerText()
  const actual = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  assert.ok(actual.every((channel, i) => Math.abs(channel - expected[i]) <= 2), `JPEG sample ${actual} differs from independent source average ${expected}`)
  const saved = await saveAndRead(page, touch, hex)
  await page.reload({ waitUntil: 'networkidle' })
  await tap(page, page.getByRole('button', { name: `Open saved color ${hex}` }), touch)
  assert.deepEqual(await waitForRecipe(page, hex), saved.shown)
  await page.screenshot({ path: path.join(artifacts, `artwork-${touch ? 'phone' : 'desktop'}.png`), fullPage: true })
  assert.deepEqual(issues, [])
  results.push({ name: `jpeg-upload-${touch ? 'phone' : 'desktop'}`, status: 'passed', expectedRgb: expected, sampledHex: hex, saved: saved.entry })
  await context.close()
}

async function workbenchFlow(touch) {
  const context = await browser.newContext({ viewport: touch ? { width: 390, height: 844 } : { width: 1440, height: 900 }, hasTouch: touch, isMobile: touch })
  const page = await context.newPage()
  const cleanRoute = await context.request.get(`${origin}/workbench`)
  const url = cleanRoute.ok() ? `${origin}/workbench` : `${origin}/workbench.html`
  const issues = watch(page)
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Try demo color Terracotta/i }).click()
  const recipe = page.getByRole('region', { name: 'Paint recipe', exact: true })
  await recipe.locator('.mixed-preview-swatches code').nth(1).waitFor()
  assert.equal(await recipe.locator('.mixed-preview-swatches code').first().innerText(), '#C45C3E')
  const predicted = await recipe.locator('.mixed-preview-swatches code').nth(1).innerText()
  await page.evaluate(() => {
    const write = Storage.prototype.setItem
    window.restoreStorage = () => { Storage.prototype.setItem = write }
    Storage.prototype.setItem = function (key, value) {
      if (key === 'colorwizard-session') throw new DOMException('Test quota failure', 'QuotaExceededError')
      write.call(this, key, value)
    }
  })
  await page.getByRole('button', { name: 'Save Color', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'Couldn’t save this color.' }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Color Saved', exact: true }).count(), 0)
  await page.evaluate(() => window.restoreStorage())
  await page.getByRole('button', { name: 'Save Color', exact: true }).click()
  await page.getByRole('button', { name: 'Color Saved', exact: true }).waitFor()
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('colorwizard-session')).state.pinnedColors[0])
  assert.equal(stored.hex.toUpperCase(), '#C45C3E')
  assert.equal(stored.spectralRecipe.predictedHex.toUpperCase(), predicted)
  await page.reload({ waitUntil: 'networkidle' })
  if (touch) await page.getByRole('button', { name: 'Open navigation menu', exact: true }).tap()
  else await page.locator('summary').filter({ hasText: 'Studio Tools' }).click()
  await page.getByRole('button', { name: /Saved Colors/ }).click()
  const samples = page.getByRole('region', { name: 'Saved samples', exact: true })
  await samples.locator('summary').filter({ hasText: '#C45C3E' }).click()
  const text = await samples.innerText()
  assert.ok(text.includes(`Predicted ${stored.spectralRecipe.predictedHex}`))
  for (const ingredient of stored.spectralRecipe.ingredients) {
    assert.ok(text.includes(ingredient.pigment.name))
    const amount = stored.spectralRecipe.paintable ? `${ingredient.parts} ${ingredient.parts === 1 ? 'part' : 'parts'}` : `${Math.round(ingredient.weight * 100)}%`
    assert.ok(text.includes(amount))
  }
  for (const step of stored.spectralRecipe.steps) assert.ok(text.includes(step.replaceAll('**', '')))
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('colorwizard-session')).state.pinnedColors[0]), stored)
  // Text in the DOM is insufficient: the recipe must be reachable inside the clipped tool panel.
  for (const line of [samples.locator('li').first(), samples.locator('li').last()]) {
    await line.scrollIntoViewIfNeeded()
    const readable = await line.evaluate(element => {
      const rect = element.getBoundingClientRect()
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
      return rect.top >= 0 && rect.bottom <= innerHeight && (hit === element || element.contains(hit))
    })
    assert.ok(readable, 'Saved recipe is clipped or covered and cannot be read')
  }
  await samples.locator('summary').scrollIntoViewIfNeeded()
  await page.screenshot({ path: path.join(artifacts, `workbench-${touch ? 'phone' : 'desktop'}-recovered.png`), fullPage: true })
  assert.deepEqual(issues, [])
  results.push({ name: `workbench-${touch ? 'phone' : 'desktop'}`, status: 'passed', target: '#C45C3E', predicted, checks: ['demo recipe', 'failed save retry', 'saved snapshot recovered through Studio Tools'] })
  await context.close()
}

try {
  for (const [name, options] of [
    ['desktop-1440', { viewport: { width: 1440, height: 900 } }],
    ['desktop-1366', { viewport: { width: 1366, height: 768 } }],
    ['tablet-768', { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true }],
    ['phone-390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
  ]) await runViewport(name, options)
  await storageFailures()
  await imageAndSolverBoundaries()
  await artworkUpload(false)
  await artworkUpload(true)
  await workbenchFlow(false)
  await workbenchFlow(true)
  console.log(`Core painting flow passed against ${origin}; artifacts: ${artifacts}`)
} catch (error) {
  results.push({ status: 'failed', error: error.stack })
  throw error
} finally {
  await writeFile(path.join(artifacts, 'results.json'), JSON.stringify({ origin, results }, null, 2))
  await browser.close()
}
