import type { Page } from '@playwright/test'

/** Walks through the 7-step onboarding. `demo` = load example data. */
export async function onboard(page: Page, opts: { demo?: boolean } = {}) {
  await page.goto('/')
  // iPhone in Safari sees "install first" before the setup; the tests carry on in the browser
  const welcome = page.getByRole('heading', { name: /Dobrodošao/ })
  const inSafari = page.getByRole('button', { name: 'Nastavi u Safariju' })
  await welcome.or(inSafari).waitFor()
  if (await inSafari.isVisible()) await inSafari.click()
  await welcome.waitFor()
  await page.getByRole('button', { name: 'Dalje' }).click() // language step
  await page.getByLabel('Kako da te zovem?').fill('Test')
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Dalje' }).click()
  const demo = page.getByLabel(/Učitaj demo podatke/)
  if ((await demo.isChecked()) !== !!opts.demo) await demo.click()
  await page.getByRole('button', { name: 'Dalje' }).click()
  await page.getByRole('button', { name: 'Završi' }).click()
  await page.getByRole('heading', { level: 1 }).first().waitFor()
  // the guided tour is offered after the setup; the tests carry on without it
  await skipTour(page)
}

/** Answers "Skip" to the offer of the guided tour. */
export async function skipTour(page: Page) {
  const ask = page.getByRole('dialog', { name: /provedemo kroz aplikaciju/ })
  await ask.waitFor()
  await ask.getByRole('button', { name: 'Preskoči' }).click()
  await ask.waitFor({ state: 'detached' })
}

export const isoDate = (offsetDays = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Chooses an option in the app's own drop-down (bottom panel). */
export async function choose(page: Page, label: string | RegExp, value: string) {
  await page.getByLabel(label).click()
  await page.locator(`[role=option][data-value="${value}"]`).click()
}
