// Serbian Latin -> Serbian Cyrillic. The mapping is 1:1, so the Cyrillic locale can be derived
// from the Latin one (and any key can still be overridden by hand in sr-Cyrl.ts).

const MAP: Record<string, string> = {
  a: 'а',
  b: 'б',
  c: 'ц',
  č: 'ч',
  ć: 'ћ',
  d: 'д',
  đ: 'ђ',
  e: 'е',
  f: 'ф',
  g: 'г',
  h: 'х',
  i: 'и',
  j: 'ј',
  k: 'к',
  l: 'л',
  m: 'м',
  n: 'н',
  o: 'о',
  p: 'п',
  r: 'р',
  s: 'с',
  š: 'ш',
  t: 'т',
  u: 'у',
  v: 'в',
  z: 'з',
  ž: 'ж',
}
const DIGRAPHS: Record<string, string> = { nj: 'њ', lj: 'љ', dž: 'џ' }

/** Parts that stay in Latin script: placeholders, markup, brand and technical names, exercise names. */
const KEEP = new RegExp(
  [
    String.raw`\{\w+\}`,
    String.raw`\*\*`,
    String.raw`https?://\S+`,
    String.raw`\.ics`,
    String.raw`sk-ant-…`,
    String.raw`\b(?:XP|AI|API|JSON|ICS|PR|Claude|Anthropic|Enter|Esc|Ctrl|Cmd|HH:mm|My Day AI)\b`,
    // words with letters that do not exist in Serbian (q, w, x, y) are foreign: keep them as they are
    String.raw`\b\w*[qwxyQWXY]\w*\b`,
    String.raw`\b(?:Bench press|Overhead press|Face pull|Leg press|Plank|Push|Pull|Full body)\b`,
  ].join('|'),
  'g',
)

function convert(rawChunk: string): string {
  // a lone "h" is the unit for hours ("2 h") -> "ч" in Serbian Cyrillic (not the letter х)
  const chunk = rawChunk.replace(/(?<![\p{L}])h(?![\p{L}])/gu, '\uE000')
  let out = ''
  for (let i = 0; i < chunk.length; i++) {
    const ch = chunk[i]
    if (ch === '\uE000') {
      out += 'ч'
      continue
    }
    const two = chunk.slice(i, i + 2)
    const lower2 = two.toLowerCase()
    if (DIGRAPHS[lower2]) {
      const c = DIGRAPHS[lower2]
      out += two[0] === two[0].toLowerCase() ? c : c.toUpperCase()
      i++
      continue
    }
    const lower = ch.toLowerCase()
    const cyr = MAP[lower]
    if (cyr) out += ch === lower ? cyr : cyr.toUpperCase()
    else out += ch
  }
  return out
}

export function latinToCyrillic(text: string): string {
  let out = ''
  let last = 0
  for (const m of text.matchAll(KEEP)) {
    out += convert(text.slice(last, m.index)) + m[0]
    last = (m.index ?? 0) + m[0].length
  }
  return out + convert(text.slice(last))
}
