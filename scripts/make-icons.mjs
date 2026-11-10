// Renders public/icon.svg to the PNG icons of the PWA and the iPhone start screens.
// Run: node scripts/make-icons.mjs
import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'

const svg = readFileSync('public/icon.svg', 'utf8')
const BG = '#020617' // the dark colour of the app background

// iPhone start screens (portrait): [css width, css height, pixel ratio]. index.html lists the same sizes.
export const SPLASH = [
  [440, 956, 3], // 16 Pro Max
  [402, 874, 3], // 16 Pro
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

// The maskable icon: Android may cut it to a circle or a squircle, so the logo stays inside the middle
// 70% (the "safe zone") on a full dark square.
{
  const size = 512
  const logo = Math.round(size * 0.7)
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(
    `<body style="margin:0;background:${BG};display:grid;place-items:center;height:100vh">${svg.replace(
      '<svg ',
      `<svg width="${logo}" height="${logo}" `,
    )}</body>`,
  )
  await page.screenshot({ path: 'public/icon-maskable-512.png' })
  await page.close()
}

// The picture shown when the link is shared (1200 x 630)
{
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
  await page.setContent(
    `<body style="margin:0;background:${BG};color:#fff;font-family:system-ui,sans-serif;display:flex;align-items:center;gap:56px;height:100vh;padding:0 110px;box-sizing:border-box">${svg.replace(
      '<svg ',
      '<svg width="300" height="300" ',
    )}<div><div style="font-size:84px;font-weight:800">My Day AI</div><div style="font-size:36px;color:#93c5fd;margin-top:16px;line-height:1.3">Study, training and your whole day<br/>in one place</div></div></body>`,
  )
  await page.screenshot({ path: 'public/og-image.png' })
  await page.close()
}

// The small icon of a notification (Android status bar): only the shape matters, Android paints
// every opaque pixel white. So: the logo in white on a transparent background, with thicker lines.
{
  const size = 96
  const badge = svg
    .replace(/<rect[^>]*\/>/, '')
    .replaceAll('#3b82f6', '#ffffff')
    .replace('stroke-width="26"', 'stroke-width="40"')
    .replace(' opacity=".55"', '')
    .replace('viewBox="0 0 512 512"', 'viewBox="40 90 432 332"')
    .replace('<svg ', `<svg width="${size}" height="${size}" `)
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<body style="margin:0;background:transparent">${badge}</body>`)
  await page.screenshot({ path: 'public/badge-96.png', omitBackground: true })
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
