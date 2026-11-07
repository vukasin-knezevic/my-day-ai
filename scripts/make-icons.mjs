// Renders public/icon.svg to PNG icons for the PWA manifest.  Run: node scripts/make-icons.mjs
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'

const svg = readFileSync('public/icon.svg', 'utf8')
const browser = await chromium.launch()
for (const [size, file] of [
  [192, 'icon-192.png'],
  [512, 'icon-512.png'],
  [180, 'apple-touch-icon.png'],
]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(
    `<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`,
  )
  await page.screenshot({ path: `public/${file}` })
  await page.close()
}
await browser.close()
console.log('icons done')
