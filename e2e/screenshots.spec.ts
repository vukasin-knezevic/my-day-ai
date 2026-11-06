import { test } from '@playwright/test'
import { onboard } from './helpers'

// Generates docs/screenshots/*.png. Run with:  SCREENSHOTS=1 npx playwright test screenshots
test.skip(!process.env.SCREENSHOTS, 'only when SCREENSHOTS=1')

const SIZES = { telefon: { width: 390, height: 844 }, laptop: { width: 1440, height: 900 } }
const SCREENS: [string, string][] = [
  ['danas', '/'],
  ['faks', '/faks'],
  ['planer', '/planer'],
  ['trening', '/trening'],
  ['pregled', '/pregled'],
]

test('screenshots', async ({ page }) => {
  test.setTimeout(120_000)
  await onboard(page, { demo: true })
  await page.getByLabel('Brzi unos').fill('trening 18-19:30')
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click()
  await page.getByLabel('Brzi unos').fill('učenje 10-12')
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click()
  await page.goto('/#/planer')
  await page.getByRole('button', { name: 'Predloži plan' }).click()
  for (const theme of ['light', 'dark'] as const) {
    await page.goto('/#/podesavanja')
    await page.getByLabel('Tema').selectOption(theme)
    for (const [device, size] of Object.entries(SIZES)) {
      await page.setViewportSize(size)
      for (const [name, route] of SCREENS) {
        await page.goto(`/#${route}`)
        await page.waitForTimeout(400)
        await page.screenshot({
          path: `docs/screenshots/${name}-${device}-${theme}.png`,
          fullPage: device === 'telefon',
        })
      }
    }
  }
})
