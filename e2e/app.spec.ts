import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { choose, isoDate, onboard } from './helpers'

test('1. onboarding vodi do ekrana Danas', async ({ page }) => {
  await onboard(page)
  await expect(page.getByRole('heading', { level: 1 }).first()).toContainText('🌅')
  await expect(page.getByLabel('Brzi unos')).toBeVisible()
})

test('2. brzi unos dodaje aktivnost i trošak', async ({ page }) => {
  await onboard(page)
  await page.getByLabel('Brzi unos').fill('trening 18-19:30')
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Dodato' })).toBeVisible()
  await expect(page.getByText('18:00–19:30', { exact: true })).toBeVisible()
  await page.getByLabel('Brzi unos').fill('kafa 200')
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click()
  await expect(page.getByText(/Trošak 200 RSD/)).toBeVisible()
})

test('3. idem / ne idem za termin predmeta', async ({ page }) => {
  await onboard(page)
  await page.goto('/#/faks')
  await page.getByLabel('Naziv predmeta').fill('Fizika')
  await page.getByRole('button', { name: 'Dodaj predmet' }).click()
  await page.getByRole('button', { name: '+ Termin' }).click()
  await expect(page.getByText('Da li ideš na ove termine?')).toBeVisible()
  await page.getByRole('button', { name: /^Ne idem: Fizika/ }).click()
  await expect(page.getByText('slobodno vreme')).toBeVisible()
})

test('4. neprijavljen kolokvijum se vidi na ekranu Danas', async ({ page }) => {
  await onboard(page, { demo: true })
  await expect(page.getByText(/Neprijavljen: Prvi kolokvijum/)).toBeVisible()
})

test('5. prijava kolokvijuma sklanja upozorenje i daje XP', async ({ page }) => {
  await onboard(page, { demo: true })
  await page.goto('/#/faks')
  await page.getByRole('tab', { name: 'Ispiti i domaći' }).click()
  await page
    .getByLabel(/Da li si prijavio/)
    .first()
    .check()
  await page.goto('/#/')
  await expect(page.getByText(/Neprijavljen: Prvi kolokvijum/)).toHaveCount(0)
  await expect(page.getByText(/\+20 XP/)).toBeVisible()
})

test('6. trening sa rekordom', async ({ page }) => {
  await onboard(page)
  await page.goto('/#/trening')
  const log = async (kg: string) => {
    await page.getByLabel('Vežba 1').fill('Bench press')
    await page.getByLabel('Kilaža 1').fill(kg)
    await page.getByRole('button', { name: 'Sačuvaj trening' }).click()
  }
  await log('60')
  await expect(page.getByText('Trening sačuvan')).toBeVisible()
  await log('70')
  await expect(page.getByText(/Novi rekord: Bench press 70 kg/)).toBeVisible()
})

test('7. trošak preko budžeta daje upozorenje', async ({ page }) => {
  await onboard(page)
  await page.goto('/#/zivot')
  await page.getByRole('tab', { name: /Novac/ }).click()
  await page.getByRole('spinbutton', { name: 'Hrana' }).fill('100')
  await page.getByLabel('Iznos (RSD)').fill('150')
  await page.getByRole('button', { name: 'Dodaj trošak' }).click()
  await expect(page.getByRole('alert').filter({ hasText: '150%' })).toBeVisible()
})

test('8. "urađeno" daje XP', async ({ page }) => {
  await onboard(page)
  await page.getByLabel('Brzi unos').fill('učenje 18-20')
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click()
  await page.getByRole('button', { name: /Urađeno/ }).click()
  await expect(page.getByText(/\+40 XP/)).toBeVisible()
  await expect(page.getByText('40 XP', { exact: true })).toBeVisible()
})

test('9. podaci ostaju posle reload-a', async ({ page }) => {
  await onboard(page)
  await page.getByLabel('Brzi unos').fill('trening 18-19:30')
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click()
  await expect(page.getByText('18:00–19:30', { exact: true })).toBeVisible()
  await page.waitForTimeout(500) // IndexedDB write
  await page.reload()
  await expect(page.getByText('18:00–19:30', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Dobrodošao/ })).toHaveCount(0)
})

test('10. izvoz i uvoz JSON-a', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await onboard(page, { demo: true })
  await page.goto('/#/podesavanja')
  await page.getByRole('button', { name: 'Kopiraj JSON' }).click()
  await expect(page.getByText('JSON je kopiran')).toBeVisible()
  const json = await page.evaluate(() => navigator.clipboard.readText())
  expect(json).toContain('Predmet 1 (primer)')
  expect(json).not.toContain('sk-ant')
  // delete everything (confirmation is inside the page), then import back
  await page.getByRole('button', { name: 'Obriši sve podatke' }).click()
  await page.getByRole('button', { name: 'Da, obriši sve' }).click()
  await expect(page.getByRole('heading', { name: /Dobrodošao/ })).toBeVisible()
  // the reload inside onboard() must not overtake the asynchronous IndexedDB write
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<boolean>((resolve) => {
            const open = indexedDB.open('keyval-store')
            open.onsuccess = () => {
              const all = open.result.transaction('keyval').objectStore('keyval').getAll()
              all.onsuccess = () =>
                resolve(JSON.stringify(all.result).includes('onboarded\\":true'))
            }
          }),
      ),
    )
    .toBe(false)
  await onboard(page)
  await page.goto('/#/podesavanja')
  await page.getByLabel('Uvoz: nalepi JSON').fill(json)
  await page.getByRole('button', { name: 'Proveri uvoz' }).click()
  await page.getByRole('button', { name: 'Da, uvezi' }).click()
  await expect(page.getByText('Podaci su uvezeni')).toBeVisible()
  await page.goto('/#/faks')
  await expect(page.getByText('Predmet 1 (primer)').first()).toBeVisible()
})

test('11. tamna tema', async ({ page }) => {
  await onboard(page)
  await page.goto('/#/podesavanja')
  await choose(page, 'Tema', 'dark')
  await expect(page.locator('html')).toHaveClass(/dark/)
  await choose(page, 'Tema', 'light')
  await expect(page.locator('html')).not.toHaveClass(/dark/)
})

test('12. prečice na tastaturi', async ({ page }) => {
  await onboard(page)
  await page.goto('/#/podesavanja')
  await page.locator('body').press('?')
  await expect(page.getByRole('dialog', { name: 'Prečice na tastaturi' })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.locator('body').press('w')
  await expect(page).toHaveURL(/#\/pregled/)
  await page.locator('body').press('/')
  await expect(page.getByLabel('Brzi unos')).toBeFocused()
})

test('13. ručni AI režim: nalepljen odgovor postaje predlog', async ({ page }) => {
  await onboard(page)
  await page.goto('/#/ai')
  const json = JSON.stringify({
    summary: 'Fokus',
    activities: [
      { title: 'Učenje', category: 'study', date: isoDate(), start: '10:00', end: '12:00' },
    ],
  })
  await page.getByLabel('Nalepi odgovor').fill(`Evo plana 💪\n\`\`\`json\n${json}\n\`\`\`\nSrećno!`)
  await page.getByRole('button', { name: 'Proveri odgovor' }).click()
  await page.getByRole('button', { name: 'Prihvati', exact: true }).click()
  await page.goto('/#/')
  await expect(page.getByText('predlog', { exact: true })).toBeVisible()
})

test('14. nema horizontalnog skrola na 390 / 800 / 1920 px', async ({ page }) => {
  await onboard(page, { demo: true })
  for (const w of [390, 800, 1920]) {
    await page.setViewportSize({ width: w, height: 900 })
    for (const route of [
      '/',
      '/faks',
      '/trening',
      '/zivot',
      '/planer',
      '/pregled',
      '/ai',
      '/podesavanja',
    ]) {
      await page.goto(`/#${route}`)
      await page.waitForTimeout(100)
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(over, `${route} @${w}px`).toBeLessThanOrEqual(0)
    }
  }
})

test('17. onboarding samo tastaturom (Enter = Dalje, Esc = Nazad)', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('heading', { name: /Dobrodošao/ }).waitFor()
  await page.keyboard.press('Enter') // the language field is focused automatically
  await page.getByLabel('Kako da te zovem?').fill('Tasta')
  for (let i = 0; i < 5; i++) await page.keyboard.press('Enter')
  await expect(page.getByText(/Korak 7 od 7/)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByText(/Korak 6 od 7/)).toBeVisible()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Brzi unos')).toBeVisible()
})

test('18. polje za broj: brisanje pa kucanje nema nulu ispred', async ({ page }) => {
  await onboard(page)
  await page.goto('/#/podesavanja')
  const field = page.getByLabel('Učenje (h/dan)')
  await field.fill('')
  await expect(field).toHaveValue('')
  await field.pressSequentially('3')
  await expect(field).toHaveValue('3')
})

test('19. izmena i ponavljanje aktivnosti', async ({ page }) => {
  await onboard(page)
  await page.getByRole('button', { name: '+ Nova aktivnost' }).click()
  await page.getByLabel('Naziv').fill('Šetnja')
  await choose(page, 'Ponavljanje', 'daily')
  await page.getByRole('dialog').getByRole('button', { name: 'Dodaj' }).click()
  await expect(page.getByText('Šetnja').first()).toBeVisible()
  await page.getByRole('button', { name: 'Izmeni Šetnja' }).click()
  await page.getByLabel('Naziv').fill('Duga šetnja')
  await page.getByRole('button', { name: 'Sačuvaj izmene' }).click()
  await expect(page.getByText('Duga šetnja').first()).toBeVisible()
})

test.describe('pristupačnost (axe, WCAG A/AA)', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`15. bez povreda na svim ekranima, ${theme} tema`, async ({ page }) => {
      await onboard(page, { demo: true })
      await page.goto('/#/podesavanja')
      await choose(page, 'Tema', theme)
      for (const route of [
        '/',
        '/faks',
        '/trening',
        '/zivot',
        '/planer',
        '/pregled',
        '/ai',
        '/vise',
        '/podesavanja',
      ]) {
        await page.goto(`/#${route}`)
        await page.waitForTimeout(150)
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
        expect(
          r.violations.map((v) => `${route}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target}`),
          route,
        ).toEqual([])
      }
    })
  }
})

test.describe('jezici', () => {
  test('20. engleski u onboardingu i podešavanjima, izbor se pamti', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('heading', { name: /Dobrodošao/ }).waitFor()
    await choose(page, 'Jezik', 'en')
    await expect(page.getByRole('heading', { name: /Welcome to My Day AI/ })).toBeVisible()
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByLabel('What should I call you?').fill('Alex')
    for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: 'Finish' }).click()
    await expect(page.getByLabel('Quick entry')).toBeVisible()
    await page.getByLabel('Quick entry').fill('coffee 200')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByText(/Expense 200 USD/)).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Quick entry')).toBeVisible()
    await page.goto('/#/podesavanja')
    await expect(page.getByRole('heading', { name: /Settings/ })).toBeVisible()
    await choose(page, 'Language', 'sr-Cyrl')
    await expect(page.getByRole('heading', { name: /Подешавања/ })).toBeVisible()
    await choose(page, 'Језик', 'sr-Latn')
    await expect(page.getByRole('heading', { name: /Podešavanja/ })).toBeVisible()
  })

  test('21. svi jezici bez horizontalnog skrola i bez axe povreda', async ({ page }) => {
    test.setTimeout(150_000) // 6 languages x 8 screens, each with an axe scan
    await onboard(page, { demo: true })
    for (const lang of ['en', 'sr-Cyrl', 'de', 'ru', 'fr', 'es']) {
      await page.goto('/#/podesavanja')
      await choose(page, /Jezik|Language|Језик|Sprache|Язык|Langue|Idioma/, lang)
      for (const route of [
        '/',
        '/faks',
        '/trening',
        '/zivot',
        '/planer',
        '/pregled',
        '/ai',
        '/podesavanja',
      ]) {
        await page.goto(`/#${route}`)
        await page.waitForTimeout(120)
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(overflow, `${lang} ${route} overflow`).toBeLessThanOrEqual(0)
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
        expect(r.violations.map((v) => `${lang} ${route}: ${v.id}`)).toEqual([])
      }
    }
  })
})
