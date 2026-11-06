import type { Page } from '@playwright/test'

/** Walks through the 5-step onboarding. `demo` = load example data. */
export async function onboard(page: Page, opts: { demo?: boolean } = {}) {
  await page.goto('/')
  await page.getByRole('heading', { name: /Dobrodošao/ }).waitFor()
  await page.getByLabel('Kako da te zovem?').fill('Test')
  await page.getByRole('button', { name: 'Dalje' }).click()
  await page.getByRole('button', { name: 'Dalje' }).click()
  await page.getByRole('button', { name: 'Dalje' }).click()
  const demo = page.getByLabel(/Učitaj demo podatke/)
  if ((await demo.isChecked()) !== !!opts.demo) await demo.click()
  await page.getByRole('button', { name: 'Dalje' }).click()
  await page.getByRole('button', { name: 'Završi' }).click()
  await page.getByRole('heading', { level: 1 }).first().waitFor()
}

export const isoDate = (offsetDays = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
