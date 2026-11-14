// Draws the Android adaptive icon under circle / rounded / squircle / square masks (docs/android-icon-preview.png)
// to check that nothing is cut off. 108 dp = 432 px (4 px per dp); the mask shows the middle 72 dp.
// Run: node scripts/preview-android-icon.mjs [old-foreground.png]   (the optional file is drawn as "before")
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'

const R = 'android/app/src/main/res/mipmap-xxxhdpi/'
const b64 = (p) => 'data:image/png;base64,' + readFileSync(p).toString('base64')
const bg = b64(R + 'ic_launcher_background.png')
const masks = [
  ['circle', '50%'],
  ['rounded', '22%'],
  ['squircle', '38% / 38%'],
  ['square', '8%'],
]
const row = (fg, label) =>
  `<div style="color:#fff;font:14px sans-serif;margin:8px">${label}<br>${masks
    .map(
      ([
        n,
        r,
      ]) => `<div style="display:inline-block;margin:6px;text-align:center"><div style="position:relative;width:288px;height:288px;overflow:hidden;border-radius:${r}">
<img src="${bg}" style="position:absolute;left:-72px;top:-72px;width:432px;height:432px">
<img src="${fg}" style="position:absolute;left:0;top:0;width:288px;height:288px">
<div style="position:absolute;left:12px;top:12px;width:264px;height:264px;border:1px dashed #f0f;border-radius:50%"></div></div>${n}</div>`,
    )
    .join('')}</div>`
const old = process.argv[2]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1320, height: old ? 760 : 380 } })
await page.setContent(
  `<body style="margin:0;background:#334">${old ? row(b64(old), 'BEFORE') : ''}${row(b64(R + 'ic_launcher_foreground.png'), 'AFTER (dashed = 66 dp safe circle)')}</body>`,
)
await page.screenshot({ path: 'docs/android-icon-preview.png' })
await browser.close()
