import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { choose, isoDate, onboard, skipTour } from './helpers'

test('1. onboarding vodi do ekrana Danas', async ({ page }) => {
  await onboard(page)
  await expect(page.getByRole('heading', { level: 1 }).first()).toContainText('🌅')
  await expect(page.getByLabel('Brzi unos')).toBeVisible()
})

test('2. quick entry adds an activity and an expense', async ({ page }) => {
  await onboard(page)
  await page.getByLabel('Brzi unos').fill('trening 18-19:30')
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Dodato' })).toBeVisible()
  await expect(page.getByText('18:00–19:30', { exact: true })).toBeVisible()
  await page.getByLabel('Brzi unos').fill('kafa 200')
  await page.getByRole('button', { name: 'Dodaj', exact: true }).click()
  await expect(page.getByText(/Trošak 200 RSD/)).toBeVisible()
})

test('3. going / not going for a course slot', async ({ page }) => {
  await onboard(page)
  await page.goto('/#/study')
  await page.getByLabel('Naziv predmeta').fill('Fizika')
  await page.getByRole('button', { name: 'Dodaj predmet' }).click()
  await page.getByRole('button', { name: '+ Dodaj termin' }).click()
  await page.getByRole('button', { name: 'Dodaj termin', exact: true }).click()
  // the choice sits next to the class (new classes start as "Idem")
  await expect(page.getByRole('button', { name: /^Idem: Fizika/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: /^Ne idem: Fizika/ }).click()
  await expect(page.getByText('slobodno vreme')).toBeVisible()
})

test('4. an unregistered midterm is visible on the Today screen', async ({ page }) => {
  await onboard(page, { demo: true })
  await expect(page.getByText(/Neprijavljen: Kolokvijum 1/)).toBeVisible()
})

test('5. registering a midterm removes the warning and gives XP', async ({ page }) => {
  await onboard(page, { demo: true })
  await page.goto('/#/study')
  await page.getByRole('tab', { name: 'Ispit/Kolokvijum' }).click()
  await page
    .getByLabel(/Da li si prijavio/)
    .first()
    .check()
  await page.goto('/#/')
  await expect(page.getByText(/Neprijavljen: Kolokvijum 1/)).toHaveCount(0)
  await expect(page.getByText(/\+20 XP/)).toBeVisible()
})

test('6. trening sa rekordom', async ({ page }) => {
  await onboard(page)
  await page.goto('/#/workout')
  // a workout is scheduled (day and time), then marked done; the second one is heavier
  const log = async (kg: string) => {
    await page.getByRole('button', { name: '+ Dodaj trening' }).click()
    await page.getByRole('button', { name: '+ Dodaj vežbu' }).click()
    await page.getByLabel('Vežba 1').fill('Bench press')
    await page.getByLabel('Kilaža 1').fill(kg)
    await page.getByRole('button', { name: 'Zakaži trening' }).click()
    await page.getByRole('button', { name: 'Urađeno', exact: true }).first().click()
    await page.getByRole('button', { name: 'Sačuvaj trening' }).click()
  }
  await log('60')
  await expect(page.getByText('Trening sačuvan')).toBeVisible()
  await log('70')
  await expect(page.getByText(/Novi rekord: Bench press 70 kg/)).toBeVisible()
})

test('7. an expense over the budget gives a warning', async ({ page }) => {
  await onboard(page)
  await page.goto('/#/zivot')
  await page.getByRole('tab', { name: /Novac/ }).click()
  await page.getByRole('spinbutton', { name: 'Hrana' }).fill('100')
  await page.getByLabel('Iznos (RSD)').fill('150')
  await page.getByRole('button', { name: 'Dodaj trošak' }).click()
  await expect(page.getByRole('alert').filter({ hasText: '150%' })).toBeVisible()
})

test('8. "done" gives XP', async ({ page }) => {
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

test('10. JSON export and import', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await onboard(page, { demo: true })
  await page.goto('/#/settings')
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
  await page.goto('/#/settings')
  // A-14: the backup comes back from a file, the way it does on a phone
  await page.getByLabel('Izaberi fajl').setInputFiles({
    name: 'my-day-ai-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  })
  await page.getByRole('button', { name: 'Da, uvezi' }).click()
  await expect(page.getByText('Podaci su uvezeni')).toBeVisible()
  await page.goto('/#/study')
  await expect(page.getByText('Predmet 1 (primer)').first()).toBeVisible()
})

test('11. tamna tema', async ({ page }) => {
  await onboard(page)
  await page.goto('/#/settings')
  await choose(page, 'Tema', 'dark')
  await expect(page.locator('html')).toHaveClass(/dark/)
  await choose(page, 'Tema', 'light')
  await expect(page.locator('html')).not.toHaveClass(/dark/)
})

test('12. keyboard shortcuts', async ({ page }) => {
  await onboard(page)
  await page.goto('/#/settings')
  await page.locator('body').press('?')
  await expect(page.getByRole('dialog', { name: 'Prečice na tastaturi' })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.locator('body').press('w')
  await expect(page).toHaveURL(/#\/pregled/)
  await page.locator('body').press('/')
  await expect(page.getByLabel('Brzi unos')).toBeFocused()
})

test('13. manual AI mode: a pasted answer becomes a suggestion', async ({ page }) => {
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

test('14. no horizontal scroll at 390 / 800 / 1920 px', async ({ page }) => {
  await onboard(page, { demo: true })
  for (const w of [390, 800, 1920]) {
    await page.setViewportSize({ width: w, height: 900 })
    for (const route of [
      '/',
      '/study',
      '/workout',
      '/zivot',
      '/planer',
      '/pregled',
      '/ai',
      '/settings',
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
  await skipTour(page)
  await expect(page.getByLabel('Brzi unos')).toBeVisible()
})

test('23. tour: walks through the screens, trial things are deleted, the routine and the daily challenge are on the Today screen', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('heading', { name: /Dobrodošao/ }).waitFor()
  await page.keyboard.press('Enter')
  await page.getByLabel('Kako da te zovem?').fill('Tura')
  for (let i = 0; i < 6; i++) await page.keyboard.press('Enter')
  const ask = page.getByRole('dialog', { name: /provedemo kroz aplikaciju/ })
  await ask.getByRole('button', { name: 'Kreni' }).click()
  const tour = page.getByRole('dialog', { name: 'Obilazak aplikacije' })
  await expect(tour.getByText('Korak 1 od 9')).toBeVisible()
  await tour.getByRole('button', { name: 'Dalje' }).click()
  await tour.getByRole('button', { name: 'Dodaj probnu obavezu' }).click()
  await expect(page.getByText('Probna obaveza (briše se na kraju)').first()).toBeVisible()
  await tour.getByRole('button', { name: 'Dalje' }).click()
  await tour.getByRole('button', { name: 'Označi umesto mene' }).click()
  await tour.getByRole('button', { name: 'Dalje' }).click()
  await tour.getByRole('button', { name: 'Dodaj probni predmet' }).click()
  await tour.getByRole('button', { name: 'Dalje' }).click() // workout
  await expect(page).toHaveURL(/workout/)
  await tour.getByRole('button', { name: 'Dalje' }).click()
  await tour.getByRole('button', { name: 'Dalje' }).click()
  await tour.getByRole('button', { name: 'Dalje' }).click()
  await tour.getByRole('button', { name: 'Dalje' }).click()
  await tour.getByRole('button', { name: 'Gotovo' }).click()
  await expect(tour).toHaveCount(0)
  await page.goto('/#/')
  await expect(page.getByText('Probna obaveza (briše se na kraju)')).toHaveCount(0)
  await expect(page.getByTestId('challenge')).toBeVisible()
})

test('18. number field: deleting and then typing has no leading zero', async ({ page }) => {
  await onboard(page)
  await page.goto('/#/settings')
  const field = page.getByLabel('Učenje (h/dan)')
  await field.fill('')
  await expect(field).toHaveValue('')
  await field.pressSequentially('3')
  await expect(field).toHaveValue('3')
})

test('19. editing and repeating an activity', async ({ page }) => {
  await onboard(page)
  await page.getByRole('button', { name: '+ Nova aktivnost' }).click()
  await page.getByLabel('Naziv').fill('Šetnja')
  await choose(page, 'Ponavljanje', 'daily')
  await page.getByRole('dialog').getByRole('button', { name: 'Dodaj' }).click()
  await expect(page.getByText('Šetnja').first()).toBeVisible()
  await page.getByRole('button', { name: 'Još radnji za Šetnja' }).click()
  await page.getByRole('button', { name: 'Izmeni Šetnja' }).click()
  await page.getByLabel('Naziv').fill('Duga šetnja')
  await page.getByRole('button', { name: 'Sačuvaj izmene' }).click()
  await expect(page.getByText('Duga šetnja').first()).toBeVisible()
})

test.describe('accessibility (axe, WCAG A/AA)', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`15. bez povreda na svim ekranima, ${theme} tema`, async ({ page }) => {
      await onboard(page, { demo: true })
      await page.goto('/#/settings')
      await choose(page, 'Tema', theme)
      for (const route of [
        '/',
        '/study',
        '/workout',
        '/zivot',
        '/planer',
        '/pregled',
        '/ai',
        '/settings',
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
  test('20. English in onboarding and settings, the choice is remembered', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('heading', { name: /Dobrodošao/ }).waitFor()
    await choose(page, 'Jezik', 'en')
    await expect(page.getByRole('heading', { name: /Welcome to My Day AI/ })).toBeVisible()
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByLabel('What should I call you?').fill('Alex')
    for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: 'Finish' }).click()
    await page
      .getByRole('dialog', { name: /let us walk you through/ })
      .getByRole('button', { name: 'Skip' })
      .click()
    await expect(page.getByLabel('Quick entry')).toBeVisible()
    await page.getByLabel('Quick entry').fill('coffee 200')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByText(/Expense 200 USD/)).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Quick entry')).toBeVisible()
    await page.goto('/#/settings')
    await expect(page.getByRole('heading', { name: /Settings/ })).toBeVisible()
    await choose(page, 'Language', 'sr-Cyrl')
    await expect(page.getByRole('heading', { name: /Подешавања/ })).toBeVisible()
    await choose(page, 'Језик', 'sr-Latn')
    await expect(page.getByRole('heading', { name: /Podešavanja/ })).toBeVisible()
  })

  test('21. all languages without horizontal scroll and without axe violations', async ({
    page,
  }) => {
    test.setTimeout(150_000) // 6 languages x 8 screens, each with an axe scan
    await onboard(page, { demo: true })
    for (const lang of ['en', 'sr-Cyrl', 'de', 'ru', 'fr', 'es']) {
      await page.goto('/#/settings')
      await choose(page, /Jezik|Language|Језик|Sprache|Язык|Langue|Idioma/, lang)
      for (const route of [
        '/',
        '/study',
        '/workout',
        '/zivot',
        '/planer',
        '/pregled',
        '/ai',
        '/settings',
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

test('22. A-13 smart "Back": panel → first tab → top → Today → exit question', async ({ page }) => {
  await onboard(page)
  await page.getByRole('link', { name: 'Život' }).click()
  await page.getByRole('tab', { name: /Navike/ }).click()

  // 4. a sub-tab goes back to the first tab, the section stays
  await page.goBack()
  await expect(page.getByRole('tab', { name: /San/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page).toHaveURL(/#\/zivot/)

  // 6. another section goes to Today
  await page.goBack()
  await expect(page).toHaveURL(/#\/$/)

  // 1. an open panel closes, the screen stays
  await page.getByRole('button', { name: '+ Nova aktivnost' }).click()
  await page.getByLabel('Početak').click()
  await expect(page.getByRole('listbox', { name: 'Sati' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('listbox', { name: 'Sati' })).toBeHidden()
  await expect(page.getByRole('dialog', { name: /aktivnost/i })).toBeVisible()

  // 2. a form with something typed asks before it is thrown away
  await page.getByLabel('Naziv').fill('Proba')
  await page.goBack()
  await expect(page.getByRole('alertdialog', { name: 'Odbaci izmene?' })).toBeVisible()
  await page.getByRole('button', { name: 'Odbaci' }).click()
  await expect(page.getByLabel('Naziv')).toBeHidden()

  // 7. Today at the top: "Leave the app?"
  await page.goBack()
  await expect(page.getByRole('alertdialog', { name: 'Napusti aplikaciju?' })).toBeVisible()
  await page.getByRole('button', { name: 'Ostani' }).click()
  await expect(page.getByRole('alertdialog')).toBeHidden()
  await expect(page).toHaveURL(/#\/$/)
})

test('24. legacy Serbian addresses redirect to the English routes', async ({ page }) => {
  await onboard(page)
  for (const [old, now] of [
    ['faks', 'study'],
    ['trening', 'workout'],
    ['podesavanja', 'settings'],
  ]) {
    await page.goto(`/#/${old}`)
    await expect(page).toHaveURL(new RegExp(`#/${now}$`))
  }
})

test('25. 0.4.3: the bottom bar swipes sideways to the last section, Settings stays pinned', async ({
  page,
}) => {
  await onboard(page, { demo: true })
  const nav = page.getByRole('navigation', { name: /donja|bottom/i })
  const strip = nav.locator('[data-nav-strip]')
  const settings = nav.getByRole('link', { name: 'Podešavanja' })
  const last = nav.getByRole('link', { name: 'AI', exact: true })
  const first = nav.getByRole('link', { name: 'Danas' })
  await expect(first).toBeInViewport()
  // 4 items fit at once: the 5th is not in the strip's visible part
  const widths = await strip.evaluate((el) => ({
    strip: el.clientWidth,
    item: el.children[0].getBoundingClientRect().width,
  }))
  expect(Math.abs(widths.item * 4 - widths.strip)).toBeLessThanOrEqual(2)
  expect(await strip.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
  const before = await settings.boundingBox()
  // swipe the strip (a real scroll, as a finger would do it)
  await strip.evaluate((el) => el.scrollTo({ left: el.scrollWidth }))
  await expect(last).toBeInViewport()
  const after = await settings.boundingBox()
  expect(after).toEqual(before)
  await expect(settings).toBeInViewport()
  // Settings is not a child of the strip
  expect(await strip.getByRole('link', { name: 'Podešavanja' }).count()).toBe(0)
  await last.click()
  await expect(page).toHaveURL(/#\/ai$/)
  await expect(last).toHaveAttribute('aria-current', 'page')
  await settings.click()
  await expect(page).toHaveURL(/#\/settings$/)
})
