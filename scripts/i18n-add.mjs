// Adds or replaces messages in all hand-written locale files at once (sr-Cyrl is derived from sr-Latn).
// Usage: node scripts/i18n-add.mjs batch.json
// batch.json: { "some.key": { "sr": "...", "f": "(optional feminine sr)", "en": "...", "de": "...", "es": "...", "fr": "...", "ru": "..." } }
// A key with the value null is removed from every file.
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const batch = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const dir = new URL('../src/i18n/locales/', import.meta.url)
const FILES = { sr: 'sr-Latn', en: 'en', de: 'de', es: 'es', fr: 'fr', ru: 'ru' }

/** Removes the entry `'key': ...,` (which may span several lines) from the lines of one object. */
function drop(lines, from, to, key) {
  const start = lines.findIndex((l, i) => i > from && i < to && l.startsWith(`  '${key}':`))
  if (start === -1) return 0
  let end = start + 1
  while (end < to && !/^ {2}'|^ {2}\/\/|^\}/.test(lines[end])) end++
  lines.splice(start, end - start)
  return end - start
}

function put(lines, openRe, entries) {
  const from = lines.findIndex((l) => openRe.test(l))
  if (from === -1) throw new Error(`no ${openRe}`)
  let to = lines.findIndex((l, i) => i > from && /^\}/.test(l))
  for (const [key, text] of entries) {
    to -= drop(lines, from, to, key)
    if (text === null) continue
    lines.splice(to, 0, `  '${key}': ${JSON.stringify(text)},`)
    to++
  }
}

const changed = []
for (const [lang, name] of Object.entries(FILES)) {
  const url = new URL(`${name}.ts`, dir)
  const lines = readFileSync(url, 'utf8').split(/\r?\n/)
  const entries = Object.entries(batch).map(([k, v]) => [k, v === null ? null : v[lang]])
  for (const [k, v] of entries) if (v === undefined) throw new Error(`${k}: missing ${lang}`)
  put(lines, /^const messages\b/, entries)
  if (lang === 'sr') {
    const fem = Object.entries(batch)
      .filter(([, v]) => v === null || v.f !== undefined)
      .map(([k, v]) => [k, v === null ? null : v.f])
    if (fem.length) put(lines, /^const feminine\b/, fem)
  }
  writeFileSync(url, lines.join('\n'))
  changed.push(`src/i18n/locales/${name}.ts`)
}
execFileSync(process.execPath, ['node_modules/prettier/bin/prettier.cjs', '--write', ...changed], {
  stdio: 'inherit',
})
console.log(`${Object.keys(batch).length} keys`)
