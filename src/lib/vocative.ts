// Serbian vocative of a first name ("Kako si, Vukašine?"), worked out by rules plus small exception
// lists. The user only ever types the name as they normally write it. If a name is unknown or the
// rule is ambiguous, the name is returned unchanged: never garbage. Latin and Cyrillic. Pure.
import { cyrillicToLatin, latinToCyrillic } from '../i18n/translit'

/** Names whose "a" disappears in the vocative (Petar -> Petre). Other "-ar" names (Lazar) just add -e. */
const FLEETING_A = new Set(['petar', 'aleksandar', 'dimitar', 'stojadinar', 'cvetar'])

/** Masculine names ending in -a: they do not change (Nikola, Luka, Ilija). */
const MASCULINE_A = new Set([
  'nikola',
  'luka',
  'ilija',
  'andrija',
  'kosta',
  'sima',
  'pera',
  'mika',
  'žika',
  'zika',
  'aca',
  'boba',
  'mića',
  'mica',
  'vlada',
  'bora',
  'era',
  'đura',
  'djura',
  'joca',
  'jova',
  'miša',
  'misa',
  'nemanja',
  'relja',
  'dača',
  'daca',
  'vuča',
  'vuca',
  'raša',
  'rasa',
  'duda',
  'bata',
  'mata',
])

/** Names that are used for both sexes or that we cannot tell: unchanged. */
const AMBIGUOUS = new Set(['saša', 'sasa', 'vanja', 'jasmin'])

/** Feminine names ending in a consonant: they do not change (Karmen, Ines). */
const FEMININE_CONSONANT = new Set(['karmen', 'ines', 'nives', 'mirjam', 'ester', 'suzan', 'rut'])

const LETTERS = /^[a-zA-ZčćšžđČĆŠŽĐ]+$/

const isUpper = (s: string) => s.length > 1 && s === s.toUpperCase() && s !== s.toLowerCase()

/** Vocative of one name written in Latin. Keeps the user's spelling and capitalisation. */
function vocativeLatin(word: string): string {
  const low = word.toLowerCase()
  if (low.length < 2 || !LETTERS.test(word)) return word
  const upper = isUpper(word)
  // `cut` removes letters from the end, `add` appends a suffix in the case of the name
  const make = (cut: number, add: string) =>
    word.slice(0, word.length - cut) + (upper ? add.toUpperCase() : add)

  if (AMBIGUOUS.has(low) || FEMININE_CONSONANT.has(low)) return word
  // Milica -> Milice, Slavica -> Slavice
  if (low.endsWith('ica')) return make(1, 'e')
  if (low.endsWith('a')) {
    // Marko-type masculine names in -a stay; feminine names change: Ana -> Ano, Marija -> Marijo
    return MASCULINE_A.has(low) ? word : make(1, 'o')
  }
  // names ending in e, o, i, u (Đorđe, Marko, Dragi, Branku) stay
  if (/[eiou]$/.test(low)) return word
  // Petar -> Petre
  if (FLEETING_A.has(low)) return make(2, 're')
  // consonant softening before -e: Predrag -> Predraže, Vuk -> Vuče, Zlatomir (no change of the stem)
  if (low.endsWith('g')) return make(1, 'že')
  if (low.endsWith('k')) return make(1, 'če')
  if (low.endsWith('h')) return make(1, 'še')
  // Andrej, Matej, and rare endings (c, ć, đ): not sure, so unchanged
  if (/[jcćđ]$/.test(low)) return word
  // Vukašin -> Vukašine, Stefan -> Stefane, Miloš -> Miloše, Nenad -> Nenade
  return make(0, 'e')
}

const hasCyrillic = (s: string) => /[Ѐ-ӿ]/.test(s)

/** Vocative of a first name. Only the first word is used ("Vukašin Knežević" -> "Vukašine"). */
export function vocative(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? ''
  if (!first) return ''
  const cyr = hasCyrillic(first)
  const latin = cyr ? cyrillicToLatin(first) : first
  // double names: Ana-Marija -> Ano-Marijo, Marko-Petar -> Marko-Petre
  const out = latin.split('-').map(vocativeLatin).join('-')
  return cyr ? latinToCyrillic(out) : out
}
