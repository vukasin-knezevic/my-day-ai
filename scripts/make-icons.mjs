// Renders public/icon.svg to the PNG icons of the PWA and the iPhone start screens.
// Run: node scripts/make-icons.mjs
import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'

const svg = readFileSync('public/icon.svg', 'utf8')
const BG = '#020617' // the dark colour of the app background

// iPhone start screens (portrait): [css width, css height, pixel ratio]. index.html lists the same sizes.
export const SPLASH = [
  [430, 932, 3], // 15 Pro Max / 15 Plus / 14 Pro Max
  [393, 852, 3], // 15 / 15 Pro / 14 Pro
  [428, 926, 3], // 14 Plus / 13 Pro Max / 12 Pro Max
  [390, 844, 3], // 14 / 13 / 13 Pro / 12 / 12 Pro
  [375, 812, 3], // 13 mini / 12 mini / 11 Pro / XS / X
  [414, 896, 3], // 11 Pro Max / XS Max
  [414, 896, 2], // 11 / XR
  [414, 736, 3], // 8 Plus / 7 Plus / 6s Plus
  [375, 667, 2], // 8 / 7 / 6s / SE (2nd and 3rd gen)
]

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

// blue logo on the dark blue background, in the middle
mkdirSync('public/splash', { recursive: true })
for (const [w, h, ratio] of SPLASH) {
  const px = [w * ratio, h * ratio]
  const logo = Math.round(Math.min(px[0], px[1]) * 0.42)
  const page = await browser.newPage({ viewport: { width: px[0], height: px[1] } })
  await page.setContent(
    `<body style="margin:0;background:${BG};display:grid;place-items:center;height:100vh">${svg.replace(
      '<svg ',
      `<svg width="${logo}" height="${logo}" `,
    )}</body>`,
  )
  await page.screenshot({ path: `public/splash/splash-${px[0]}x${px[1]}.png` })
  await page.close()
}
await browser.close()
console.log('icons done')
