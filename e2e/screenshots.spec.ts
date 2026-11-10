import { test } from '@playwright/test'
import { choose } from './helpers'

// Generates docs/screenshots/*.png. Run with:  SCREENSHOTS=1 npx playwright test screenshots
// Serbian (Latin) screenshots have no suffix, the others end in -en / -sr-cyrl.
test.skip(!process.env.SCREENSHOTS, 'only when SCREENSHOTS=1')

const SIZES = { telefon: { width: 390, height: 844 }, laptop: { width: 1440, height: 900 } }
const SCREENS: [string, string][] = [
  ['danas', '/'],
  ['faks', '/faks'],
  ['planer', '/planer'],
  ['trening', '/trening'],
  ['pregled', '/pregled'],
]
// Every language gets its own fresh start (the browser language decides the app language),
// so the demo data and the entries are in that language too.
const LANGS: {
  locale: string
  suffix: string
  themes: ('light' | 'dark')[]
  devices: ('telefon' | 'laptop')[]
}[] = [
  { locale: 'sr-RS', suffix: '', themes: ['light', 'dark'], devices: ['telefon', 'laptop'] },
  { locale: 'en-US', suffix: '-en', themes: ['light', 'dark'], devices: ['telefon', 'laptop'] },
  // mostly a layout check for the longer Cyrillic texts
  { locale: 'sr-Cyrl-RS', suffix: '-sr-cyrl', themes: ['light'], devices: ['telefon'] },
]

for (const lang of LANGS) {
  test(`screenshots ${lang.locale}`, async ({ browser }) => {
    test.setTimeout(180_000)
    const ctx = await browser.newContext({ locale: lang.locale, viewport: SIZES.telefon })
    const page = await ctx.newPage()
    await page.goto('/')
    const next = page.getByRole('button', { name: /^(Dalje|Next|Даље)$/ })
    await next.waitFor()
    await next.click() // language step
    await page.getByRole('textbox').first().fill('Alex')
    for (let i = 0; i < 4; i++) await next.click()
    await next.click() // demo data stays checked
    await page.getByRole('button', { name: /^(Završi|Finish|Заврши)$/ }).click()
    // the guided tour is offered after the setup: skip it for the pictures
    await page.getByRole('button', { name: /^(Preskoči|Skip|Прескочи)$/ }).click()
    await page.locator('#quick-input').waitFor()
    for (const entry of ['gym 18-19:30', 'study 10-12']) {
      await page.locator('#quick-input').fill(entry)
      await page.locator('form[role=search] button[type=submit]').click()
    }
    await page.goto('/#/planer')
    await page
      .getByRole('button', { name: /^(Predloži plan|Suggest a plan|Предложи план)$/ })
      .click()
    for (const theme of lang.themes) {
      await page.setViewportSize(SIZES.telefon)
      await page.goto('/#/podesavanja')
      await choose(page, /^(Tema|Theme|Тема)/, theme)
      for (const device of lang.devices) {
        await page.setViewportSize(SIZES[device])
        for (const [name, route] of SCREENS) {
          await page.goto(`/#${route}`)
          await page.waitForTimeout(400)
          await page.screenshot({
            path: `docs/screenshots/${name}-${device}-${theme}${lang.suffix}.png`,
            fullPage: device === 'telefon',
          })
        }
      }
    }
    await ctx.close()
  })
}
