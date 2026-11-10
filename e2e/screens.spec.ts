// A short walk through the screens in other browsers and sizes (Firefox, a tablet, a 1920 px monitor):
// every screen opens without errors and without a sideways scroll. The long tests run in Chromium.
import { expect, test } from '@playwright/test'
import { onboard } from './helpers'

const ROUTES = [
  '/',
  '/faks',
  '/trening',
  '/zivot',
  '/pregled',
  '/planer',
  '/ai',
  '/dostignuca',
  '/podesavanja',
]

test('svi ekrani se otvaraju bez grešaka i bez horizontalnog skrola', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await onboard(page, { demo: true })
  for (const route of ROUTES) {
    await page.goto(`/#${route}`)
    await page.getByRole('heading', { level: 1 }).first().waitFor()
    const wide = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(wide, `${info.project.name} ${route}`).toBeLessThanOrEqual(1)
  }
  expect(errors).toEqual([])
})

test('na širokom ekranu Danas ima dve kolone: obaveze levo, linija dana desno', async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== 'desktop1920' && info.project.name !== 'tablet',
    'samo za široke ekrane',
  )
  await onboard(page, { demo: true })
  await page.goto('/#/')
  const duties = page.getByRole('heading', { name: 'Obaveze' }).first()
  const timeline = page.getByRole('heading', { name: 'Vremenska linija' }).first()
  await expect(duties).toBeVisible()
  const a = await duties.boundingBox()
  const b = await timeline.boundingBox()
  if (info.project.name === 'desktop1920') {
    // side by side: the timeline is in the right column
    expect(b!.x).toBeGreaterThan(a!.x + 300)
  }
})
