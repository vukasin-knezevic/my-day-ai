import { expect, test } from '@playwright/test'
import { choose, onboard } from './helpers'

// Runs in WebKit with an iPhone profile (see playwright.config.ts): main screens, the app's own
// panels and the iPhone-only cards. What this cannot show is listed in REPORT.md.

test('0. A-03: in Safari the installation and the warning that the data is not carried over are shown before the intro', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Prvo dodaj aplikaciju na početni ekran' }),
  ).toBeVisible()
  await expect(page.getByText(/se ne prenose u instaliranu aplikaciju/)).toBeVisible()
  await page.getByRole('button', { name: 'Nastavi u Safariju' }).click()
  await expect(page.getByRole('heading', { name: /Dobrodošao/ })).toBeVisible()
})

test('1. onboarding and the Today screen on the iPhone profile; the install card closes for good', async ({
  page,
}) => {
  await onboard(page, { demo: true })
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  const hint = page.getByRole('region', { name: 'Instaliraj na iPhone' })
  await expect(hint).toContainText('Deli ⬆️ → Dodaj na početni ekran')
  await hint.getByRole('button', { name: 'Zatvori' }).click()
  await expect(hint).toBeHidden()
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  await expect(page.getByRole('region', { name: 'Instaliraj na iPhone' })).toBeHidden()
})

test('2. the main screens open without errors and without horizontal scroll', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await onboard(page, { demo: true })
  for (const route of [
    '/',
    '/study',
    '/planer',
    '/workout',
    '/zivot',
    '/pregled',
    '/ai',
    '/settings',
  ]) {
    await page.goto(`/#${route}`)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, `${route} overflow`).toBeLessThanOrEqual(0)
  }
  // the bottom navigation is on the screen, not under the browser bar
  const nav = page.getByRole('navigation', { name: /donja|bottom/i })
  await expect(nav).toBeVisible()
  const box = await nav.boundingBox()
  const height = await page.evaluate(() => window.innerHeight)
  expect(box!.y + box!.height).toBeLessThanOrEqual(height + 1)
  expect(errors).toEqual([])
})

test('3. the bottom selection panel and the time picker work in WebKit', async ({ page }) => {
  await onboard(page)
  await page.getByRole('button', { name: '+ Nova aktivnost' }).click()
  await page.getByLabel('Naziv').fill('Šetnja')
  await choose(page, 'Ponavljanje', 'daily')
  await expect(page.getByLabel('Ponavljanje')).toContainText('Svaki dan')
  await page.getByLabel('Početak').click()
  await page
    .getByRole('listbox', { name: 'Sati' })
    .getByRole('option', { name: '17', exact: true })
    .click()
  await page.getByRole('button', { name: 'Gotovo' }).click()
  await expect(page.getByLabel('Početak')).toContainText('17:')
  await page.getByRole('dialog').getByRole('button', { name: 'Dodaj' }).click()
  await expect(page.getByText('Šetnja').first()).toBeVisible()
})

test('4. the settings say that notifications on an iPhone require the home screen', async ({
  page,
}) => {
  await onboard(page)
  await page.goto('/#/settings')
  await expect(page.getByRole('note').filter({ hasText: 'početni ekran' })).toBeVisible()
  await expect(page.getByLabel(/Notifikacije pregledača/)).toHaveCount(0)
})

test('5. the bottom panel follows the drag: past the threshold it closes, below it returns', async ({
  page,
}) => {
  await onboard(page)
  await page.getByRole('button', { name: '+ Nova aktivnost' }).click()
  await page.getByLabel('Ponavljanje').click()
  const dialog = page.getByRole('dialog').filter({ has: page.getByTestId('sheet-grab') })
  await expect(dialog).toBeVisible()
  const grab = dialog.getByTestId('sheet-grab')
  await page.waitForTimeout(500) // the opening animation
  const box = (await grab.boundingBox())!
  const height = (await dialog.boundingBox())!.height
  const x = box.x + box.width / 2
  const y = box.y + 10

  // short drag: follows the finger, then comes back
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y + height * 0.1, { steps: 5 })
  const during = (await dialog.boundingBox())!.y - box.y + 0
  expect(during).toBeGreaterThan(height * 0.05)
  await page.waitForTimeout(400) // slow release: no flick
  await page.mouse.up()
  await expect.poll(async () => Math.abs((await dialog.boundingBox())!.y - box.y)).toBeLessThan(2)

  // long drag: closes
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y + height * 0.6, { steps: 8 })
  await page.mouse.up()
  await expect(dialog).toBeHidden()
})
