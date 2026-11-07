import { expect, test } from '@playwright/test'
import { choose, onboard } from './helpers'

// Runs in WebKit with an iPhone profile (see playwright.config.ts): main screens, the app's own
// panels and the iPhone-only cards. What this cannot show is listed in IZVESTAJ.md.

test('1. onboarding i ekran Danas na iPhone profilu; kartica za instalaciju se zatvara za stalno', async ({
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

test('2. glavni ekrani se otvaraju bez grešaka i bez horizontalnog skrola', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await onboard(page, { demo: true })
  for (const route of [
    '/',
    '/faks',
    '/planer',
    '/trening',
    '/zivot',
    '/pregled',
    '/ai',
    '/podesavanja',
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

test('3. donji panel za izbor i birač vremena rade u WebKit-u', async ({ page }) => {
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

test('4. u podešavanjima piše da notifikacije na iPhone-u traže početni ekran', async ({
  page,
}) => {
  await onboard(page)
  await page.goto('/#/podesavanja')
  await expect(page.getByRole('note').filter({ hasText: 'početni ekran' })).toBeVisible()
  await expect(page.getByLabel(/Notifikacije pregledača/)).toHaveCount(0)
})
