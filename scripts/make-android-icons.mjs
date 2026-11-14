// Re-renders the foreground layer of the Android adaptive icon from public/icon.svg with a bigger symbol.
// The symbol is ~69% of the layer width (was ~54%). Android shows the middle 66.7% of the layer
// (inset 16.7%), so the symbol is ~46 dp wide of 108 dp and stays inside the 66 dp safe circle.
// Run: node scripts/make-android-icons.mjs
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'

const svg = readFileSync('public/icon.svg', 'utf8')
const BG = '#020617'
const SYMBOL = 0.69 // symbol width / layer width
const RES = 'android/app/src/main/res'
const sizes = { ldpi: 36, mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }

const browser = await chromium.launch()
async function render(size, path) {
  // the drawn symbol spans 398 of the 512 svg units
  const w = (SYMBOL * size * 512) / 398
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(
    `<body style="margin:0;background:${BG};width:${size}px;height:${size}px;overflow:hidden;display:grid;place-items:center">${svg
      .replace(/<rect[^>]*\/>/, '')
      .replace('<svg ', `<svg width="${w}" height="${w}" `)}</body>`,
  )
  await page.screenshot({ path })
  await page.close()
}
for (const [d, s] of Object.entries(sizes))
  await render(s, `${RES}/mipmap-${d}/ic_launcher_foreground.png`)
await render(512, 'assets/icon-foreground.png')
await browser.close()
