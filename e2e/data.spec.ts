import { expect, test } from '@playwright/test'
import { onboard } from './helpers'

// The data must survive: first install, reload, restart right after a change (update 0.4, phase A).

test('A-01: prva instalacija ne prikazuje „Novi update“', async ({ page }) => {
  await onboard(page)
  // the service worker installs for the first time here; that is not an update
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  await page.waitForTimeout(1500)
  await expect(page.getByText('Novi update')).toHaveCount(0)
})

test('R-01: course, slot, obligation and points stay after a reload; a change followed by an immediate restart', async ({
  page,
}) => {
  await onboard(page)
  await page.goto('/#/study')
  await page.getByLabel('Naziv predmeta').fill('Fizika')
  await page.getByRole('button', { name: 'Dodaj predmet' }).click()
  await page.getByRole('button', { name: '+ Dodaj termin' }).click()
  await page.getByRole('button', { name: 'Dodaj termin', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Idem: Fizika/ })).toBeVisible()
  await page.getByRole('tab', { name: 'Ispit/Kolokvijum' }).click()
  await page.getByRole('button', { name: '+ Nova obaveza' }).click()
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click()
  const points = page.getByLabel(/Osvojeno poena/)
  await points.fill('17')
  await page.waitForTimeout(500) // IndexedDB write
  await page.reload()

  await expect(page.getByRole('button', { name: /^Idem: Fizika/ })).toBeVisible()
  await page.getByRole('tab', { name: 'Ispit/Kolokvijum' }).click()
  await expect(page.getByLabel(/Osvojeno poena/)).toHaveValue('17')

  // a change, and a restart right away: the write must not be lost
  await page.getByLabel(/Osvojeno poena/).fill('21')
  await page.reload()
  await page.getByRole('tab', { name: 'Ispit/Kolokvijum' }).click()
  await expect(page.getByLabel(/Osvojeno poena/)).toHaveValue('21')
  await expect(page.getByRole('heading', { name: /Dobrodošao/ })).toHaveCount(0)
})
